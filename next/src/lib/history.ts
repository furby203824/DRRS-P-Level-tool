/**
 * Calculation history — aggregate snapshots in LocalStorage.
 *
 * Deliberately excludes per-billet audit data (EDIPIs / names) — those
 * stay only in per-run exports. Entries are enough for trend
 * visualization and "on this date, this UIC was P-X" audit questions.
 */

import type { CalcResult } from "./plevel";
import { formatDateDDMMMYY, parseAsOfDate } from "./brief";

const STORAGE_KEY = "drrs-plevel.history.v1";
const MAX_ENTRIES = 30;

export interface HistoryEntry {
  savedAt: string;
  asOfDate: string;
  unit: { uic: string; name: string };
  result: {
    pLevel: string;
    finalBand: number;
    pBand: number;
    cBand: number;
    driver: string;
    personnel: { pct: number; effective: number; authorized: number };
    critical: { pct: number; filled: number; authorized: number };
  };
  options: { countLimitedAsNonDeployable: boolean };
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* quota or privacy mode */ }
}

export function snapshotFromResult(
  result: CalcResult,
  unit: { uic: string; name: string },
  asOfDate: string,
): HistoryEntry {
  const p = result.personnel;
  const c = result.critical;
  return {
    savedAt: new Date().toISOString(),
    asOfDate,
    unit: { uic: unit.uic || "NOUIC", name: unit.name || "" },
    result: {
      pLevel: result.pLevel,
      finalBand: result.band.finalBand,
      pBand: result.band.pBand,
      cBand: result.band.cBand,
      driver: result.band.driver,
      personnel: { pct: p.pct, effective: p.effective, authorized: p.authorized },
      critical: { pct: c.pct, filled: c.filled, authorized: c.authorized },
    },
    options: result.options,
  };
}

/** Save (or update) a snapshot. Dedup key is (UIC, asOfDate). */
export function saveSnapshot(entry: HistoryEntry): HistoryEntry[] {
  const entries = loadHistory();
  const keyOf = (e: HistoryEntry) => `${e.unit.uic}|${e.asOfDate}`;
  const key = keyOf(entry);
  const idx = entries.findIndex((e) => keyOf(e) === key);
  if (idx >= 0) entries[idx] = entry;
  else entries.unshift(entry);
  entries.sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  writeHistory(entries);
  return entries;
}

export function clearHistory(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
}

export function exportHistoryPayload(entries: HistoryEntry[]): string {
  return JSON.stringify({
    schema: "drrs-plevel-history.v1",
    exportedAt: new Date().toISOString(),
    reference: "MCO 3000.13B para 7c",
    note: "Aggregate metrics only. No EDIPIs or per-billet detail.",
    entries,
  }, null, 2);
}

export { STORAGE_KEY as HISTORY_STORAGE_KEY };
