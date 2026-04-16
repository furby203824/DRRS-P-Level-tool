/* app.js -- UI wiring for the DRRS P-Level Calculator */

(function () {
  "use strict";

  const { parser, calculator } = window.PLevel;

  // Bundled sample CSV paths (filenames in repo root with spaces, URL-encoded).
  const SAMPLE_PATHS = {
    roster: "alpha%20roster%20example.csv",
    structure: "to%20structure%20example.csv",
    critical: "critical%20mos%20example.csv"
  };

  // DRRS Remarks block character limit. Conservative default; S-3 should
  // verify against the DRRS-MC field definition for the deployed version.
  // Seen references to both 2000 and 4000; starting at 2000 and flagging
  // when over so the S-1 sees it before pasting.
  const DRRS_REMARKS_LIMIT = 2000;

  // LocalStorage key for the persisted Unit Profile. Versioned so a
  // future schema change can migrate or discard old data cleanly.
  const PROFILE_STORAGE_KEY = "drrs-plevel.unitProfile.v1";

  // Placeholder text the S-1 overwrites in the brief textarea before copy.
  const ACTIONS_PLACEHOLDER =
    "[S-1 to fill: manning requests submitted, recruiting pipeline engagement, " +
    "MOS school quotas requested, critical billet swaps proposed.]";
  const RESULTS_PLACEHOLDER =
    "[S-1 to fill: expected P-Level recovery date, dependencies, risk to mission.]";

  const state = {
    roster: null,
    structure: null,
    critical: null,
    lastResult: null,
    validation: { roster: null, structure: null, critical: null } // {errors, warnings}
  };

  // ---- DOM helpers ------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function readUnitProfile() {
    return {
      uic: ($("#unit-uic").value || "").trim().toUpperCase(),
      name: ($("#unit-name").value || "").trim(),
      asOf: ($("#unit-asof").value || "").trim() // YYYY-MM-DD or ""
    };
  }

  function todayISODate() {
    const d = new Date();
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Parse a YYYY-MM-DD string to a Date in local time. Returns null if empty.
  function parseAsOfDate(s) {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }

  function sanitizeForFilename(s) {
    return (s || "").replace(/[^A-Za-z0-9_-]+/g, "").slice(0, 16) || "NOUIC";
  }

  // ---- Unit Profile persistence ---------------------------------------
  function currentProfileObject() {
    return {
      uic: ($("#unit-uic") && $("#unit-uic").value) || "",
      name: ($("#unit-name") && $("#unit-name").value) || "",
      asOf: ($("#unit-asof") && $("#unit-asof").value) || "",
      policy: {
        countLimitedAsNonDeployable:
          $("#policy-limited") ? $("#policy-limited").checked : true
      }
    };
  }

  function applyProfileObject(p) {
    if (!p || typeof p !== "object") return;
    if (typeof p.uic === "string" && $("#unit-uic")) $("#unit-uic").value = p.uic;
    if (typeof p.name === "string" && $("#unit-name")) $("#unit-name").value = p.name;
    if (typeof p.asOf === "string" && $("#unit-asof")) $("#unit-asof").value = p.asOf;
    if (p.policy && typeof p.policy.countLimitedAsNonDeployable === "boolean" && $("#policy-limited")) {
      $("#policy-limited").checked = p.policy.countLimitedAsNonDeployable;
    }
  }

  function saveProfileToStorage() {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(currentProfileObject()));
    } catch (_) { /* quota or privacy mode: silently skip */ }
  }

  function loadProfileFromStorage() {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) return false;
      const p = JSON.parse(raw);
      applyProfileObject(p);
      return true;
    } catch (_) { return false; }
  }

  function exportProfileToFile() {
    const profile = currentProfileObject();
    profile.exportedAt = new Date().toISOString();
    profile.schema = "drrs-plevel-unit-profile.v1";
    const content = JSON.stringify(profile, null, 2);
    const uicPart = sanitizeForFilename(profile.uic);
    triggerDownload(`unit-profile-${uicPart}.json`, "application/json", content);
    setProfileStatus("Profile exported");
  }

  function importProfileFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        applyProfileObject(data);
        saveProfileToStorage();
        setProfileStatus(`Profile loaded from ${file.name}`);
      } catch (err) {
        setProfileStatus("Import failed: " + err.message);
      }
    };
    reader.onerror = () => setProfileStatus("Could not read " + file.name);
    reader.readAsText(file);
  }

  function wipeLocalData() {
    const ok = window.confirm(
      "Wipe locally stored unit profile and any other cached data for this tool?\n\n" +
      "This clears the browser-side copy only (data never left your machine). " +
      "CSV files you've loaded this session will also be cleared."
    );
    if (!ok) return;
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch (_) { /* */ }
    // Reset the unit profile fields and in-memory state.
    if ($("#unit-uic")) $("#unit-uic").value = "";
    if ($("#unit-name")) $("#unit-name").value = "";
    if ($("#unit-asof")) $("#unit-asof").value = todayISODate();
    if ($("#policy-limited")) $("#policy-limited").checked = true;
    reset();
    setProfileStatus("Local data wiped");
  }

  function setProfileStatus(msg) {
    const el = document.getElementById("profile-status");
    if (!el) return;
    el.textContent = msg;
    if (msg) {
      clearTimeout(setProfileStatus._t);
      setProfileStatus._t = setTimeout(() => { el.textContent = ""; }, 2500);
    }
  }

  function setSlotStatus(kind, status, ok) {
    const slot = document.querySelector(`.slot[data-slot="${kind}"]`);
    const statusEl = document.querySelector(`[data-status="${kind}"]`);
    if (!slot || !statusEl) return;
    slot.classList.remove("loaded", "error");
    if (ok === true) slot.classList.add("loaded");
    else if (ok === false) slot.classList.add("error");
    statusEl.textContent = status;
  }

  // Legacy wrapper -- a few call sites still pass a flat array of errors.
  function showErrors(messages) {
    renderValidationPanel(messages || [], []);
  }

  // Collect all errors and warnings from the three per-file validations
  // and render them in the validation panel.
  function renderFromState() {
    const errs = [];
    const warns = [];
    for (const k of ["roster", "structure", "critical"]) {
      const v = state.validation[k];
      if (!v) continue;
      if (v.errors) errs.push(...v.errors);
      if (v.warnings) warns.push(...v.warnings);
    }
    renderValidationPanel(errs, warns);
  }

  function renderValidationPanel(errors, warnings) {
    const box = $("#errors");
    if (!errors.length && !warnings.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    const parts = [];
    if (errors.length) {
      parts.push(
        '<div class="v-block v-errors">' +
        `<h4>Validation errors (${errors.length})</h4>` +
        '<ul>' + errors.map((m) => `<li>${escapeHtml(m)}</li>`).join("") + '</ul>' +
        '</div>'
      );
    }
    if (warnings.length) {
      parts.push(
        '<div class="v-block v-warnings">' +
        `<h4>Warnings (${warnings.length})</h4>` +
        '<p class="muted small">Advisory only &mdash; the calculation still runs. Review for data quality.</p>' +
        '<ul>' + warnings.map((m) => `<li>${escapeHtml(m)}</li>`).join("") + '</ul>' +
        '</div>'
      );
    }
    box.innerHTML = parts.join("");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function refreshCalculateButton() {
    $("#calculate").disabled = !(state.roster && state.structure && state.critical);
  }

  // ---- File handling ----------------------------------------------------
  async function handleFile(kind, file) {
    if (!file) return;
    setSlotStatus(kind, `Parsing ${file.name}...`);
    try {
      const rows = await parser.parseCSV(file);
      const validation = parser.validate(kind, rows);
      state.validation[kind] = {
        errors: validation.errors || [],
        warnings: validation.warnings || []
      };
      if (validation.errors && validation.errors.length) {
        setSlotStatus(kind, validation.errors[0], false);
        state[kind] = null;
      } else {
        const normalized = normalize(kind, rows);
        state[kind] = normalized;
        const warnCount = validation.warnings ? validation.warnings.length : 0;
        const suffix = warnCount ? ` -- ${warnCount} warning${warnCount === 1 ? "" : "s"}` : "";
        setSlotStatus(kind, `${file.name} -- ${normalized.length} rows${suffix}`, true);
      }
      renderFromState();
    } catch (err) {
      state.validation[kind] = { errors: [`${parser.SCHEMA[kind].label}: ${err.message}`], warnings: [] };
      setSlotStatus(kind, `Error: ${err.message}`, false);
      renderFromState();
    }
    refreshCalculateButton();
  }

  function normalize(kind, rows) {
    if (kind === "roster") return parser.normalizeRoster(rows);
    if (kind === "structure") return parser.normalizeStructure(rows);
    if (kind === "critical") return parser.normalizeCritical(rows);
    return rows;
  }

  // ---- Sample data loader ----------------------------------------------
  async function loadSample() {
    // Populate the Unit Profile with the sample unit identity so the
    // brief/JSON/CSV exports don't read as [UIC NOT SET] on a demo run.
    const uicEl = $("#unit-uic");
    const nameEl = $("#unit-name");
    if (uicEl && !uicEl.value) uicEl.value = "M00378";
    if (nameEl && !nameEl.value) nameEl.value = "CLB-3 H&S Co (sample)";

    for (const kind of Object.keys(SAMPLE_PATHS)) {
      try {
        setSlotStatus(kind, "Loading sample...");
        const rows = await parser.fetchSampleCSV(SAMPLE_PATHS[kind]);
        const validation = parser.validate(kind, rows);
        state.validation[kind] = {
          errors: validation.errors || [],
          warnings: validation.warnings || []
        };
        if (validation.errors && validation.errors.length) {
          setSlotStatus(kind, validation.errors[0], false);
          state[kind] = null;
          continue;
        }
        const normalized = normalize(kind, rows);
        state[kind] = normalized;
        const warnCount = validation.warnings ? validation.warnings.length : 0;
        const suffix = warnCount ? ` -- ${warnCount} warning${warnCount === 1 ? "" : "s"}` : "";
        setSlotStatus(kind, `Sample loaded -- ${normalized.length} rows${suffix}`, true);
      } catch (err) {
        state.validation[kind] = {
          errors: [`${parser.SCHEMA[kind].label}: ${err.message}`],
          warnings: []
        };
        setSlotStatus(kind, "Failed to load sample", false);
        state[kind] = null;
      }
    }
    renderFromState();
    refreshCalculateButton();
  }

  // ---- Render results --------------------------------------------------
  function renderResults(result) {
    const card = $("#plevel-card");
    card.classList.remove("p1", "p2", "p3", "p4");
    card.classList.add("p" + result.band.finalBand);

    $("#plevel-value").textContent = result.pLevel;
    $("#plevel-driver").textContent = result.band.driver;

    const p = result.personnel;
    $("#ps-pct").textContent = p.pct.toFixed(1);
    $("#ps-detail").textContent =
      `${p.effective} effective / ${p.authorized} authorized`;

    const c = result.critical;
    $("#cm-pct").textContent = c.pct.toFixed(1);
    $("#cm-detail").textContent =
      `${c.filled} filled / ${c.authorized} authorized critical billets`;

    renderShowWork(result);

    // Personnel strength breakdown table
    const psBody = $("#ps-breakdown-table tbody");
    psBody.innerHTML = "";
    const limitedNote = p.countLimitedAsNonDeployable
      ? "Subtracted -- limited duty"
      : "Not subtracted -- unit policy counts limited duty as effective";
    const effectiveFormula = p.countLimitedAsNonDeployable
      ? "(Assigned+Attached) - Non-Deployable - Limited"
      : "(Assigned+Attached) - Non-Deployable";
    const psRows = [
      ["Assigned", p.assigned, "DRRSStatus = ASSIGNED"],
      ["Attached", p.attached, "DRRSStatus = ATTACHED"],
      ["Non-Deployable (DLC = N)", p.nonDeployable, "Subtracted from numerator"],
      ["Limited (DLC = L)", p.limited, limitedNote],
      ["Detached (separate)", p.detached, "Excluded -- DRRSStatus = DETACHED"],
      ["IA Tasking (separate)", p.ia, "Excluded -- DRRSStatus = IA"],
      ["JIA Tasking (separate)", p.jia, "Excluded -- DRRSStatus = JIA"],
      ["Effective Numerator", p.effective, effectiveFormula],
      ["Authorized (T/O)", p.authorized, "Sum of T/O Authorized billets"]
    ];
    for (const [label, value, note] of psRows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(label)}</td><td class="num">${value}</td><td class="muted">${escapeHtml(note)}</td>`;
      psBody.appendChild(tr);
    }

    // Critical MOS rollup
    const cmBody = $("#cm-breakdown-table tbody");
    cmBody.innerHTML = "";
    if (c.breakdown.length === 0) {
      cmBody.innerHTML = `<tr><td colspan="7" class="muted">No critical billets authorized for this unit.</td></tr>`;
    } else {
      for (const row of c.breakdown) {
        const fillPct = row.Authorized > 0 ? (row.Filled / row.Authorized) * 100 : 0;
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${escapeHtml(row.MOS)}</td>
          <td>${escapeHtml(row.Description)}</td>
          <td>${escapeHtml(row.PayGrade)}</td>
          <td class="num">${row.Authorized}</td>
          <td class="num">${row.Filled}</td>
          <td class="num">${fillPct.toFixed(0)}%</td>
          <td>${renderFillMix(row)}</td>`;
        cmBody.appendChild(tr);
      }
    }

    renderAudit(c.audit);

    state.lastResult = result;
    setExportStatus("");
    renderPrintHeader();
    renderBriefPreview(result);

    $("#results-section").hidden = false;
    $("#results-section").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderPrintHeader() {
    const unit = readUnitProfile();
    const asOf = parseAsOfDate(unit.asOf) || new Date();
    const unitLabel = unit.uic
      ? unit.name ? `${unit.uic} — ${unit.name}` : unit.uic
      : "[UIC NOT SET]";
    $("#print-unit").textContent = unitLabel;
    $("#print-asof").textContent = formatDateDDMMMYY(asOf);
    $("#print-now").textContent = formatDateDDMMMYY(new Date()) + " " +
      new Date().toTimeString().slice(0, 5);
  }

  // ---- Export ----------------------------------------------------------
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function formatDateDDMMMYY(d) {
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const yy = String(d.getFullYear() % 100).padStart(2, "0");
    return pad2(d.getDate()) + months[d.getMonth()] + yy;
  }

  // Suggest a DRRS reason code based on which band is binding. Returns
  // null at P-1 (no reason code needed). The S-1 can override in the
  // editable brief before copying.
  function suggestReasonCode(result) {
    const finalBand = result.band.finalBand;
    if (finalBand === 1) return null;
    if (result.band.cBand > result.band.pBand) return "S-MOS-QUAL";
    if (result.band.pBand > result.band.cBand) return "S-MANPOWER";
    // Aligned at same sub-P-1 band: default to personnel.
    return "S-MANPOWER";
  }

  function buildReadinessBrief(result, unit, asOfDate, computedAt, opts) {
    opts = opts || {};
    const p = result.personnel;
    const c = result.critical;
    const s = c.fillSummary || { exactBMOS: 0, flexBMOS: 0, exactPMOS: 0, flexPMOS: 0, unfilled: 0 };
    const asOfStr = formatDateDDMMMYY(asOfDate);
    const unitLine = unit.name
      ? `UNIT: ${unit.uic || "[UIC NOT SET]"} - ${unit.name.toUpperCase()}`
      : `UNIT: ${unit.uic || "[UIC NOT SET]"}`;

    const pBand = result.band.pBand;
    const cBand = result.band.cBand;
    const driverShort =
      pBand > cBand ? "personnel strength"
      : cBand > pBand ? "critical MOS fill"
      : "personnel and critical MOS aligned";
    const bluf =
      `BLUF: ${result.pLevel} at ${p.pct.toFixed(1)}% personnel strength ` +
      `(${p.effective}/${p.authorized}); critical MOS fill ` +
      `${c.pct.toFixed(1)}% (${c.filled}/${c.authorized} billets). ` +
      `Binding: ${driverShort}.`;

    const reasonCode = suggestReasonCode(result);
    const reasonLine = reasonCode
      ? `REASON CODE (SUGGESTED): ${reasonCode}`
      : `REASON CODE: N/A (P-1)`;

    const policyLine = result.options.countLimitedAsNonDeployable
      ? "POLICY: Limited Duty (DLC=L) counted as non-deployable."
      : "POLICY: Limited Duty (DLC=L) counted as effective.";

    const actions = opts.actions || ACTIONS_PLACEHOLDER;
    const results = opts.results || RESULTS_PLACEHOLDER;

    return [
      "DRRS PERSONNEL READINESS",
      unitLine,
      `AS OF: ${asOfStr}`,
      "",
      bluf,
      reasonLine,
      "",
      "METRICS",
      `  PERSONNEL STRENGTH: ${p.pct.toFixed(1)}% [P-${pBand}] (${p.effective} EFFECTIVE / ${p.authorized} AUTHORIZED)`,
      `    ASG ${p.assigned} / ATT ${p.attached} / NON-DEP ${p.nonDeployable} / LTD ${p.limited} / DET ${p.detached} / IA ${p.ia} / JIA ${p.jia}`,
      `  CRITICAL MOS: ${c.pct.toFixed(1)}% [P-${cBand}] (${c.filled} / ${c.authorized} BILLETS)`,
      `    BMOS EXACT ${s.exactBMOS} / BMOS +/-1 ${s.flexBMOS} / PMOS EXACT ${s.exactPMOS} / PMOS +/-1 ${s.flexPMOS} / GAPS ${s.unfilled}`,
      "",
      `ACTIONS: ${actions}`,
      "",
      `RESULTS: ${results}`,
      "",
      policyLine,
      `EXCLUDED: ${result.excludedContractors} contractor row(s).`,
      "REF: MCO 3000.13B para 7c.",
      `COMPUTED: ${computedAt.toISOString()} by DRRS P-Level Calculator (POC).`
    ].join("\n");
  }

  // Replace characters DRRS Remarks fields commonly reject: smart quotes,
  // em/en dashes, non-ASCII whitespace, ellipsis, arrows, zero-width
  // joiners, and any remaining non-ASCII. Preserves newlines. Idempotent.
  function sanitizeForDRRS(text) {
    return String(text)
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")          // curly single quotes
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')          // curly double quotes
      .replace(/[\u2013\u2014\u2212]/g, "-")                 // en-dash, em-dash, minus
      .replace(/\u2026/g, "...")                              // ellipsis
      .replace(/[\u2192\u2794\u27A1]/g, "->")                // rightward arrows
      .replace(/[\u00A0\u2007\u202F\u2009\u200A]/g, " ")    // nbsp & thin spaces
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")           // zero-width chars
      .replace(/[^\x20-\x7E\n]/g, "?");                       // anything else non-printable ASCII
  }

  function buildAuditCSV(result) {
    const audit = (result.critical && result.critical.audit) || [];
    const header = [
      "MOS","Description","AuthorizedPayGrade","Status",
      "FillerEDIPI","FillerName","FillerPayGrade",
      "FillerBMOS","FillerPMOS","FillSource","MatchType"
    ];
    const esc = (v) => {
      const s = v == null ? "" : String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const lines = [header.join(",")];
    for (const row of audit) {
      lines.push([
        row.MOS, row.Description, row.AuthorizedPayGrade,
        row.Filled ? "FILLED" : "UNFILLED",
        row.FillerEDIPI, row.FillerName, row.FillerPayGrade,
        row.FillerBMOS, row.FillerPMOS,
        row.FillSource || "", row.MatchType || ""
      ].map(esc).join(","));
    }
    return lines.join("\n");
  }

  function triggerDownload(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function setExportStatus(msg) {
    const el = document.getElementById("export-status");
    if (!el) return;
    el.textContent = msg;
    if (msg) {
      clearTimeout(setExportStatus._t);
      setExportStatus._t = setTimeout(() => { el.textContent = ""; }, 2500);
    }
  }

  async function copyBriefToClipboard() {
    if (!state.lastResult) return;
    const textarea = $("#brief-textarea");
    let text = textarea ? textarea.value : "";
    if (!text) {
      // Fallback: regenerate on the fly if the textarea is empty.
      const unit = readUnitProfile();
      const asOf = parseAsOfDate(unit.asOf) || new Date();
      text = buildReadinessBrief(state.lastResult, unit, asOf, new Date());
    }
    const drrsReady = $("#drrs-ready") ? $("#drrs-ready").checked : true;
    if (drrsReady) text = sanitizeForDRRS(text);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      const over = text.length > DRRS_REMARKS_LIMIT;
      setExportStatus(
        over
          ? `Copied (${text.length} chars, OVER ${DRRS_REMARKS_LIMIT} limit)`
          : `Copied ${text.length} / ${DRRS_REMARKS_LIMIT} chars`
      );
    } catch (err) {
      setExportStatus("Copy failed: " + err.message);
    }
  }

  // Populate the brief textarea from the latest result. Called when the
  // user clicks Calculate. Does not run on every unit-profile edit so the
  // user can tweak the brief without losing edits.
  function renderBriefPreview(result) {
    const ta = $("#brief-textarea");
    if (!ta) return;
    const unit = readUnitProfile();
    const asOf = parseAsOfDate(unit.asOf) || new Date();
    ta.value = buildReadinessBrief(result, unit, asOf, new Date());
    updateBriefCount();
  }

  function updateBriefCount() {
    const ta = $("#brief-textarea");
    const out = $("#brief-count");
    const limit = $("#brief-limit");
    if (!ta || !out) return;
    const raw = ta.value;
    const effective = ($("#drrs-ready") && $("#drrs-ready").checked)
      ? sanitizeForDRRS(raw)
      : raw;
    out.textContent = effective.length.toLocaleString();
    if (limit) limit.textContent = DRRS_REMARKS_LIMIT.toLocaleString();
    const container = $("#brief-count-container");
    if (container) {
      container.classList.toggle("over-limit", effective.length > DRRS_REMARKS_LIMIT);
    }
  }

  function downloadJSON() {
    if (!state.lastResult) return;
    const unit = readUnitProfile();
    const asOf = parseAsOfDate(unit.asOf) || new Date();
    const payload = JSON.stringify({
      generatedAt: new Date().toISOString(),
      asOfDate: unit.asOf || todayISODate(),
      unit: { uic: unit.uic, name: unit.name },
      reference: "MCO 3000.13B para 7c",
      result: state.lastResult
    }, null, 2);
    const uicPart = sanitizeForFilename(unit.uic);
    const stamp = formatDateDDMMMYY(asOf).toLowerCase();
    triggerDownload(`plevel-${uicPart}-${stamp}.json`, "application/json", payload);
    setExportStatus("JSON downloaded");
  }

  function downloadAuditCSV() {
    if (!state.lastResult) return;
    const unit = readUnitProfile();
    const asOf = parseAsOfDate(unit.asOf) || new Date();
    const csv = buildAuditCSV(state.lastResult);
    const uicPart = sanitizeForFilename(unit.uic);
    const stamp = formatDateDDMMMYY(asOf).toLowerCase();
    triggerDownload(`plevel-audit-${uicPart}-${stamp}.csv`, "text/csv", csv);
    setExportStatus("Audit CSV downloaded");
  }

  // ---- Show-the-work (formulas with live numbers) ----------------------
  function renderShowWork(result) {
    const p = result.personnel;
    const c = result.critical;

    // Personnel Strength formula. Detached/IA/JIA are excluded upstream (by
    // DRRSStatus) so they do not appear in the subtraction -- we note their
    // counts on a separate line for audit completeness.
    const limitedTerm = p.countLimitedAsNonDeployable
      ? ` + ${p.limited}`
      : "";
    const limitedLabel = p.countLimitedAsNonDeployable
      ? ` + Limited(${p.limited})`
      : "";
    const psNumerator =
      `Numerator = (Assigned(${p.assigned}) + Attached(${p.attached})) ` +
      `\u2212 (NonDep(${p.nonDeployable})${limitedLabel}) = ` +
      `${p.assignedAttached} \u2212 ${p.nonDeployable + (p.limitedSubtracted || 0)} = ${p.effective}`;
    const psExcluded =
      `Separately excluded by DRRSStatus: Detached(${p.detached}) + IA(${p.ia}) + JIA(${p.jia})`;
    const psPct =
      `Percentage = ${p.effective} / ${p.authorized} = ` +
      `${p.pct.toFixed(1)}% \u2192 P-${result.band.pBand}`;

    $("#formula-ps-num").textContent = psNumerator;
    // Re-purpose the second code slot to show excluded + percentage stacked.
    $("#formula-ps-pct").innerHTML =
      `${escapeHtml(psExcluded)}<br>${escapeHtml(psPct)}`;

    const cmNumerator =
      `Numerator = Critical billets filled = ${c.filled}`;
    const cmPct = c.authorized > 0
      ? `Percentage = ${c.filled} / ${c.authorized} = ${c.pct.toFixed(1)}% \u2192 P-${result.band.cBand}`
      : `No critical billets authorized -- not applicable`;
    $("#formula-cm-num").textContent = cmNumerator;
    $("#formula-cm-pct").textContent = cmPct;

    // Fill mix summary inside the critical MOS formula.
    const s = c.fillSummary || { exactBMOS: 0, flexBMOS: 0, exactPMOS: 0, flexPMOS: 0, unfilled: 0 };
    $("#cm-fill-summary").innerHTML = c.authorized === 0 ? "" : `
      <span class="tag tag-exact-bmos">B&middot;EX &times;${s.exactBMOS}</span>
      <span class="tag tag-flex-bmos">B&middot;&plusmn;1 &times;${s.flexBMOS}</span>
      <span class="tag tag-exact-pmos">P&middot;EX &times;${s.exactPMOS}</span>
      <span class="tag tag-flex-pmos">P&middot;&plusmn;1 &times;${s.flexPMOS}</span>
      <span class="tag tag-unfilled">GAP &times;${s.unfilled}</span>`;

    const finalBand = result.band.finalBand;
    $("#formula-final-line").textContent =
      `Lower of P-${result.band.pBand} (Personnel) and P-${result.band.cBand} (Critical) = P-${finalBand}`;
    $("#formula-final-note").textContent =
      `Binding: ${result.band.driver}. ` +
      (result.excludedContractors
        ? `Excluded ${result.excludedContractors} contractor row(s) before calculation.`
        : `No contractors filtered.`);
  }

  function renderFillMix(row) {
    const parts = [];
    if (row.ExactBMOS) parts.push(`<span class="tag tag-exact-bmos">B&middot;EX &times;${row.ExactBMOS}</span>`);
    if (row.FlexBMOS) parts.push(`<span class="tag tag-flex-bmos">B&middot;&plusmn;1 &times;${row.FlexBMOS}</span>`);
    if (row.ExactPMOS) parts.push(`<span class="tag tag-exact-pmos">P&middot;EX &times;${row.ExactPMOS}</span>`);
    if (row.FlexPMOS) parts.push(`<span class="tag tag-flex-pmos">P&middot;&plusmn;1 &times;${row.FlexPMOS}</span>`);
    const gap = row.Authorized - row.Filled;
    if (gap) parts.push(`<span class="tag tag-unfilled">GAP &times;${gap}</span>`);
    return parts.join(" ");
  }

  function renderAudit(audit) {
    const body = $("#cm-audit-table tbody");
    body.innerHTML = "";
    if (!audit || audit.length === 0) {
      body.innerHTML = `<tr><td colspan="7" class="muted">No critical billets to audit.</td></tr>`;
      return;
    }
    for (const row of audit) {
      const tr = document.createElement("tr");
      if (!row.Filled) tr.classList.add("row-unfilled");
      const status = row.Filled
        ? `<span class="tag tag-filled">FILLED</span>`
        : `<span class="tag tag-unfilled">UNFILLED</span>`;
      const match = row.Filled
        ? matchBadge(row.FillSource, row.MatchType)
        : "&mdash;";
      const filler = row.Filled
        ? `${escapeHtml(row.FillerEDIPI)} &middot; ${escapeHtml(row.FillerName)}`
        : `<span class="muted">&mdash;</span>`;
      const fillerMos = row.Filled
        ? `${escapeHtml(row.FillerBMOS)} / ${escapeHtml(row.FillerPMOS)}`
        : `<span class="muted">&mdash;</span>`;
      const fillerGrade = row.Filled
        ? escapeHtml(row.FillerPayGrade)
        : `<span class="muted">&mdash;</span>`;
      tr.innerHTML = `
        <td>${escapeHtml(row.MOS)}</td>
        <td>${escapeHtml(row.AuthorizedPayGrade)}</td>
        <td>${status}</td>
        <td>${filler}</td>
        <td>${fillerGrade}</td>
        <td>${fillerMos}</td>
        <td>${match}</td>`;
      body.appendChild(tr);
    }
  }

  function matchBadge(source, matchType) {
    const key = source === "BMOS"
      ? (matchType === "exact" ? "tag-exact-bmos" : "tag-flex-bmos")
      : (matchType === "exact" ? "tag-exact-pmos" : "tag-flex-pmos");
    const label = (source === "BMOS" ? "B" : "P") + "\u00b7" +
      (matchType === "exact" ? "EX" : "\u00b11");
    return `<span class="tag ${key}">${label}</span>`;
  }

  // ---- Reset -----------------------------------------------------------
  function reset() {
    state.roster = state.structure = state.critical = null;
    state.lastResult = null;
    state.validation = { roster: null, structure: null, critical: null };
    $$('input[type="file"]').forEach((el) => (el.value = ""));
    ["roster", "structure", "critical"].forEach((k) => setSlotStatus(k, "Drop CSV or click to browse"));
    renderFromState();
    $("#results-section").hidden = true;
    setExportStatus("");
    refreshCalculateButton();
  }

  // ---- Drag-and-drop wiring -------------------------------------------
  function attachDropHandlers() {
    $$(".slot").forEach((slot) => {
      const kind = slot.getAttribute("data-slot");
      if (!kind) return;
      slot.addEventListener("dragenter", (e) => {
        e.preventDefault();
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", (e) => {
        // Only drop the style when leaving the slot entirely, not a child.
        if (e.relatedTarget && slot.contains(e.relatedTarget)) return;
        slot.classList.remove("drag-over");
      });
      slot.addEventListener("drop", (e) => {
        e.preventDefault();
        slot.classList.remove("drag-over");
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file) return;
        if (!/\.csv$/i.test(file.name)) {
          setSlotStatus(kind, `Not a .csv file: ${file.name}`, false);
          return;
        }
        // Sync the hidden input so the form reflects the chosen file.
        const input = slot.querySelector('input[type="file"]');
        if (input) {
          try {
            const dt = new DataTransfer();
            dt.items.add(file);
            input.files = dt.files;
          } catch (_) { /* older browsers: input.files is read-only, skip */ }
        }
        handleFile(kind, file);
      });
    });

    // Prevent the browser from navigating away if a file is dropped outside
    // a slot.
    window.addEventListener("dragover", (e) => e.preventDefault());
    window.addEventListener("drop", (e) => e.preventDefault());
  }

  // ---- Wire it up ------------------------------------------------------
  function init() {
    // Default the as-of date to today, then overlay any stored profile.
    const asofInput = $("#unit-asof");
    if (asofInput && !asofInput.value) asofInput.value = todayISODate();
    loadProfileFromStorage();

    // Auto-save unit profile fields on change.
    ["unit-uic", "unit-name", "unit-asof"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", saveProfileToStorage);
    });
    const policyEl = document.getElementById("policy-limited");
    if (policyEl) policyEl.addEventListener("change", saveProfileToStorage);

    // Profile export / import / wipe controls.
    const exportBtn = document.getElementById("profile-export");
    const importBtn = document.getElementById("profile-import");
    const importInput = document.getElementById("profile-import-input");
    const wipeBtn = document.getElementById("wipe-local-data");
    if (exportBtn) exportBtn.addEventListener("click", exportProfileToFile);
    if (importBtn && importInput) {
      importBtn.addEventListener("click", () => importInput.click());
      importInput.addEventListener("change", (e) => {
        importProfileFromFile(e.target.files[0]);
        importInput.value = ""; // allow re-selecting same file
      });
    }
    if (wipeBtn) wipeBtn.addEventListener("click", wipeLocalData);

    $$('input[type="file"][data-target]').forEach((el) => {
      el.addEventListener("change", (e) => {
        const kind = el.getAttribute("data-target");
        handleFile(kind, e.target.files[0]);
      });
    });
    attachDropHandlers();
    $("#load-sample").addEventListener("click", loadSample);
    $("#reset").addEventListener("click", reset);
    const expandBtn = document.getElementById("meth-expand");
    const collapseBtn = document.getElementById("meth-collapse");
    if (expandBtn) {
      expandBtn.addEventListener("click", () => {
        $$(".methodology .meth-block").forEach((d) => (d.open = true));
      });
    }
    if (collapseBtn) {
      collapseBtn.addEventListener("click", () => {
        $$(".methodology .meth-block").forEach((d) => (d.open = false));
      });
    }

    $("#calculate").addEventListener("click", () => {
      try {
        const options = {
          countLimitedAsNonDeployable: $("#policy-limited").checked
        };
        const result = calculator.calculate(
          state.roster, state.structure, state.critical, options
        );
        renderResults(result);
      } catch (err) {
        showErrors([`Calculation error: ${err.message}`]);
      }
    });

    const copyBtn = document.getElementById("copy-brief");
    const jsonBtn = document.getElementById("download-json");
    const csvBtn = document.getElementById("download-audit-csv");
    if (copyBtn) copyBtn.addEventListener("click", copyBriefToClipboard);
    if (jsonBtn) jsonBtn.addEventListener("click", downloadJSON);
    if (csvBtn) csvBtn.addEventListener("click", downloadAuditCSV);

    const briefTa = document.getElementById("brief-textarea");
    const drrsReady = document.getElementById("drrs-ready");
    const regenBtn = document.getElementById("brief-regen");
    if (briefTa) briefTa.addEventListener("input", updateBriefCount);
    if (drrsReady) drrsReady.addEventListener("change", updateBriefCount);
    if (regenBtn) regenBtn.addEventListener("click", () => {
      if (state.lastResult) renderBriefPreview(state.lastResult);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
