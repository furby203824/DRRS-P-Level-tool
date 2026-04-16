"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadHistory, clearHistory as clearHistoryStorage, exportHistoryPayload, type HistoryEntry } from "@/lib/history";
import { formatDateDDMMMYY, parseAsOfDate } from "@/lib/brief";

function triggerDownload(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const BAND_BORDER: Record<number, string> = {
  1: "border-l-[var(--color-p1)]",
  2: "border-l-[var(--color-p2)]",
  3: "border-l-[var(--color-p3)]",
  4: "border-l-[var(--color-p4)]",
};
const BAND_BG: Record<number, string> = {
  1: "bg-[var(--color-p1)]",
  2: "bg-[var(--color-p2)]",
  3: "bg-[var(--color-p3)]",
  4: "bg-[var(--color-p4)]",
};

interface Props {
  /** Incremented by the parent whenever a new snapshot is saved, so we re-read LocalStorage. */
  refreshKey: number;
}

export function HistoryPanel({ refreshKey }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [statusMsg, setStatusMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function flash(msg: string) {
    setStatusMsg(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatusMsg(""), 2500);
  }

  useEffect(() => {
    setEntries(loadHistory());
  }, [refreshKey]);

  const doExport = useCallback(() => {
    if (!entries.length) { flash("No history to export"); return; }
    const stamp = formatDateDDMMMYY(new Date()).toLowerCase();
    triggerDownload(`plevel-history-${stamp}.json`, "application/json", exportHistoryPayload(entries));
    flash(`Exported ${entries.length} entries`);
  }, [entries]);

  const doClear = useCallback(() => {
    if (!confirm("Clear the local calculation history?")) return;
    clearHistoryStorage();
    setEntries([]);
    flash("History cleared");
  }, []);

  return (
    <section className="mb-8 border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--color-elevated)] pb-3">
        <h2 className="font-mono text-sm uppercase tracking-widest text-[var(--color-accent-head)]">
          Calculation History
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={doExport} className="px-2 py-1 font-mono text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]">
            Export History
          </button>
          <button onClick={doClear} className="px-2 py-1 font-mono text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]">
            Clear
          </button>
          <span className="font-mono text-xs text-[var(--color-accent-head)]" aria-live="polite">{statusMsg}</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Last 30 aggregate snapshots. No EDIPIs — those live only in per-run exports.
      </p>

      {entries.length === 0 ? (
        <p className="mt-3 text-xs italic text-[var(--color-mute-2)]">No history yet. Run a calculation to populate.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                <th className="py-1.5 pr-3">As-Of</th>
                <th className="py-1.5 pr-3">UIC</th>
                <th className="py-1.5 pr-3">Unit</th>
                <th className="py-1.5 pr-3">P-Level</th>
                <th className="py-1.5 pr-3 text-right">PS %</th>
                <th className="py-1.5 pr-3 text-right">CM %</th>
                <th className="py-1.5 pr-3">Driver</th>
                <th className="py-1.5">Saved (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const asOfLabel = formatDateDDMMMYY(parseAsOfDate(e.asOfDate) ?? new Date(e.savedAt));
                const savedLabel = e.savedAt ? new Date(e.savedAt).toISOString().slice(0, 16).replace("T", " ") : "";
                const band = e.result.finalBand;
                return (
                  <tr key={i} className={`border-b border-[var(--color-elevated)] border-l-3 ${BAND_BORDER[band] ?? ""} text-[var(--color-ink-soft)]`}>
                    <td className="py-1 pr-3">{asOfLabel}</td>
                    <td className="py-1 pr-3">{e.unit.uic || "NOUIC"}</td>
                    <td className="py-1 pr-3 text-[var(--color-body)]">{e.unit.name}</td>
                    <td className="py-1 pr-3">
                      <span className={`inline-block px-1.5 py-px text-white ${BAND_BG[band] ?? "bg-[var(--color-mute-3)]"}`}>
                        {e.result.pLevel}
                      </span>
                    </td>
                    <td className="py-1 pr-3 text-right">{e.result.personnel.pct.toFixed(1)}%</td>
                    <td className="py-1 pr-3 text-right">{e.result.critical.pct.toFixed(1)}%</td>
                    <td className="py-1 pr-3 text-[var(--color-muted)]">{e.result.driver}</td>
                    <td className="py-1 text-[var(--color-mute-2)]">{savedLabel}Z</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
