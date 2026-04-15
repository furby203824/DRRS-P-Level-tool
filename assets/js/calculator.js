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

  function calculatePersonnelStrength(roster, structure) {
    // Numerator = (Assigned + Attached) - (non-deployable subset)
    // Detached / IA / JIA rows are already excluded from Assigned+Attached
    // since DRRSStatus is exclusive.
    let assignedAttached = 0;
    let detached = 0;
    let ia = 0;
    let jia = 0;
    let nonDeployable = 0; // among assigned+attached
    let limited = 0;       // among assigned+attached (DeployableFlag = L)

    for (const m of roster) {
      const status = (m.DRRSStatus || "").toUpperCase();
      const flag = (m.DeployableFlag || "").toUpperCase();
      if (status === "ASSIGNED" || status === "ATTACHED") {
        assignedAttached += 1;
        if (flag === "N") nonDeployable += 1;
        else if (flag === "L") limited += 1;
      } else if (status === "DETACHED") detached += 1;
      else if (status === "IA") ia += 1;
      else if (status === "JIA") jia += 1;
    }

    // Treat "Limited" as not fully counting toward effective strength.
    const effective = assignedAttached - nonDeployable - limited;
    const authorized = structure.reduce((sum, r) => sum + (r.Authorized || 0), 0);
    const pct = authorized > 0 ? (effective / authorized) * 100 : 0;

    return {
      assignedAttached,
      detached,
      ia,
      jia,
      nonDeployable,
      limited,
      effective,
      authorized,
      pct
    };
  }

  function calculateCriticalMOS(roster, structure, criticalList) {
    const criticalMosSet = new Set(criticalList.map((c) => c.MOS));

    // Build the authorized critical billets, indexed for fill matching.
    // Each entry: { MOS, PayGrade, Authorized, Filled, Description }
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
            filledBy: null
          });
        }
      }
    }

    // Build the candidate Marine pool: only ASSIGNED or ATTACHED, deployable.
    // PMOS must be in critical list. Tracked as available (not yet matched).
    const candidates = roster
      .map((m, idx) => ({ idx, m }))
      .filter(({ m }) => {
        const status = (m.DRRSStatus || "").toUpperCase();
        const flag = (m.DeployableFlag || "").toUpperCase();
        return (status === "ASSIGNED" || status === "ATTACHED") &&
               flag !== "N" && flag !== "L" &&
               criticalMosSet.has(m.PMOS);
      });

    const used = new Set();

    // Greedy match: prefer exact paygrade match first, then +/-1.
    // Pass 1 -- exact match (highest fidelity).
    for (const b of billets) {
      if (b.filledBy !== null) continue;
      const cand = candidates.find(({ idx, m }) =>
        !used.has(idx) && m.PMOS === b.MOS && (m.PayGrade || "").toUpperCase() === b.PayGrade
      );
      if (cand) {
        b.filledBy = cand.idx;
        used.add(cand.idx);
      }
    }
    // Pass 2 -- +/- 1 paygrade.
    for (const b of billets) {
      if (b.filledBy !== null) continue;
      const cand = candidates.find(({ idx, m }) =>
        !used.has(idx) && m.PMOS === b.MOS && withinOneGrade(m.PayGrade, b.PayGrade)
      );
      if (cand) {
        b.filledBy = cand.idx;
        used.add(cand.idx);
      }
    }

    // Aggregate per (MOS, PayGrade) for the breakdown table.
    const aggMap = new Map();
    for (const b of billets) {
      const key = b.MOS + "|" + b.PayGrade;
      if (!aggMap.has(key)) {
        aggMap.set(key, {
          MOS: b.MOS,
          PayGrade: b.PayGrade,
          Description: b.Description,
          Authorized: 0,
          Filled: 0
        });
      }
      const row = aggMap.get(key);
      row.Authorized += 1;
      if (b.filledBy !== null) row.Filled += 1;
    }
    const breakdown = Array.from(aggMap.values()).sort((a, b) =>
      a.MOS.localeCompare(b.MOS) || a.PayGrade.localeCompare(b.PayGrade)
    );

    const authorized = billets.length;
    const filled = billets.filter((b) => b.filledBy !== null).length;
    const pct = authorized > 0 ? (filled / authorized) * 100 : 0;

    return { authorized, filled, pct, breakdown };
  }

  function calculate(roster, structure, criticalList) {
    // Exclude contractors per MCO 3000.13B. The schema doesn't carry a
    // contractor flag, but Component/Service can be checked defensively.
    const filteredRoster = roster.filter((m) => {
      const svc = (m.Service || "").toUpperCase();
      return svc !== "CTR" && svc !== "CONTRACTOR";
    });

    const personnel = calculatePersonnelStrength(filteredRoster, structure);
    const critical = calculateCriticalMOS(filteredRoster, structure, criticalList);
    const band = bandFor(personnel.pct, critical.pct);

    return {
      personnel,
      critical,
      band,
      pLevel: "P-" + band.finalBand,
      rosterCount: filteredRoster.length
    };
  }

  ns.calculator = {
    calculate,
    withinOneGrade,
    bandFor
  };
})(window.PLevel);
