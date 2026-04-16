/**
 * CSV parsing, schema validation, and row normalization.
 *
 * Uses PapaParse (loaded at runtime via dynamic import or a CDN-free
 * vendor bundle). The static site version is in assets/js/parser.js.
 */

import type { RosterRow, StructureRow, CriticalRow } from "./plevel";

// ---------------------------------------------------------------------------
// Schema definition
// ---------------------------------------------------------------------------

export type FileKind = "roster" | "structure" | "critical";

export interface SchemaEntry {
  label: string;
  required: string[];
}

export const SCHEMA: Record<FileKind, SchemaEntry> = {
  roster: {
    label: "Alpha Roster",
    required: [
      "EDIPI", "LastName", "FirstName", "Rank", "PayGrade", "Service",
      "Component", "Unit", "BMOS", "PMOS", "Category", "DutyStatus",
      "DRRSStatus", "DeployableFlag",
    ],
  },
  structure: {
    label: "T/O Structure",
    required: ["Unit", "BMOS", "PayGrade", "Authorized"],
  },
  critical: {
    label: "Critical MOS List",
    required: ["MOS", "Description", "Category"],
  },
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_DRRS_STATUS = new Set(["ASSIGNED", "ATTACHED", "DETACHED", "IA", "JIA"]);
const VALID_DLC = new Set(["Y", "N", "L", "D", "B"]);
const GRADE_PATTERN = /^(E[1-9]|W[1-5]|O([1-9]|10))$/;

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export function validate(kind: FileKind, rows: Record<string, string>[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = SCHEMA[kind].label;

  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push(`${label}: file is empty.`);
    return { errors, warnings };
  }

  const cols = Object.keys(rows[0]);
  const missing = SCHEMA[kind].required.filter((c) => !cols.includes(c));
  if (missing.length) {
    errors.push(`${label}: missing required column(s): ${missing.join(", ")}.`);
    return { errors, warnings };
  }

  if (kind === "roster") {
    rows.forEach((r, i) => {
      const n = i + 2;
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
        if (isNaN(auth)) errors.push(`${label}: row ${n} has non-numeric Authorized value "${authRaw}".`);
        else if (auth < 0) errors.push(`${label}: row ${n} has negative Authorized value ${auth}.`);
      }
    });
  } else if (kind === "critical") {
    const seen = new Set<string>();
    rows.forEach((r, i) => {
      const n = i + 2;
      if (!r.MOS) errors.push(`${label}: row ${n} missing MOS.`);
      else if (seen.has(r.MOS)) warnings.push(`${label}: row ${n} duplicates MOS "${r.MOS}".`);
      else seen.add(r.MOS);
    });
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Normalization — produce typed domain objects from raw CSV rows
// ---------------------------------------------------------------------------

export function normalizeRoster(rows: Record<string, string>[]): RosterRow[] {
  return rows.map((r) => {
    const o: Record<string, string> = {};
    for (const k of Object.keys(r)) o[k] = typeof r[k] === "string" ? r[k].trim() : r[k];
    o.DRRSStatus = (o.DRRSStatus || "").toUpperCase();
    o.DeployableFlag = (o.DeployableFlag || "").toUpperCase();
    o.Component = (o.Component || "").toUpperCase();
    o.Service = (o.Service || "").toUpperCase();
    return o as unknown as RosterRow;
  });
}

export function normalizeStructure(rows: Record<string, string>[]): StructureRow[] {
  return rows.map((r) => ({
    Unit: (r.Unit || "").trim(),
    UnitName: (r.UnitName || "").trim(),
    BMOS: (r.BMOS || "").trim(),
    PayGrade: (r.PayGrade || "").trim().toUpperCase(),
    Authorized: parseInt(r.Authorized, 10) || 0,
    BilletDescription: (r.BilletDescription || "").trim(),
  }));
}

export function normalizeCritical(rows: Record<string, string>[]): CriticalRow[] {
  return rows
    .map((r) => ({
      MOS: (r.MOS || "").trim(),
      Description: (r.Description || "").trim(),
      Category: (r.Category || "").trim(),
      UnitType: (r.UnitType || "").trim(),
    }))
    .filter((r) => r.MOS);
}
