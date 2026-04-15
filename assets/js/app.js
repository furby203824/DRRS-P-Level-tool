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

  const state = {
    roster: null,
    structure: null,
    critical: null
  };

  // ---- DOM helpers ------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function setSlotStatus(kind, status, ok) {
    const slot = document.querySelector(`.slot[data-slot="${kind}"]`);
    const statusEl = document.querySelector(`[data-status="${kind}"]`);
    if (!slot || !statusEl) return;
    slot.classList.remove("loaded", "error");
    if (ok === true) slot.classList.add("loaded");
    else if (ok === false) slot.classList.add("error");
    statusEl.textContent = status;
  }

  function showErrors(messages) {
    const box = $("#errors");
    if (!messages || messages.length === 0) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML =
      "<h4>Validation errors</h4><ul>" +
      messages.map((m) => `<li>${escapeHtml(m)}</li>`).join("") +
      "</ul>";
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
      const errors = parser.validate(kind, rows);
      if (errors.length) {
        setSlotStatus(kind, errors[0], false);
        showErrors(errors);
        state[kind] = null;
      } else {
        const normalized = normalize(kind, rows);
        state[kind] = normalized;
        setSlotStatus(kind, `${file.name} -- ${normalized.length} rows`, true);
        showErrors([]);
      }
    } catch (err) {
      setSlotStatus(kind, `Error: ${err.message}`, false);
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
    const errors = [];
    for (const kind of Object.keys(SAMPLE_PATHS)) {
      try {
        setSlotStatus(kind, "Loading sample...");
        const rows = await parser.fetchSampleCSV(SAMPLE_PATHS[kind]);
        const validation = parser.validate(kind, rows);
        if (validation.length) {
          errors.push(...validation);
          setSlotStatus(kind, validation[0], false);
          state[kind] = null;
          continue;
        }
        const normalized = normalize(kind, rows);
        state[kind] = normalized;
        setSlotStatus(kind, `Sample loaded -- ${normalized.length} rows`, true);
      } catch (err) {
        errors.push(`${parser.SCHEMA[kind].label}: ${err.message}`);
        setSlotStatus(kind, "Failed to load sample", false);
        state[kind] = null;
      }
    }
    showErrors(errors);
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

    $("#results-section").hidden = false;
    $("#results-section").scrollIntoView({ behavior: "smooth", block: "start" });
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
    $$('input[type="file"]').forEach((el) => (el.value = ""));
    ["roster", "structure", "critical"].forEach((k) => setSlotStatus(k, "No file"));
    showErrors([]);
    $("#results-section").hidden = true;
    refreshCalculateButton();
  }

  // ---- Wire it up ------------------------------------------------------
  function init() {
    $$('input[type="file"][data-target]').forEach((el) => {
      el.addEventListener("change", (e) => {
        const kind = el.getAttribute("data-target");
        handleFile(kind, e.target.files[0]);
      });
    });
    $("#load-sample").addEventListener("click", loadSample);
    $("#reset").addEventListener("click", reset);
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
