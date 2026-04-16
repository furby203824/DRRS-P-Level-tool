/**
 * Synthetic unit data generator for demo / validation.
 *
 * Produces randomized RosterRow[], StructureRow[], and CriticalRow[]
 * that exercise all calculator code paths: exact BMOS fills, +/-1 grade,
 * PMOS fallback, unfilled gaps, and every DRRS status.
 *
 * EDIPIs start with 99 — no real PII is generated.
 */

import type { RosterRow, StructureRow, CriticalRow } from "./plevel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chance(pct: number): boolean {
  return Math.random() * 100 < pct;
}

// ---------------------------------------------------------------------------
// Static data pools
// ---------------------------------------------------------------------------

const ENLISTED = ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"] as const;
const OFFICER = ["O1", "O2", "O3", "O4", "O5", "O6"] as const;

const GRADE_RANK: Record<string, string> = {
  E1: "PVT", E2: "PFC", E3: "LCPL", E4: "CPL", E5: "SGT",
  E6: "SSGT", E7: "GYSGT", E8: "MSGT", E9: "MGYSGT",
  O1: "2NDLT", O2: "1STLT", O3: "CAPT", O4: "MAJ", O5: "LTCOL", O6: "COL",
  W2: "CWO2", W3: "CWO3", W4: "CWO4", W5: "CWO5",
};

interface MOSSpec {
  mos: string;
  desc: string;
  grades: string[];
}

const MOS_POOL: MOSSpec[] = [
  { mos: "0102", desc: "Personnel Officer", grades: ["O2", "O3"] },
  { mos: "0111", desc: "Administrative Specialist", grades: ["E2", "E3", "E4", "E5"] },
  { mos: "0121", desc: "Personnel Clerk", grades: ["E3", "E4", "E5"] },
  { mos: "0151", desc: "Administrative Clerk", grades: ["E2", "E3"] },
  { mos: "0170", desc: "Comm Strategy & Operations Officer", grades: ["O1", "O2"] },
  { mos: "0231", desc: "Intelligence Specialist", grades: ["E3", "E4", "E5"] },
  { mos: "0369", desc: "Infantry Unit Leader", grades: ["E6", "E7", "E8"] },
  { mos: "0411", desc: "Maintenance Management Specialist", grades: ["E5", "E6", "E7"] },
  { mos: "0431", desc: "Logistics/Embarkation Specialist", grades: ["E3", "E4", "E5"] },
  { mos: "0481", desc: "Landing Support Specialist", grades: ["E3", "E4", "E5"] },
  { mos: "0602", desc: "Communications Officer", grades: ["O1", "O2"] },
  { mos: "0621", desc: "Radio Operator", grades: ["E2", "E3", "E4"] },
  { mos: "0631", desc: "Network Administrator", grades: ["E3", "E4", "E5"] },
  { mos: "0651", desc: "Cyber Network Operator", grades: ["E3", "E4", "E5", "E6"] },
  { mos: "0659", desc: "Cyber Security Technician", grades: ["E5", "E6"] },
  { mos: "1141", desc: "Electrician", grades: ["E3", "E4", "E5"] },
  { mos: "1142", desc: "Refrigeration/AC Mechanic", grades: ["E4", "E5"] },
  { mos: "1171", desc: "Water Support Technician", grades: ["E3", "E4", "E5"] },
  { mos: "1341", desc: "Engineer Equipment Mechanic", grades: ["E3", "E4", "E5"] },
  { mos: "1345", desc: "Engineer Equipment Operator", grades: ["E3", "E4", "E5"] },
  { mos: "1371", desc: "Combat Engineer", grades: ["E2", "E3", "E4", "E5"] },
  { mos: "2111", desc: "Small Arms Repairer/Technician", grades: ["E4", "E5", "E6"] },
  { mos: "2311", desc: "Ammunition Technician", grades: ["E4", "E5"] },
  { mos: "2841", desc: "Ground Electronics Maintenance Tech", grades: ["E4", "E5", "E6"] },
  { mos: "3043", desc: "Supply Administration Clerk", grades: ["E2", "E3", "E4"] },
  { mos: "3051", desc: "Warehouse Clerk", grades: ["E3", "E4", "E5"] },
  { mos: "3112", desc: "Distribution Management Specialist", grades: ["E4", "E5", "E6"] },
  { mos: "3381", desc: "Food Service Specialist", grades: ["E2", "E3", "E4", "E5"] },
  { mos: "3432", desc: "Finance Technician", grades: ["E3", "E4", "E5"] },
  { mos: "3451", desc: "Financial Management Resource Analyst", grades: ["E5", "E6"] },
  { mos: "3531", desc: "Motor Vehicle Operator", grades: ["E2", "E3", "E4"] },
  { mos: "3533", desc: "Logistics Vehicle System Operator", grades: ["E3", "E4"] },
  { mos: "5811", desc: "Military Police", grades: ["E3", "E4", "E5"] },
  { mos: "6042", desc: "IMRL Manager", grades: ["E5", "E6"] },
  { mos: "8999", desc: "First Sergeant / Sergeant Major", grades: ["E8", "E9"] },
];

