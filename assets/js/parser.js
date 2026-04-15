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

  function validate(kind, rows) {
    const errors = [];
    if (!Array.isArray(rows) || rows.length === 0) {
      errors.push(`${SCHEMA[kind].label}: file is empty.`);
      return errors;
    }
    const cols = Object.keys(rows[0]);
    const missing = SCHEMA[kind].required.filter((c) => !cols.includes(c));
    if (missing.length) {
      errors.push(
        `${SCHEMA[kind].label}: missing required column(s): ${missing.join(", ")}.`
      );
    }

    // Light type checks for the structure file's Authorized column.
    if (kind === "structure" && !missing.includes("Authorized")) {
      const bad = rows.findIndex((r) => isNaN(parseInt(r.Authorized, 10)));
      if (bad >= 0) {
        errors.push(
          `T/O Structure: row ${bad + 2} has non-numeric "Authorized" value.`
        );
      }
    }
    return errors;
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
