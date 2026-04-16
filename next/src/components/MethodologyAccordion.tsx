"use client";

import { useState } from "react";
import { BookOpen, ChevronRight, ChevronDown } from "lucide-react";

interface Block {
  num: string;
  title: string;
  content: React.ReactNode;
}

const blocks: Block[] = [
  {
    num: "01", title: "What P-Level Measures",
    content: (
      <p>P-Level is the personnel readiness rating for your unit per <strong>MCO 3000.13B DRRS Marine Corps Readiness Reporting paragraph 7c</strong>. It is the lower of two percentages: Personnel Strength and Critical MOS. The lower (worse) band wins. P-1 is best, P-4 is worst. P-5 reserves for non-reportable status. P-6 only by direction of HQMC PP&amp;O.</p>
    ),
  },
  {
    num: "02", title: "The Two Formulas",
    content: (
      <>
        <div className="my-2 border-l-2 border-[var(--color-accent)] bg-[var(--color-bg)] p-3">
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Personnel Strength</div>
          <code className="mt-1 block font-mono text-xs text-[var(--color-ink)]">((Assigned + Attached) &minus; (Detached + Non-Deployable + IA/JIA)) / Structure Strength &times; 100</code>
        </div>
        <div className="my-2 border-l-2 border-[var(--color-accent)] bg-[var(--color-bg)] p-3">
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Critical MOS</div>
          <code className="mt-1 block font-mono text-xs text-[var(--color-ink)]">((Crit Assigned + Attached) &minus; (Crit Detached + Crit Non-Dep + Crit IA/JIA)) / Crit Structure Strength &times; 100</code>
        </div>
        <p className="text-xs text-[var(--color-muted)]">&ldquo;Assigned + Attached&rdquo; is the total unit headcount on books. Detached, Non-Deployable, and IA/JIA are subtracted from that total. Whichever metric scores lower wins. Critical MOS fill is computed by greedy matching (BMOS-primary then PMOS-secondary, exact grade preferred then &plusmn;1).</p>
      </>
    ),
  },
  {
    num: "03", title: "Band Tables",
    content: (
      <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Personnel Strength</div>
            <table className="mt-1 w-full font-mono text-xs"><tbody>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3">P-1</td><td>90% to 100%</td></tr>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3">P-2</td><td>80% to 89%</td></tr>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3">P-3</td><td>70% to 79%</td></tr>
              <tr><td className="py-1 pr-3">P-4</td><td>0% to 69%</td></tr>
            </tbody></table>
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Critical MOS</div>
            <table className="mt-1 w-full font-mono text-xs"><tbody>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3">P-1</td><td>85% to 100%</td></tr>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3">P-2</td><td>75% to 84%</td></tr>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3">P-3</td><td>65% to 74%</td></tr>
              <tr><td className="py-1 pr-3">P-4</td><td>0% to 64%</td></tr>
            </tbody></table>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--color-muted)]">Critical MOS thresholds are 5 points lower at every band because rare skills are harder to fill.</p>
      </>
    ),
  },
  {
    num: "04", title: "Manual Calculation \u2014 Six Steps",
    content: (
      <ol className="ml-4 list-decimal space-y-2 text-xs text-[var(--color-body)]">
        <li><strong className="text-[var(--color-accent)]">Pull T/O Authorized.</strong> From TFSMS, sum all authorized billets for your UIC. Pull the critical MOS subset. Both numbers stay fixed during the report period.</li>
        <li><strong className="text-[var(--color-accent)]">Pull the Roster.</strong> From AAA via Cognos. Include detached Marines for visibility. Exclude contractors and civilians unless T/O authorizes.</li>
        <li><strong className="text-[var(--color-accent)]">Classify Each Marine.</strong> Tag with one DRRS state: ASSIGNED, ATTACHED, DETACHED, IA, or JIA. Flag deployability with DLC code.</li>
        <li><strong className="text-[var(--color-accent)]">Compute the Numerator.</strong> Start with Assigned + Attached (total on books). Subtract Detached, Non-Deployable, IA, and JIA. Per MCO 3000.13B para 7c.</li>
        <li><strong className="text-[var(--color-accent)]">Divide and Multiply.</strong> Numerator / Authorized &times; 100. Repeat for Critical MOS subset.</li>
        <li><strong className="text-[var(--color-accent)]">Map to Band and Take the Lower.</strong> Your final P-Level is the lower (worse) of the two bands.</li>
      </ol>
    ),
  },
  {
    num: "05", title: "Critical MOS Fill Rules",
    content: (
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        <dt className="font-bold uppercase text-[var(--color-accent)]">BIC First</dt><dd className="text-[var(--color-body)]">Marine must be assigned to a Billet Identification Code on the unit&apos;s T/O.</dd>
        <dt className="font-bold uppercase text-[var(--color-accent)]">BMOS Primary</dt><dd className="text-[var(--color-body)]">If the Billet MOS is on the critical list, the fill counts toward critical MOS.</dd>
        <dt className="font-bold uppercase text-[var(--color-accent)]">PMOS Secondary</dt><dd className="text-[var(--color-body)]">If BMOS is not critical but PMOS is, the Marine fills the critical PMOS gap.</dd>
        <dt className="font-bold uppercase text-[var(--color-accent)]">&plusmn;1 Grade</dt><dd className="text-[var(--color-body)]">A Marine within one paygrade of the authorized grade counts. An E5 in an E6 billet counts; an E5 in an E7 billet does not.</dd>
        <dt className="font-bold uppercase text-[var(--color-accent)]">No Double Count</dt><dd className="text-[var(--color-body)]">A single Marine fills exactly one billet.</dd>
        <dt className="font-bold uppercase text-[var(--color-accent)]">Qualified</dt><dd className="text-[var(--color-body)]">The Marine must hold the required MOS qualification, not the title alone.</dd>
      </dl>
    ),
  },
  {
    num: "06", title: "Who Gets Excluded",
    content: (
      <ul className="ml-4 list-disc space-y-1 text-xs text-[var(--color-body)]">
        <li>Contractors. Never count toward T/O strength or critical fill.</li>
        <li>Civilian employees. Excluded unless the T/O authorizes them.</li>
        <li>IRR Marines on inactive status.</li>
        <li>Marines with EAS within 90 days. Typically flagged Non-Deployable per DLC code B.</li>
        <li>Cadets and trainees not yet T/O assigned.</li>
      </ul>
    ),
  },
  {
    num: "07", title: "Worked Example",
    content: (
      <>
        <div className="mb-3 border-l-2 border-[var(--color-accent-hi)] bg-[var(--color-bg)] p-3 text-xs text-[var(--color-body)]"><strong>Scenario:</strong> 50-billet detachment, 12 critical billets.</div>
        <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Roster</div>
            <table className="mt-1 w-full font-mono text-xs"><tbody>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-0.5">Assigned + Attached (total on books)</td><td className="text-right">50</td></tr>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-0.5">Detached</td><td className="text-right">2</td></tr>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-0.5">Non-Deployable (DLC=N)</td><td className="text-right">4</td></tr>
              <tr><td className="py-0.5">IA / JIA</td><td className="text-right">0</td></tr>
            </tbody></table>
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Critical Fill (12 billets)</div>
            <table className="mt-1 w-full font-mono text-xs"><tbody>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-0.5">BMOS exact-grade</td><td className="text-right">9</td></tr>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-0.5">BMOS &plusmn;1 grade</td><td className="text-right">1</td></tr>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-0.5">PMOS exact-grade</td><td className="text-right">1</td></tr>
              <tr className="border-b border-[var(--color-elevated)]"><td className="py-0.5">PMOS &plusmn;1 grade</td><td className="text-right">0</td></tr>
              <tr><td className="py-0.5">Unfilled gaps</td><td className="text-right">1</td></tr>
            </tbody></table>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="border-l-2 border-[var(--color-accent)] bg-[var(--color-bg)] p-3">
            <div className="font-mono text-xs uppercase text-[var(--color-muted)]">Personnel Strength</div>
            <code className="block font-mono text-xs text-[var(--color-ink)]">Numerator = 50 &minus; (Det(2) + NonDep(4) + IA/JIA(0)) = 50 &minus; 6 = 44 &rarr; 44/50 = <strong>88.0%</strong> &rarr; P-2</code>
          </div>
          <div className="border-l-2 border-[var(--color-accent)] bg-[var(--color-bg)] p-3">
            <div className="font-mono text-xs uppercase text-[var(--color-muted)]">Critical MOS</div>
            <code className="block font-mono text-xs text-[var(--color-ink)]">Filled = 9+1+1+0 = 11 &rarr; 11/12 = <strong>91.7%</strong> &rarr; P-1</code>
          </div>
          <div className="border-l-2 border-[var(--color-accent-hi)] bg-[var(--color-bg)] p-3">
            <div className="font-mono text-xs uppercase text-[var(--color-muted)]">Final P-Level</div>
            <code className="block font-mono text-xs text-[var(--color-ink)]">Lower of P-2 and P-1 = <strong>P-2</strong></code>
            <p className="mt-1 text-xs text-[var(--color-muted)]">Binding: Personnel Strength. Critical MOS is healthy at P-1, but PS drags the unit to P-2.</p>
          </div>
        </div>
      </>
    ),
  },
  {
    num: "08", title: "System Architecture & Compliance Posture",
    content: (
      <>
        <p className="text-xs text-[var(--color-body)]">
          This tool is a <strong>static client-side application</strong>. All CSV parsing and calculation execute in the user&apos;s browser. No personnel data leaves the machine. This architecture determines which security controls apply and which are not applicable.
        </p>
        <div className="mt-3 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Architecture</div>
        <table className="mt-1 w-full text-xs"><tbody>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">Platform</td><td className="text-[var(--color-body)]">Static web app — no backend server, no database, no API endpoints</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">Hosting</td><td className="text-[var(--color-body)]">GitHub Pages or any static HTTP server (ADR-1)</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">Persistence</td><td className="text-[var(--color-body)]">Browser localStorage only (operator preferences). No PII/CUI persisted.</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">Encryption</td><td className="text-[var(--color-body)]">Optional AES-256-GCM + PBKDF2-SHA256 for exported profile JSON (Web Crypto API)</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">Authentication</td><td className="text-[var(--color-body)]">None — access control inherited from hosting environment</td></tr>
          <tr><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">DoD Network</td><td className="text-[var(--color-body)]">None — no connection to NIPRNET, SIPRNET, MCEN, or any DoD IS</td></tr>
        </tbody></table>

        <div className="mt-4 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">NIST SP 800-171r3 Control Applicability</div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">Controls marked N/A are not applicable due to the static client-side architecture. They become required if the system transitions to a server-backed deployment.</p>
        <table className="mt-1 w-full text-xs"><tbody>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">Row Level Security / multi-tenant isolation</td><td className="font-bold text-[var(--color-muted)]">N/A</td><td className="text-[var(--color-mute-2)]">No database</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">Multi-Factor Authentication (03.05.02)</td><td className="font-bold text-[var(--color-muted)]">N/A</td><td className="text-[var(--color-mute-2)]">No auth system</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">Session management (03.05.03)</td><td className="font-bold text-[var(--color-muted)]">N/A</td><td className="text-[var(--color-mute-2)]">Stateless static page</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">Credential storage</td><td className="font-bold text-[var(--color-muted)]">N/A</td><td className="text-[var(--color-mute-2)]">No credentials</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">TLS 1.2+ in transit (03.13.08)</td><td className="font-bold text-[var(--color-p1)]">Inherited</td><td className="text-[var(--color-mute-2)]">GitHub Pages HTTPS</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">Encryption at rest (03.13.16)</td><td className="font-bold text-[var(--color-muted)]">N/A</td><td className="text-[var(--color-mute-2)]">No server-side data at rest</td></tr>
          <tr><td className="py-1 pr-4 text-[var(--color-body)]">Audit log retention</td><td className="font-bold text-[var(--color-muted)]">N/A</td><td className="text-[var(--color-mute-2)]">No server-side logs</td></tr>
        </tbody></table>

        <div className="mt-4 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Classification</div>
        <table className="mt-1 w-full text-xs"><tbody>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">System Type</td><td className="text-[var(--color-body)]">Proof of Concept (PoC) per DoDI 8500.01</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">Data Classification</td><td className="text-[var(--color-body)]">UNCLASSIFIED — synthetic data only, zero CUI/PII with sample data</td></tr>
          <tr><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">ATO Status</td><td className="text-[var(--color-body)]">Not required for PoC with synthetic data. Required before any operational use with real data.</td></tr>
        </tbody></table>
      </>
    ),
  },
  {
    num: "\u00A7", title: "Source Documents",
    content: (
      <ul className="ml-4 list-disc space-y-1 text-xs text-[var(--color-body)]">
        <li>MCO 3000.13B DRRS Marine Corps Readiness Reporting, paragraph 7c</li>
        <li>MARADMIN 518-21 DRRS-MC Consolidation to DRRS</li>
        <li>Commander&apos;s Readiness Handbook (16 SEP 2020)</li>
        <li>Personnel Readiness SHO/MOC (Updated OCT 2025)</li>
      </ul>
    ),
  },
];