const MOS_DESC: Record<string, string> = {};
for (const m of MOS_POOL) MOS_DESC[m.mos] = m.desc;

const UNIT_TEMPLATES = [
  { name: "H&S CO, CLB",          prefix: "M023", size: [120, 180] as const },
  { name: "MOTOR TRANSPORT CO",   prefix: "M024", size: [80, 130]  as const },
  { name: "SUPPLY CO",            prefix: "M025", size: [90, 140]  as const },
  { name: "MAINTENANCE CO",       prefix: "M026", size: [100, 160] as const },
  { name: "ENGINEER SUPPORT CO",  prefix: "M027", size: [70, 120]  as const },
  { name: "COMBAT LOGISTICS CO",  prefix: "M028", size: [100, 150] as const },
  { name: "HQ PLT, CSSC",        prefix: "M029", size: [25, 45]   as const },
  { name: "COMM PLT",             prefix: "M030", size: [20, 35]   as const },
];

const LAST_NAMES = [
  "SMITH", "JOHNSON", "WILLIAMS", "BROWN", "JONES", "GARCIA", "MILLER",
  "DAVIS", "RODRIGUEZ", "MARTINEZ", "HERNANDEZ", "LOPEZ", "GONZALEZ",
  "WILSON", "ANDERSON", "THOMAS", "TAYLOR", "MOORE", "JACKSON", "MARTIN",
  "LEE", "PEREZ", "THOMPSON", "WHITE", "HARRIS", "SANCHEZ", "CLARK",
  "RAMIREZ", "LEWIS", "ROBINSON", "WALKER", "YOUNG", "ALLEN", "KING",
  "WRIGHT", "SCOTT", "TORRES", "NGUYEN", "HILL", "FLORES", "GREEN",
  "ADAMS", "NELSON", "BAKER", "HALL", "RIVERA", "CAMPBELL", "MITCHELL",
  "CARTER", "ROBERTS", "GOMEZ", "PHILLIPS", "EVANS", "TURNER", "DIAZ",
  "PARKER", "CRUZ", "EDWARDS", "COLLINS", "REYES", "STEWART", "MORRIS",
  "MORALES", "MURPHY", "COOK", "ROGERS", "GUTIERREZ", "ORTIZ", "MORGAN",
  "COOPER", "PETERSON", "BAILEY", "REED", "KELLY", "HOWARD", "RAMOS",
  "KIM", "COX", "WARD", "RICHARDSON", "WATSON", "BROOKS", "CHAVEZ",
  "WOOD", "JAMES", "BENNETT", "GRAY", "MENDOZA", "RUIZ", "HUGHES",
  "PRICE", "ALVAREZ", "CASTILLO", "SANDERS", "PATEL", "MYERS", "LONG",
  "ROSS", "FOSTER", "JIMENEZ",
];

