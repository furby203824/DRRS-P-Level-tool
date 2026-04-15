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

    // Personnel strength breakdown table
    const psBody = $("#ps-breakdown-table tbody");
    psBody.innerHTML = "";
    const psRows = [
      ["Assigned + Attached", p.assignedAttached, "Marines on this unit's rolls counted positive"],
      ["Non-Deployable (DLF = N)", p.nonDeployable, "Subtracted from numerator"],
      ["Limited (DLF = L)", p.limited, "Subtracted -- limited duty"],
      ["Detached (separate)", p.detached, "Excluded -- DRRSStatus = DETACHED"],
      ["IA Tasking (separate)", p.ia, "Excluded -- DRRSStatus = IA"],
      ["JIA Tasking (separate)", p.jia, "Excluded -- DRRSStatus = JIA"],
      ["Effective Numerator", p.effective, "(Assigned+Attached) - Non-Deployable - Limited"],
      ["Authorized (T/O)", p.authorized, "Sum of T/O Authorized billets"]
    ];
    for (const [label, value, note] of psRows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(label)}</td><td class="num">${value}</td><td class="muted">${escapeHtml(note)}</td>`;
      psBody.appendChild(tr);
    }

    // Critical MOS breakdown
    const cmBody = $("#cm-breakdown-table tbody");
    cmBody.innerHTML = "";
    if (c.breakdown.length === 0) {
      cmBody.innerHTML = `<tr><td colspan="6" class="muted">No critical billets authorized for this unit.</td></tr>`;
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
          <td class="num">${fillPct.toFixed(0)}%</td>`;
        cmBody.appendChild(tr);
      }
    }

    $("#results-section").hidden = false;
    $("#results-section").scrollIntoView({ behavior: "smooth", block: "start" });
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
        const result = calculator.calculate(state.roster, state.structure, state.critical);
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
