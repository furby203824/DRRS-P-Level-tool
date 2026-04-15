/* parser.js -- CSV parsing and schema validation for DRRS P-Level Calculator */

window.PLevel = window.PLevel || {};

(function (ns) {
  "use strict";

  // Required columns per the SCHEMA.pdf data contract.
  const SCHEMA = {
    roster: {
      label: "Alpha Roster",
      required: [
        "EDIPI", "LastName", "FirstName", "Rank", "PayGrade", "Service",
        "Component", "Unit", "BMOS", "PMOS", "Category", "DutyStatus",
        "DRRSStatus", "DeployableFlag"
      ]
    },
    structure: {
      label: "T/O Structure",
      required: ["Unit", "BMOS", "PayGrade", "Authorized"]
    },
    critical: {
      label: "Critical MOS List",
      required: ["MOS", "Description", "Category"]
    }
  };

  function parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: false,
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          if (results.errors && results.errors.length) {
            const fatal = results.errors.find((e) => e.type !== "FieldMismatch");
            if (fatal) return reject(new Error(fatal.message));
          }
          resolve(results.data);
        },
        error: (err) => reject(err)
      });
    });
  }

  // Fetches one of the bundled sample CSVs from the repo and parses it.
  function fetchSampleCSV(path) {
    return fetch(path).then((r) => {
      if (!r.ok) throw new Error("Could not load " + path);
      return r.text();
    }).then((text) => {
      const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (h) => h.trim()
      });
      return result.data;
    });
  }

  // Allowed enum values per the schema doc. Anything outside these is a
  // warning, not a hard error -- real rosters have messy data and we want
  // to surface anomalies without blocking a calculation.
  const VALID_DRRS_STATUS = new Set(["ASSIGNED","ATTACHED","DETACHED","IA","JIA"]);
  const VALID_DLC = new Set(["Y","N","L","D","B"]); // see SCHEMA.pdf DLC codes
  const GRADE_PATTERN = /^(E[1-9]|W[1-5]|O([1-9]|10))$/;

  // Validate a file. Returns { errors, warnings } where errors block the
  // calculation and warnings are advisory.
  function validate(kind, rows) {
    const errors = [];
    const warnings = [];
    const label = SCHEMA[kind].label;

    if (!Array.isArray(rows) || rows.length === 0) {
      errors.push(`${label}: file is empty.`);
      return wrapLegacy({ errors, warnings });
    }
    const cols = Object.keys(rows[0]);
    const missing = SCHEMA[kind].required.filter((c) => !cols.includes(c));
    if (missing.length) {
      errors.push(
        `${label}: missing required column(s): ${missing.join(", ")}.`
      );
      // Can't do per-row checks if the schema is busted.
      return wrapLegacy({ errors, warnings });
    }

    // Per-row checks. Row numbers in messages are 1-based including header.
    if (kind === "roster") {
      rows.forEach((r, i) => {
        const n = i + 2; // +1 for header, +1 for 0-based
        if (!r.EDIPI) errors.push(`${label}: row ${n} missing EDIPI.`);
        else if (!/^\d{10}$/.test(r.EDIPI)) {
          warnings.push(`${label}: row ${n} EDIPI "${r.EDIPI}" is not 10 digits.`);
        }
        if (!r.PayGrade) errors.push(`${label}: row ${n} missing PayGrade.`);
        else if (!GRADE_PATTERN.test(r.PayGrade.toUpperCase())) {
          warnings.push(`${label}: row ${n} PayGrade "${r.PayGrade}" is not a recognized E/W/O grade.`);
        }
        const status = (r.DRRSStatus || "").toUpperCase();
        if (!status) errors.push(`${label}: row ${n} missing DRRSStatus.`);
        else if (!VALID_DRRS_STATUS.has(status)) {
          warnings.push(`${label}: row ${n} DRRSStatus "${r.DRRSStatus}" not in {ASSIGNED, ATTACHED, DETACHED, IA, JIA}.`);
        }
        const dlc = (r.DeployableFlag || "").toUpperCase();
        if (dlc && !VALID_DLC.has(dlc)) {
          warnings.push(`${label}: row ${n} DeployableFlag "${r.DeployableFlag}" not in {Y, N, L, D, B}.`);
        }
        if (!r.BMOS) warnings.push(`${label}: row ${n} missing BMOS (may prevent critical-billet matching).`);
      });
    } else if (kind === "structure") {
      rows.forEach((r, i) => {
        const n = i + 2;
        if (!r.BMOS) errors.push(`${label}: row ${n} missing BMOS.`);
        if (!r.PayGrade) errors.push(`${label}: row ${n} missing PayGrade.`);
        else if (!GRADE_PATTERN.test((r.PayGrade || "").toUpperCase())) {
          warnings.push(`${label}: row ${n} PayGrade "${r.PayGrade}" is not a recognized E/W/O grade.`);
        }
        const authRaw = r.Authorized;
        if (authRaw === undefined || authRaw === null || authRaw === "") {
          errors.push(`${label}: row ${n} missing Authorized count.`);
        } else {
          const auth = parseInt(authRaw, 10);
          if (isNaN(auth)) {
            errors.push(`${label}: row ${n} has non-numeric Authorized value "${authRaw}".`);
          } else if (auth < 0) {
            errors.push(`${label}: row ${n} has negative Authorized value ${auth}.`);
          }
        }
      });
    } else if (kind === "critical") {
      const seen = new Set();
      rows.forEach((r, i) => {
        const n = i + 2;
        if (!r.MOS) errors.push(`${label}: row ${n} missing MOS.`);
        else if (seen.has(r.MOS)) {
          warnings.push(`${label}: row ${n} duplicates MOS "${r.MOS}".`);
        } else {
          seen.add(r.MOS);
        }
      });
    }

    return wrapLegacy({ errors, warnings });
  }

  // The original validate() returned a bare array of error strings. Keep
  // that shape for back-compat (app.js checks .length) while exposing the
  // structured form via properties on the array itself.
  function wrapLegacy({ errors, warnings }) {
    const arr = errors.slice();
    arr.errors = errors;
    arr.warnings = warnings;
    return arr;
  }

  // Normalize roster rows: trim whitespace, uppercase status fields, coerce flags.
  function normalizeRoster(rows) {
    return rows.map((r) => {
      const o = {};
      for (const k in r) {
        const v = r[k];
        o[k] = (typeof v === "string") ? v.trim() : v;
      }
      o.DRRSStatus = (o.DRRSStatus || "").toUpperCase();
      o.DeployableFlag = (o.DeployableFlag || "").toUpperCase();
      o.Component = (o.Component || "").toUpperCase();
      o.Service = (o.Service || "").toUpperCase();
      return o;
    });
  }

  function normalizeStructure(rows) {
    return rows.map((r) => ({
      Unit: (r.Unit || "").trim(),
      UnitName: (r.UnitName || "").trim(),
      BMOS: (r.BMOS || "").trim(),
      PayGrade: (r.PayGrade || "").trim().toUpperCase(),
      Authorized: parseInt(r.Authorized, 10) || 0,
      BilletDescription: (r.BilletDescription || "").trim()
    }));
  }

  function normalizeCritical(rows) {
    return rows.map((r) => ({
      MOS: (r.MOS || "").trim(),
      Description: (r.Description || "").trim(),
      Category: (r.Category || "").trim(),
      UnitType: (r.UnitType || "").trim()
    })).filter((r) => r.MOS);
  }

  ns.parser = {
    SCHEMA,
    parseCSV,
    fetchSampleCSV,
    validate,
    normalizeRoster,
    normalizeStructure,
    normalizeCritical
  };
})(window.PLevel);