export function MethodologyAccordion() {
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());

  function toggle(num: string) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num); else next.add(num);
      return next;
    });
  }
  function expandAll() { setOpenSet(new Set(blocks.map((b) => b.num))); }
  function collapseAll() { setOpenSet(new Set()); }

  return (
    <section className="mb-8 border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--color-elevated)] pb-3">
        <h2 className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-[var(--color-accent-head)]">
          <BookOpen size={16} strokeWidth={1.5} className="text-[var(--color-accent)]" />
          Methodology
        </h2>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-2 py-0.5 font-mono text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]">Expand All</button>
          <button onClick={collapseAll} className="px-2 py-0.5 font-mono text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]">Collapse All</button>
        </div>
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        How P-Level is calculated. Reference for manual computation or audit. Click any section to expand.
      </p>

      <div className="mt-4">
        {blocks.map((block) => {
          const isOpen = openSet.has(block.num);
          return (
            <div key={block.num} className="border-t border-[var(--color-border)] first:border-t-0">
              <button
                onClick={() => toggle(block.num)}
                className="flex w-full items-center gap-4 py-3 text-left"
                aria-expanded={isOpen}
              >
                <span className="flex-shrink-0 bg-[var(--color-elevated)] px-3 py-1.5 text-center font-mono text-sm font-semibold text-[var(--color-accent)]">
                  {block.num}
                </span>
                <span className={`text-sm font-semibold ${isOpen ? "text-[var(--color-accent)]" : "text-[var(--color-ink)]"} transition-colors`}>
                  {block.title}
                </span>
                <span className="ml-auto text-[var(--color-mute-2)]">
                  {isOpen
                    ? <ChevronDown size={16} strokeWidth={1.5} />
                    : <ChevronRight size={16} strokeWidth={1.5} />}
                </span>
              </button>
              {isOpen && (
                <div className="pb-4 pl-[calc(theme(spacing.3)*2+theme(spacing.4)+1.5rem)]">
                  {block.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
