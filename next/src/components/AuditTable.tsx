"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { AuditRow, FillSource, MatchType } from "@/lib/plevel";

function matchBadge(source: FillSource, matchType: MatchType): { label: string; cls: string } {
  if (source === "BMOS" && matchType === "exact") return { label: "B\u00b7EX", cls: "bg-emerald-900/40 text-emerald-400 border-emerald-700" };
  if (source === "BMOS") return { label: "B\u00b7\u00b11", cls: "bg-yellow-900/30 text-yellow-400 border-yellow-700" };
  if (source === "PMOS" && matchType === "exact") return { label: "P\u00b7EX", cls: "bg-blue-900/30 text-blue-400 border-blue-700" };
  return { label: "P\u00b7\u00b11", cls: "bg-purple-900/30 text-purple-400 border-purple-700" };
}

interface Props {
  audit: AuditRow[];
}

export function AuditTable({ audit }: Props) {
  const [open, setOpen] = useState(false);

  if (!audit.length) return null;

  const filled = audit.filter((r) => r.Filled).length;
  const unfilled = audit.length - filled;

  return (
    <div className="mt-6 border-t border-[var(--color-border)] pt-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-baseline gap-2 text-left"
        aria-expanded={open}
      >
        {open
          ? <ChevronDown size={14} strokeWidth={1.5} className="text-[var(--color-mute-2)]" />
          : <ChevronRight size={14} strokeWidth={1.5} className="text-[var(--color-mute-2)]" />
        }
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent-head)]">
          Per-Billet Audit Trail
        </span>
        <span className="font-mono text-xs text-[var(--color-mute-2)]">
          {filled} filled, {unfilled} unfilled &mdash; {audit.length} billets
        </span>
      </button>

      {open && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                <th className="py-1.5 pr-2">MOS</th>
                <th className="py-1.5 pr-2">Auth Grade</th>
                <th className="py-1.5 pr-2">BIC</th>
                <th className="py-1.5 pr-2">Status</th>
                <th className="py-1.5 pr-2">Filler (EDIPI / Name)</th>
                <th className="py-1.5 pr-2">Grade</th>
                <th className="py-1.5 pr-2">BMOS / PMOS</th>
                <th className="py-1.5">Match</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-[var(--color-elevated)] ${
                    row.Filled ? "text-[var(--color-ink-soft)]" : "bg-[var(--color-p4)]/5 text-[var(--color-muted)]"
                  }`}
                >
                  <td className="py-1 pr-2">{row.MOS}</td>
                  <td className="py-1 pr-2">{row.AuthorizedPayGrade}</td>
                  <td className="py-1 pr-2 text-[var(--color-muted)]">{row.BIC || "\u2014"}</td>
                  <td className="py-1 pr-2">
                    {row.Filled ? (
                      <span className="inline-block border border-emerald-700 bg-emerald-900/30 px-1.5 py-px text-emerald-400">FILLED</span>
                    ) : (
                      <span className="inline-block border border-[var(--color-p4)] bg-[var(--color-p4)]/20 px-1.5 py-px text-[var(--color-p4)]">UNFILLED</span>
                    )}
                  </td>
                  <td className="py-1 pr-2">
                    {row.Filled
                      ? `${row.FillerEDIPI} \u00b7 ${row.FillerName}`
                      : <span className="text-[var(--color-mute-3)]">&mdash;</span>}
                  </td>
                  <td className="py-1 pr-2">
                    {row.Filled ? row.FillerPayGrade : <span className="text-[var(--color-mute-3)]">&mdash;</span>}
                  </td>
                  <td className="py-1 pr-2">
                    {row.Filled
                      ? `${row.FillerBMOS} / ${row.FillerPMOS}`
                      : <span className="text-[var(--color-mute-3)]">&mdash;</span>}
                  </td>
                  <td className="py-1">
                    {row.Filled && row.FillSource && row.MatchType ? (
                      (() => {
                        const b = matchBadge(row.FillSource, row.MatchType);
                        return <span className={`inline-block border px-1.5 py-px ${b.cls}`}>{b.label}</span>;
                      })()
                    ) : (
                      <span className="text-[var(--color-mute-3)]">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
