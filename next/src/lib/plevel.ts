/**
 * P-Level calculation per MCO 3000.13B paragraph 7c.
 *
 * Pure functions — no DOM, no side effects, no browser globals.
 * Ported from assets/js/calculator.js on the static site.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FillSource = "BMOS" | "PMOS";
export type MatchType = "exact" | "plusMinusOne";
export type PLevelBand = 1 | 2 | 3 | 4;

export interface RosterRow {
  EDIPI: string;
  LastName: string;
  FirstName: string;
  Rank: string;
  PayGrade: string;
  Service: string;
  Component: string;
  BMOS: string;
  PMOS: string;
  DRRSStatus: string;
  DeployableFlag: string;
  [key: string]: string; // allow extra CSV columns
}

export interface StructureRow {
  Unit: string;
  UnitName?: string;
  BMOS: string;
  PayGrade: string;
  Authorized: number;
  BilletDescription?: string;
}

export interface CriticalRow {
  MOS: string;
  Description: string;
  Category: string;
  UnitType?: string;
}

export interface CalcOptions {
  countLimitedAsNonDeployable?: boolean;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface PersonnelResult {
  assigned: number;
  attached: number;
  assignedAttached: number;
  detached: number;
  ia: number;
  jia: number;
  nonDeployable: number;
  limited: number;
  limitedSubtracted: number;
  countLimitedAsNonDeployable: boolean;
  effective: number;
  authorized: number;
  pct: number;
}

export interface FillSummary {
  exactBMOS: number;
  flexBMOS: number;
  exactPMOS: number;
  flexPMOS: number;
  unfilled: number;
}

export interface BreakdownRow {
  MOS: string;
  PayGrade: string;
  Description: string;
  Authorized: number;
  Filled: number;
  ExactBMOS: number;
  FlexBMOS: number;
  ExactPMOS: number;
  FlexPMOS: number;
}

export interface AuditRow {
  MOS: string;
  Description: string;
  AuthorizedPayGrade: string;
  BIC: string;
  Filled: boolean;
  FillerEDIPI: string;
  FillerName: string;
  FillerPayGrade: string;
  FillerBMOS: string;
  FillerPMOS: string;
  FillSource: FillSource | null;
  MatchType: MatchType | null;
}

export interface CriticalResult {
  authorized: number;
  filled: number;
  pct: number;
  breakdown: BreakdownRow[];
  audit: AuditRow[];
  fillSummary: FillSummary;
}

export interface BandResult {
  pBand: PLevelBand;
  cBand: PLevelBand;
  finalBand: PLevelBand;
  driver: string;
}

export interface CalcResult {
  personnel: PersonnelResult;
  critical: CriticalResult;
  band: BandResult;
  pLevel: string;
  rosterCount: number;
  excludedContractors: number;
  options: { countLimitedAsNonDeployable: boolean };
}

// ---------------------------------------------------------------------------
// PayGrade ladder logic
// ---------------------------------------------------------------------------

const GRADE_LADDERS: Record<string, string[]> = {
  E: ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
  W: ["W1", "W2", "W3", "W4", "W5"],
  O: ["O1", "O2", "O3", "O4", "O5", "O6", "O7", "O8", "O9", "O10"],
};

function ladderOf(grade: string): string[] | null {
  if (!grade) return null;
  return GRADE_LADDERS[grade.toUpperCase()[0]] ?? null;
}

function gradeIndex(grade: string): number {
  const ladder = ladderOf(grade);
  if (!ladder) return -1;
  return ladder.indexOf(grade.toUpperCase());
}

/** True if marineGrade is within ±1 of authorizedGrade on the same E/W/O ladder. */
export function withinOneGrade(marineGrade: string, authorizedGrade: string): boolean {
  const a = gradeIndex(marineGrade);
  const b = gradeIndex(authorizedGrade);
  if (a < 0 || b < 0) return false;
  if (ladderOf(marineGrade) !== ladderOf(authorizedGrade)) return false;
  return Math.abs(a - b) <= 1;
}

// ---------------------------------------------------------------------------
// Band mapping
// ---------------------------------------------------------------------------

export function bandFor(personnelPct: number, criticalPct: number): BandResult {
  const pBand: PLevelBand = personnelPct >= 90 ? 1 : personnelPct >= 80 ? 2 : personnelPct >= 70 ? 3 : 4;
  const cBand: PLevelBand = criticalPct >= 85 ? 1 : criticalPct >= 75 ? 2 : criticalPct >= 65 ? 3 : 4;
  const finalBand = Math.max(pBand, cBand) as PLevelBand;
  let driver = "personnel and critical MOS aligned";
  if (pBand > cBand) driver = "driven by Personnel Strength";
  else if (cBand > pBand) driver = "driven by Critical MOS fill";
  return { pBand, cBand, finalBand, driver };
}

// ---------------------------------------------------------------------------
// Personnel Strength
// ---------------------------------------------------------------------------

function calculatePersonnelStrength(
  roster: RosterRow[],
  structure: StructureRow[],
  options?: CalcOptions,
): PersonnelResult {
  const countLimitedAsNonDeployable = options?.countLimitedAsNonDeployable !== false;

  let assigned = 0;
  let attached = 0;
  let detached = 0;
  let ia = 0;
  let jia = 0;
  let nonDeployable = 0;
  let limited = 0;

  for (const m of roster) {
    const status = (m.DRRSStatus || "").toUpperCase();
    const flag = (m.DeployableFlag || "").toUpperCase();
    if (status === "ASSIGNED") {
      assigned++;
      if (flag === "N") nonDeployable++;
      else if (flag === "L") limited++;
    } else if (status === "ATTACHED") {
      attached++;
      if (flag === "N") nonDeployable++;
      else if (flag === "L") limited++;
    } else if (status === "DETACHED") detached++;
    else if (status === "IA") ia++;
    else if (status === "JIA") jia++;
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
    pct,
  };
}