const FIRST_NAMES = [
  "JAMES", "JOHN", "ROBERT", "MICHAEL", "DAVID", "WILLIAM", "RICHARD",
  "JOSEPH", "THOMAS", "CHARLES", "CHRISTOPHER", "DANIEL", "MATTHEW",
  "ANTHONY", "MARK", "STEVEN", "PAUL", "ANDREW", "JOSHUA", "KENNETH",
  "KEVIN", "BRIAN", "GEORGE", "TIMOTHY", "RONALD", "EDWARD", "JASON",
  "JEFFREY", "RYAN", "JACOB", "NICHOLAS", "ERIC", "JONATHAN", "STEPHEN",
  "JUSTIN", "SCOTT", "BRANDON", "BENJAMIN", "SAMUEL", "RAYMOND",
  "GREGORY", "FRANK", "ALEXANDER", "PATRICK", "JACK", "DENNIS", "TYLER",
  "AARON", "JOSE", "ADAM", "NATHAN", "HENRY", "PETER", "ZACHARY",
  "MARIA", "JENNIFER", "JESSICA", "SARAH", "ASHLEY", "AMANDA",
  "STEPHANIE", "NICOLE", "ELIZABETH", "HEATHER", "MICHELLE", "AMBER",
  "MEGAN", "RACHEL", "LAURA", "ANDREA", "SHANNON", "BRITTANY",
  "CHRISTINA", "SAMANTHA", "KATHERINE", "CHRISTINE", "VICTORIA", "KELLY",
  "VANESSA", "COURTNEY", "JAMIE", "CRYSTAL", "PATRICIA", "DIANA",
  "NATALIE", "ANGELA", "TIFFANY",
];

// ---------------------------------------------------------------------------
// Grade helpers
// ---------------------------------------------------------------------------

