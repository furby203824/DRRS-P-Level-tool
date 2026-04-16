/* mapper.js -- Status mapping engine for morning report CSVs
 *
 * Maps DutyStatus/Category to DRRS classification (DRRSStatus +
 * DeployableFlag) per the default rules in the project spec (Section 4).
 * The S-1 confirms or overrides before the data feeds to the calculator.
 */

window.PLevel = window.PLevel || {};

(function (ns) {
  "use strict";

  // -----------------------------------------------------------------------
  // Default mapping rules per the project spec
  // -----------------------------------------------------------------------

  var DEFAULT_RULES = [
    // Assigned and Deployable
    { dutyStatus: "Present for Duty",    drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "",  dlcReason: "",                                             needsReview: false },
    { dutyStatus: "Field Duty",          drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "",  dlcReason: "",                                             needsReview: false },
    { dutyStatus: "Telework",            drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "",  dlcReason: "",                                             needsReview: false },
    { dutyStatus: "Special Liberty",     drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "",  dlcReason: "",                                             needsReview: false },

    // Assigned and Deployable (still on the books)
    { dutyStatus: "Leave Annual",        drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "",  dlcReason: "",                                             needsReview: false },
    { dutyStatus: "Leave Parental",      drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "",  dlcReason: "",                                             needsReview: false },
    { dutyStatus: "Convalescent",        drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "",  dlcReason: "",                                             needsReview: false },

    // Assigned but Non-Deployable
    { dutyStatus: "Leave Terminal",      drrsStatus: "ASSIGNED", deployable: "N", dlcCode: "B", dlcReason: "Terminal leave \u2014 separation track",       needsReview: false },
    { dutyStatus: "Medical Hospital",    drrsStatus: "ASSIGNED", deployable: "N", dlcCode: "D", dlcReason: "Patient hospitalized",                         needsReview: false },
    { dutyStatus: "Awaiting Med Board",  drrsStatus: "ASSIGNED", deployable: "N", dlcCode: "Q", dlcReason: "Pending medical board",                        needsReview: false },
    { dutyStatus: "Pregnancy",           drrsStatus: "ASSIGNED", deployable: "N", dlcCode: "N", dlcReason: "Pregnancy",                                    needsReview: false },

    // Assigned and Deployable (short-term)
    { dutyStatus: "Medical SIQ",         drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "G", dlcReason: "LOD SIQ / light duty \u2014 short-term",       needsReview: false },

    // TAD
    { dutyStatus: "TAD 30 days or less", drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "",  dlcReason: "Temporary location per MCO 3000.13B para 7c",  needsReview: false },
    { dutyStatus: "TAD 31+ days",        drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "",  dlcReason: "Flag: Detached vs Temporary Location",          needsReview: true },
    { dutyStatus: "TAD Permissive",      drrsStatus: "ASSIGNED", deployable: "Y", dlcCode: "",  dlcReason: "Flag: review TAD type",                         needsReview: true },

    // IA Tasking
    { dutyStatus: "IA Tasking",          drrsStatus: "IA",       deployable: "Y", dlcCode: "",  dlcReason: "",                                             needsReview: false },
  ];

  // Lookup map (case-insensitive).
  var ruleMap = {};
  DEFAULT_RULES.forEach(function (r) {
    ruleMap[r.dutyStatus.toUpperCase()] = r;
  });

  // -----------------------------------------------------------------------
  // Engine
  // -----------------------------------------------------------------------

  /** Check if a roster CSV needs status mapping (lacks DRRSStatus). */
  function needsMapping(columns) {
    return !columns.some(function (c) {
      return c.trim().toUpperCase() === "DRRSSTATUS";
    });
  }

  /** Classify a single row based on DutyStatus. */
  function classifyRow(row) {
    var ds = (row.DutyStatus || "").trim();
    var rule = ruleMap[ds.toUpperCase()];
    if (rule) {
      return {
        DRRSStatus: rule.drrsStatus,
        DeployableFlag: rule.deployable,
        DLCCode: rule.dlcCode,
        DLCReason: rule.dlcReason,
        autoMapped: true
      };
    }
    return {
      DRRSStatus: "ASSIGNED",
      DeployableFlag: "Y",
      DLCCode: "",
      DLCReason: "Unmapped status: " + ds,
      autoMapped: true
    };
  }

  /** If EDD/EAS is within 90 days of asOfDate, flag Non-Deployable. */
  function applyEDDRule(c, eddStr, asOfDate) {
    if (!eddStr) return c;
    var edd = new Date(eddStr);
    if (isNaN(edd.getTime())) return c;
    var days = (edd.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24);
    if (days >= 0 && days <= 90 && c.DeployableFlag === "Y") {
      return {
        DRRSStatus: c.DRRSStatus,
        DeployableFlag: "N",
        DLCCode: c.DLCCode || "B",
        DLCReason: "EDD within 90 days (" + eddStr + ")",
        autoMapped: c.autoMapped
      };
    }
    return c;
  }

  /** Classify the entire roster. Returns { classified, reviewCount }. */
  function classifyRoster(rows, asOfDate) {
    var asOf = asOfDate || new Date();
    var reviewCount = 0;
    var classified = rows.map(function (row) {
      var c = classifyRow(row);
      c = applyEDDRule(c, row.EDD || row.EAS || "", asOf);

      var ds = (row.DutyStatus || "").trim();
      var rule = ruleMap[ds.toUpperCase()];
      var flagReview = (rule && rule.needsReview) || !rule;
      if (flagReview) reviewCount++;

      var out = {};
      for (var k in row) out[k] = row[k];
      out.DRRSStatus = c.DRRSStatus;
      out.DeployableFlag = c.DeployableFlag;
      out.DLC = c.DLCCode;
      out.DLC_Desc = c.DLCReason;
      out._needsReview = flagReview ? "true" : "";
      out._autoMapped = "true";
      return out;
    });
    return { classified: classified, reviewCount: reviewCount };
  }

  /** Summary of unique DutyStatus values and their default mappings. */
  function mappingSummary(rows) {
    var counts = {};
    rows.forEach(function (row) {
      var ds = (row.DutyStatus || "").trim() || "(empty)";
      if (!counts[ds]) {
        var rule = ruleMap[ds.toUpperCase()];
        counts[ds] = {
          dutyStatus: ds,
          count: 0,
          drrsStatus: rule ? rule.drrsStatus : "ASSIGNED",
          deployable: rule ? rule.deployable : "Y",
          needsReview: rule ? rule.needsReview : true
        };
      }
      counts[ds].count++;
    });
    return Object.values(counts).sort(function (a, b) { return b.count - a.count; });
  }

  // -----------------------------------------------------------------------
  // Exports
  // -----------------------------------------------------------------------

  ns.mapper = {
    DEFAULT_RULES: DEFAULT_RULES,
    needsMapping: needsMapping,
    classifyRow: classifyRow,
    classifyRoster: classifyRoster,
    mappingSummary: mappingSummary
  };

})(window.PLevel);