// ---------------------------------------------------------------------------
// Critical MOS fill (greedy four-pass matching)
// ---------------------------------------------------------------------------

interface InternalBillet {
  MOS: string;
  PayGrade: string;
  Description: string;
  Unit: string;
  seq: number;
  filledBy: number | null;
  fillSource: FillSource | null;
  matchType: MatchType | null;
}

function calculateCriticalMOS(
  roster: RosterRow[],
  structure: StructureRow[],
  criticalList: CriticalRow[],
): CriticalResult {
  const criticalMosSet = new Set(criticalList.map((c) => c.MOS));
  const descByMos: Record<string, string> = {};
  for (const c of criticalList) descByMos[c.MOS] = c.Description;

  // Expand authorized billets.
  const billets: InternalBillet[] = [];
  let billetSeq = 0;
  for (const s of structure) {
    if (criticalMosSet.has(s.BMOS)) {
      for (let i = 0; i < s.Authorized; i++) {
        billetSeq++;
        billets.push({
          MOS: s.BMOS,
          PayGrade: s.PayGrade,
          Description: descByMos[s.BMOS] ?? "",
          Unit: s.Unit,
          seq: billetSeq,
          filledBy: null,
          fillSource: null,
          matchType: null,
        });
      }
    }
  }

  // Build candidate pool.
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
      fillSource: (criticalMosSet.has(m.BMOS) ? "BMOS" : "PMOS") as FillSource,
    }));

  const used = new Set<number>();

  function tryFill(source: FillSource, exact: boolean): void {
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

  // Per-billet audit trail.
  const audit: AuditRow[] = billets
    .map((b) => {
      const filler = b.filledBy !== null ? roster[b.filledBy] : null;
      return {
        MOS: b.MOS,
        Description: b.Description,
        AuthorizedPayGrade: b.PayGrade,
        BIC: filler?.BIC || `${b.Unit}${b.MOS}${b.PayGrade}${String(b.seq).padStart(3, "0")}`.slice(0, 13),
        Filled: filler !== null,
        FillerEDIPI: filler?.EDIPI ?? "",
        FillerName: filler
          ? `${filler.Rank || ""} ${filler.LastName || ""}, ${filler.FirstName || ""}`.trim().replace(/^,\s*/, "")
          : "",
        FillerPayGrade: filler?.PayGrade ?? "",
        FillerBMOS: filler?.BMOS ?? "",
        FillerPMOS: filler?.PMOS ?? "",
        FillSource: b.fillSource,
        MatchType: b.matchType,
      };
    })
    .sort(
      (a, b) =>
        a.MOS.localeCompare(b.MOS) ||
        a.AuthorizedPayGrade.localeCompare(b.AuthorizedPayGrade) ||
        (a.Filled === b.Filled ? 0 : a.Filled ? -1 : 1),
    );

  // Rollup per (MOS, PayGrade).
  const aggMap = new Map<string, BreakdownRow>();
  for (const b of billets) {
    const key = `${b.MOS}|${b.PayGrade}`;
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
        FlexPMOS: 0,
      });
    }
    const row = aggMap.get(key)!;
    row.Authorized++;
    if (b.filledBy !== null) {
      row.Filled++;
      if (b.fillSource === "BMOS" && b.matchType === "exact") row.ExactBMOS++;
      else if (b.fillSource === "BMOS") row.FlexBMOS++;
      else if (b.fillSource === "PMOS" && b.matchType === "exact") row.ExactPMOS++;
      else if (b.fillSource === "PMOS") row.FlexPMOS++;
    }
  }
  const breakdown = Array.from(aggMap.values()).sort(
    (a, b) => a.MOS.localeCompare(b.MOS) || a.PayGrade.localeCompare(b.PayGrade),
  );

  const authorized = billets.length;
  const filled = billets.filter((b) => b.filledBy !== null).length;
  const pct = authorized > 0 ? (filled / authorized) * 100 : 0;

  const fillSummary: FillSummary = {
    exactBMOS: billets.filter((b) => b.fillSource === "BMOS" && b.matchType === "exact").length,
    flexBMOS: billets.filter((b) => b.fillSource === "BMOS" && b.matchType === "plusMinusOne").length,
    exactPMOS: billets.filter((b) => b.fillSource === "PMOS" && b.matchType === "exact").length,
    flexPMOS: billets.filter((b) => b.fillSource === "PMOS" && b.matchType === "plusMinusOne").length,
    unfilled: billets.filter((b) => b.filledBy === null).length,
  };

  return { authorized, filled, pct, breakdown, audit, fillSummary };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function calculate(
  roster: RosterRow[],
  structure: StructureRow[],
  criticalList: CriticalRow[],
  options?: CalcOptions,
): CalcResult {
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
    pLevel: `P-${band.finalBand}`,
    rosterCount: filteredRoster.length,
    excludedContractors,
    options: {
      countLimitedAsNonDeployable: options?.countLimitedAsNonDeployable !== false,
    },
  };
}
