/* calculator.js -- P-Level calculation per MCO 3000.13B paragraph 7c */

window.PLevel = window.PLevel || {};

(function (ns) {
  "use strict";

  // PayGrade ordering for the +/-1 rule. Enlisted, Warrant, Officer are
  // separate ladders -- a Marine cannot "fill across" the ladder.
  const GRADE_LADDERS = {
    E: ["E1","E2","E3","E4","E5","E6","E7","E8","E9"],
    W: ["W1","W2","W3","W4","W5"],
    O: ["O1","O2","O3","O4","O5","O6","O7","O8","O9","O10"]
  };

  function ladderOf(grade) {
    if (!grade) return null;
    const g = grade.toUpperCase();
    return GRADE_LADDERS[g[0]] || null;
  }

  function gradeIndex(grade) {
    const ladder = ladderOf(grade);
    if (!ladder) return -1;
    return ladder.indexOf(grade.toUpperCase());
  }

  // Returns true if marineGrade is within +/- 1 of authorizedGrade on the
  // same ladder (E/W/O). Per the schema doc.
  function withinOneGrade(marineGrade, authorizedGrade) {
    const a = gradeIndex(marineGrade);
    const b = gradeIndex(authorizedGrade);
    if (a < 0 || b < 0) return false;
    if (ladderOf(marineGrade) !== ladderOf(authorizedGrade)) return false;
    return Math.abs(a - b) <= 1;
  }

  function bandFor(personnelPct, criticalPct) {
    // Use the lower of the two percentages mapped against the band table.
    // Tables: P-1 90/85, P-2 80/75, P-3 70/65, else P-4.
    const pBand = personnelPct >= 90 ? 1 : personnelPct >= 80 ? 2 : personnelPct >= 70 ? 3 : 4;
    const cBand = criticalPct >= 85 ? 1 : criticalPct >= 75 ? 2 : criticalPct >= 65 ? 3 : 4;
    const finalBand = Math.max(pBand, cBand); // higher number = worse
    let driver = "personnel and critical MOS aligned";
    if (pBand > cBand) driver = "driven by Personnel Strength";
    else if (cBand > pBand) driver = "driven by Critical MOS fill";
    return { pBand, cBand, finalBand, driver };
  }

  function calculatePersonnelStrength(roster, structure, options) {
    // Numerator = (Assigned + Attached) - (non-deployable subset)
    // Detached / IA / JIA rows are already excluded from Assigned+Attached
    // since DRRSStatus is exclusive.
    const countLimitedAsNonDeployable =
      !options || options.countLimitedAsNonDeployable !== false;

    let assigned = 0;
    let attached = 0;
    let detached = 0;
    let ia = 0;
    let jia = 0;
    let nonDeployable = 0; // among assigned+attached
    let limited = 0;       // among assigned+attached (DeployableFlag = L)

    for (const m of roster) {
      const status = (m.DRRSStatus || "").toUpperCase();
      const flag = (m.DeployableFlag || "").toUpperCase();
      if (status === "ASSIGNED") {
        assigned += 1;
        if (flag === "N") nonDeployable += 1;
        else if (flag === "L") limited += 1;
      } else if (status === "ATTACHED") {
        attached += 1;
        if (flag === "N") nonDeployable += 1;
        else if (flag === "L") limited += 1;
      } else if (status === "DETACHED") detached += 1;
      else if (status === "IA") ia += 1;
      else if (status === "JIA") jia += 1;
    }

    const assignedAttached = assigned + attached;
    const limitedSubtracted = countLimitedAsNonDeployable ? limited : 0;
    const effective = assignedAttached - nonDeployable - limitedSubtracted;
    const authorized = structure.reduce((sum, r) => sum + (r.Authorized || 0), 0);
    const pct = authorized > 0 ? (effective / authorized) * 100 : 0;

    return {
      assigned,
      attached,
      assignedAttached,
      detached,
      ia,
      jia,
      nonDeployable,
      limited,
      limitedSubtracted,
      countLimitedAsNonDeployable,
      effective,
      authorized,
      pct
    };
  }

  function calculateCriticalMOS(roster, structure, criticalList) {
    const criticalMosSet = new Set(criticalList.map((c) => c.MOS));

    // Build the authorized critical billets, indexed for fill matching.
    const billets = [];
    const descByMos = {};
    for (const c of criticalList) descByMos[c.MOS] = c.Description;

    for (const s of structure) {
      if (criticalMosSet.has(s.BMOS)) {
        for (let i = 0; i < s.Authorized; i++) {
          billets.push({
            MOS: s.BMOS,
            PayGrade: s.PayGrade,
            Description: descByMos[s.BMOS] || "",
            filledBy: null,     // index into the roster
            fillSource: null,   // "BMOS" or "PMOS"
            matchType: null     // "exact" or "plusMinusOne"
          });
        }
      }
    }

    // BMOS-primary / PMOS-secondary per MCO 3000.13B 7c.
    // A Marine's "fill MOS" is their BMOS if it's critical (they're in seat
    // for that critical billet), otherwise their PMOS (they qualify to fill
    // a gap). Only ASSIGNED/ATTACHED and deployable Marines count.
    const candidates = roster
      .map((m, idx) => ({ idx, m }))
      .filter(({ m }) => {
        const status = (m.DRRSStatus || "").toUpperCase();
        const flag = (m.DeployableFlag || "").toUpperCase();
        if (status !== "ASSIGNED" && status !== "ATTACHED") return false;
        if (flag === "N" || flag === "L") return false;
        return criticalMosSet.has(m.BMOS) || criticalMosSet.has(m.PMOS);
      })
      .map(({ idx, m }) => ({
        idx,
        m,
        fillMos: criticalMosSet.has(m.BMOS) ? m.BMOS : m.PMOS,
        fillSource: criticalMosSet.has(m.BMOS) ? "BMOS" : "PMOS"
      }));

    const used = new Set();

    // Four-pass greedy match -- BMOS primary, exact grade preferred.
    // Pass 1: BMOS match, exact paygrade.
    // Pass 2: BMOS match, +/-1 paygrade.
    // Pass 3: PMOS match, exact paygrade.
    // Pass 4: PMOS match, +/-1 paygrade.
    function tryFill(source, exact) {
      for (const b of billets) {
        if (b.filledBy !== null) continue;
        const cand = candidates.find(({ idx, m, fillMos, fillSource }) => {
          if (used.has(idx)) return false;
          if (fillSource !== source) return false;
          if (fillMos !== b.MOS) return false;
          const grade = (m.PayGrade || "").toUpperCase();
          return exact ? grade === b.PayGrade : withinOneGrade(grade, b.PayGrade);
        });
        if (cand) {
          b.filledBy = cand.idx;
          b.fillSource = cand.fillSource;
          b.matchType = exact ? "exact" : "plusMinusOne";
          used.add(cand.idx);
        }
      }
    }
    tryFill("BMOS", true);
    tryFill("BMOS", false);
    tryFill("PMOS", true);
    tryFill("PMOS", false);

    // Build per-billet audit trail. Each row documents one decision.
    const audit = billets.map((b) => {
      const filler = b.filledBy !== null ? roster[b.filledBy] : null;
      return {
        MOS: b.MOS,
        Description: b.Description,
        AuthorizedPayGrade: b.PayGrade,
        Filled: filler !== null,
        FillerEDIPI: filler ? filler.EDIPI : "",
        FillerName: filler
          ? `${filler.Rank || ""} ${filler.LastName || ""}, ${filler.FirstName || ""}`.trim().replace(/^,\s*/, "")
          : "",
        FillerPayGrade: filler ? (filler.PayGrade || "") : "",
        FillerBMOS: filler ? (filler.BMOS || "") : "",
        FillerPMOS: filler ? (filler.PMOS || "") : "",
        FillSource: b.fillSource,   // "BMOS", "PMOS", or null
        MatchType: b.matchType       // "exact", "plusMinusOne", or null
      };
    }).sort((a, b) =>
      a.MOS.localeCompare(b.MOS) ||
      a.AuthorizedPayGrade.localeCompare(b.AuthorizedPayGrade) ||
      (a.Filled === b.Filled ? 0 : a.Filled ? -1 : 1)
    );

    // Aggregate per (MOS, PayGrade) for the rollup table.
    const aggMap = new Map();
    for (const b of billets) {
      const key = b.MOS + "|" + b.PayGrade;
      if (!aggMap.has(key)) {
        aggMap.set(key, {
          MOS: b.MOS,
          PayGrade: b.PayGrade,
          Description: b.Description,
          Authorized: 0,
          Filled: 0,
          ExactBMOS: 0,
          FlexBMOS: 0,
          ExactPMOS: 0,
          FlexPMOS: 0
        });
      }
      const row = aggMap.get(key);
      row.Authorized += 1;
      if (b.filledBy !== null) {
        row.Filled += 1;
        if (b.fillSource === "BMOS" && b.matchType === "exact") row.ExactBMOS += 1;
        else if (b.fillSource === "BMOS") row.FlexBMOS += 1;
        else if (b.fillSource === "PMOS" && b.matchType === "exact") row.ExactPMOS += 1;
        else if (b.fillSource === "PMOS") row.FlexPMOS += 1;
      }
    }
    const breakdown = Array.from(aggMap.values()).sort((a, b) =>
      a.MOS.localeCompare(b.MOS) || a.PayGrade.localeCompare(b.PayGrade)
    );

    const authorized = billets.length;
    const filled = billets.filter((b) => b.filledBy !== null).length;
    const pct = authorized > 0 ? (filled / authorized) * 100 : 0;

    // Summary of fill decisions for the show-the-work panel.
    const fillSummary = {
      exactBMOS: billets.filter((b) => b.fillSource === "BMOS" && b.matchType === "exact").length,
      flexBMOS: billets.filter((b) => b.fillSource === "BMOS" && b.matchType === "plusMinusOne").length,
      exactPMOS: billets.filter((b) => b.fillSource === "PMOS" && b.matchType === "exact").length,
      flexPMOS: billets.filter((b) => b.fillSource === "PMOS" && b.matchType === "plusMinusOne").length,
      unfilled: billets.filter((b) => b.filledBy === null).length
    };

    return { authorized, filled, pct, breakdown, audit, fillSummary };
  }

  function calculate(roster, structure, criticalList, options) {
    // Exclude contractors per MCO 3000.13B. The schema doesn't carry a
    // contractor flag, but Component/Service can be checked defensively.
    const filteredRoster = roster.filter((m) => {
      const svc = (m.Service || "").toUpperCase();
      return svc !== "CTR" && svc !== "CONTRACTOR";
    });
    const excludedContractors = roster.length - filteredRoster.length;

    const personnel = calculatePersonnelStrength(filteredRoster, structure, options);
    const critical = calculateCriticalMOS(filteredRoster, structure, criticalList);
    const band = bandFor(personnel.pct, critical.pct);

    return {
      personnel,
      critical,
      band,
      pLevel: "P-" + band.finalBand,
      rosterCount: filteredRoster.length,
      excludedContractors,
      options: {
        countLimitedAsNonDeployable:
          !options || options.countLimitedAsNonDeployable !== false
      }
    };
  }

  ns.calculator = {
    calculate,
    withinOneGrade,
    bandFor
  };
})(window.PLevel);
