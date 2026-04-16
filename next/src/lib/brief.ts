/**
 * Readiness brief builder (BLUF / Actions / Results format).
 *
 * Pure functions — no DOM. Ported from the inline buildReadinessBrief
 * in assets/js/app.js.
 */

import type { CalcResult } from "./plevel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnitProfile {
  uic: string;
  name: string;
  asOf: string; // YYYY-MM-DD or ""
}

export interface BriefOptions {
  actions?: string;
  results?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const ACTIONS_PLACEHOLDER =
  "[S-1 to fill: manning requests submitted, recruiting pipeline engagement, " +
  "MOS school quotas requested, critical billet swaps proposed.]";

export const RESULTS_PLACEHOLDER =
  "[S-1 to fill: expected P-Level recovery date, dependencies, risk to mission.]";

/**
 * DRRS Remarks character limit. Conservative default; S-3 should verify
 * against the DRRS-MC field definition.
 */
export const DRRS_REMARKS_LIMIT = 2000;

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

export function formatDateDDMMMYY(d: Date): string {
  const dd = d.getDate().toString().padStart(2, "0");
  const yy = (d.getFullYear() % 100).toString().padStart(2, "0");
  return `${dd}${MONTHS[d.getMonth()]}${yy}`;
}

export function parseAsOfDate(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}

// ---------------------------------------------------------------------------
// Reason code suggestion
// ---------------------------------------------------------------------------

export function suggestReasonCode(result: CalcResult): string | null {
  if (result.band.finalBand === 1) return null;
  if (result.band.cBand > result.band.pBand) return "S-MOS-QUAL";
  return "S-MANPOWER";
}

// ---------------------------------------------------------------------------
// Brief builder
// ---------------------------------------------------------------------------

export function buildReadinessBrief(
  result: CalcResult,
  unit: UnitProfile,
  asOfDate: Date,
  computedAt: Date,
  opts?: BriefOptions,
): string {
  const p = result.personnel;
  const c = result.critical;
  const s = c.fillSummary;
  const asOfStr = formatDateDDMMMYY(asOfDate);
  const unitUic = unit.uic || "NOUIC";
  const unitLine = unit.name
    ? `UNIT: ${unitUic} - ${unit.name.toUpperCase()}`
    : `UNIT: ${unitUic}`;

  const pBand = result.band.pBand;
  const cBand = result.band.cBand;
  const driverShort =
    pBand > cBand ? "personnel strength"
    : cBand > pBand ? "critical MOS fill"
    : "personnel and critical MOS aligned";

  const bluf =
    `BLUF: ${result.pLevel} at ${p.pct.toFixed(1)}% personnel strength ` +
    `(${p.effective}/${p.authorized}); critical MOS fill ` +
    `${c.pct.toFixed(1)}% (${c.filled}/${c.authorized} billets). ` +
    `Binding: ${driverShort}.`;

  const reasonCode = suggestReasonCode(result);
  const reasonLine = reasonCode
    ? `REASON CODE (SUGGESTED): ${reasonCode}`
    : `REASON CODE: N/A (P-1)`;

  const policyLine = result.options.countLimitedAsNonDeployable
    ? "POLICY: Limited Duty (DLC=L) counted as non-deployable."
    : "POLICY: Limited Duty (DLC=L) counted as effective.";

  const actions = opts?.actions || ACTIONS_PLACEHOLDER;
  const results = opts?.results || RESULTS_PLACEHOLDER;

  return [
    "DRRS PERSONNEL READINESS",
    unitLine,
    `AS OF: ${asOfStr}`,
    "",
    bluf,
    reasonLine,
    "",
    "METRICS",
    `  PERSONNEL STRENGTH: ${p.pct.toFixed(1)}% [P-${pBand}] (${p.effective} EFFECTIVE / ${p.authorized} AUTHORIZED)`,
    `    ASG ${p.assigned} / ATT ${p.attached} / NON-DEP ${p.nonDeployable} / LTD ${p.limited} / DET ${p.detached} / IA ${p.ia} / JIA ${p.jia}`,
    `  CRITICAL MOS: ${c.pct.toFixed(1)}% [P-${cBand}] (${c.filled} / ${c.authorized} BILLETS)`,
    `    BMOS EXACT ${s.exactBMOS} / BMOS +/-1 ${s.flexBMOS} / PMOS EXACT ${s.exactPMOS} / PMOS +/-1 ${s.flexPMOS} / GAPS ${s.unfilled}`,
    "",
    `ACTIONS: ${actions}`,
    "",
    `RESULTS: ${results}`,
    "",
    policyLine,
    `EXCLUDED: ${result.excludedContractors} contractor row(s).`,
    "REF: MCO 3000.13B para 7c.",
    `COMPUTED: ${computedAt.toISOString()} by DRRS P-Level Calculator.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// DRRS-Ready sanitizer
// ---------------------------------------------------------------------------

export function sanitizeForDRRS(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2192\u2794\u27A1]/g, "->")
    .replace(/[\u00A0\u2007\u202F\u2009\u200A]/g, " ")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "?");
}