function adjacentGrade(grade: string, dir: 1 | -1): string | null {
  for (const scale of [ENLISTED, OFFICER]) {
    const i = (scale as readonly string[]).indexOf(grade);
    if (i >= 0) {
      const j = i + dir;
      return j >= 0 && j < scale.length ? scale[j] : null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// EDIPI / name generation
// ---------------------------------------------------------------------------

let edipiSeq = 0;

function makeEDIPI(): string {
  edipiSeq++;
  return "99" + String(edipiSeq).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Structure builder
// ---------------------------------------------------------------------------

function buildStructure(uic: string, unitName: string, total: number): StructureRow[] {
  const rows: StructureRow[] = [];

  // Leadership billets
  rows.push({ Unit: uic, UnitName: unitName, BMOS: "0102", PayGrade: "O3", Authorized: 1 });
  rows.push({ Unit: uic, UnitName: unitName, BMOS: "0102", PayGrade: "O2", Authorized: randInt(1, 2) });
  rows.push({ Unit: uic, UnitName: unitName, BMOS: "8999", PayGrade: "E8", Authorized: 1 });
  if (total > 80) {
    rows.push({ Unit: uic, UnitName: unitName, BMOS: "8999", PayGrade: "E9", Authorized: 1 });
  }

  let remaining = total - rows.reduce((s, r) => s + r.Authorized, 0);

  // Pick 8-16 MOS codes for this unit
  const unitMos = shuffle(MOS_POOL).slice(0, randInt(8, Math.min(16, MOS_POOL.length)));

  while (remaining > 0) {
    const spec = pick(unitMos);
    const grade = pick(spec.grades);
    const count = Math.min(remaining, randInt(1, 4));
    const existing = rows.find((r) => r.BMOS === spec.mos && r.PayGrade === grade);
    if (existing) {
      existing.Authorized += count;
    } else {
      rows.push({ Unit: uic, UnitName: unitName, BMOS: spec.mos, PayGrade: grade, Authorized: count });
    }
    remaining -= count;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Roster builder
// ---------------------------------------------------------------------------

function buildRoster(
  uic: string,
  unitName: string,
  structure: StructureRow[],
  criticalSet: Set<string>,
): RosterRow[] {
  const roster: RosterRow[] = [];
  const allMos = [...new Set(structure.map((s) => s.BMOS))];

  // Expand structure into individual billet slots
  const billets: { mos: string; grade: string }[] = [];
  for (const s of structure) {
    for (let i = 0; i < s.Authorized; i++) {
      billets.push({ mos: s.BMOS, grade: s.PayGrade });
    }
  }

  // Random fill rate 70-92 %
  const fillRate = 70 + Math.random() * 22;

  for (const billet of billets) {
    if (!chance(fillRate)) continue;

    let marineBMOS = billet.mos;
    let marinePMOS = billet.mos;
    let marineGrade = billet.grade;

    // For critical billets, exercise varied match paths
    if (criticalSet.has(billet.mos)) {
      const roll = Math.random() * 100;
      if (roll < 70) {
        // 70 %  exact BMOS + exact grade (most common)
      } else if (roll < 82) {
        // 12 %  exact BMOS + adjacent grade
        const adj = adjacentGrade(billet.grade, chance(50) ? 1 : -1);
        if (adj) marineGrade = adj;
      } else if (roll < 92) {
        // 10 %  PMOS fallback: different BMOS, matching PMOS
        const other = allMos.filter((m) => m !== billet.mos);
        marineBMOS = other.length ? pick(other) : billet.mos;
        marinePMOS = billet.mos;
      } else {
        //  8 %  PMOS fallback + adjacent grade
        const other = allMos.filter((m) => m !== billet.mos);
        marineBMOS = other.length ? pick(other) : billet.mos;
        marinePMOS = billet.mos;
        const adj = adjacentGrade(billet.grade, chance(50) ? 1 : -1);
        if (adj) marineGrade = adj;
      }
    }

    // DRRS status and deployability
    let status = "ASSIGNED";
    let dlc = "Y";
    let deployable = "Y";
    const sRoll = Math.random() * 100;

    if (sRoll < 4) {
      status = "DETACHED";
    } else if (sRoll < 7) {
      status = "IA";
    } else if (sRoll < 9) {
      status = "JIA";
    } else if (sRoll < 13) {
      dlc = "N"; deployable = "N";
    } else if (sRoll < 16) {
      dlc = "L";
    }

    roster.push({
      EDIPI: makeEDIPI(),
      LastName: pick(LAST_NAMES),
      FirstName: pick(FIRST_NAMES),
      Rank: GRADE_RANK[marineGrade] ?? marineGrade,
      PayGrade: marineGrade,
      Service: chance(95) ? "USMC" : "USN",
      Component: "AD",
      BMOS: marineBMOS,
      PMOS: marinePMOS,
      DRRSStatus: status,
      DeployableFlag: deployable,
      DLC: dlc,
      Unit: uic,
      UnitName: unitName,
      BIC: `${uic}${marineBMOS}${marineGrade}`.slice(0, 13).padEnd(13, "0"),
    });
  }

  // Sprinkle in some ATTACHED Marines from other units
  const attachedCount = randInt(2, Math.max(3, Math.round(billets.length * 0.04)));
  for (let i = 0; i < attachedCount; i++) {
    const spec = pick(MOS_POOL);
    const grade = pick(spec.grades);
    roster.push({
      EDIPI: makeEDIPI(),
      LastName: pick(LAST_NAMES),
      FirstName: pick(FIRST_NAMES),
      Rank: GRADE_RANK[grade] ?? grade,
      PayGrade: grade,
      Service: "USMC",
      Component: "AD",
      BMOS: spec.mos,
      PMOS: spec.mos,
      DRRSStatus: "ATTACHED",
      DeployableFlag: "Y",
      DLC: "Y",
      Unit: uic,
      UnitName: unitName,
      BIC: "",
    });
  }

  return roster;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GeneratedUnit {
  roster: RosterRow[];
  structure: StructureRow[];
  critical: CriticalRow[];
  uic: string;
  unitName: string;
}

export function generateUnit(): GeneratedUnit {
  // Random EDIPI starting point so repeated clicks look different
  edipiSeq = randInt(10000, 90000);

  const tmpl = pick(UNIT_TEMPLATES);
  const uic = tmpl.prefix + String(randInt(10, 99)) + String.fromCharCode(65 + randInt(0, 7));
  const unitName = tmpl.name;
  const totalBillets = randInt(tmpl.size[0], tmpl.size[1]);

  // 1. Build T/O structure
  const structure = buildStructure(uic, unitName, totalBillets);

  // 2. Pick 30-50 % of unique MOS codes as critical
  const uniqueMos = [...new Set(structure.map((s) => s.BMOS))];
  const critCount = Math.max(3, Math.round(uniqueMos.length * (0.3 + Math.random() * 0.2)));
  const critMosCodes = shuffle(uniqueMos).slice(0, critCount);

  const critical: CriticalRow[] = critMosCodes.map((mos) => ({
    MOS: mos,
    Description: MOS_DESC[mos] ?? `MOS ${mos}`,
    Category: "CRITICAL",
  }));

  // 3. Build alpha roster with realistic noise
  const critSet = new Set(critMosCodes);
  const roster = buildRoster(uic, unitName, structure, critSet);

  return { roster, structure, critical, uic, unitName };
}
