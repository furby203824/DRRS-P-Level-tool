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
    num: "09", title: "Data Classification Reference",
    content: (
      <>
        <p className="text-xs text-[var(--color-body)]">
          CUI/PII determination for every data field in the application schema per DoDI 5200.48, 32 CFR Part 2002, and DoDI 5400.11. This analysis applies to the <strong>synthetic sample data</strong> shipped with the PoC. If real data is loaded, re-evaluate immediately.
        </p>

        <div className="mt-3 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Alpha Roster Fields</div>
        <div className="mt-1 overflow-x-auto">
          <table className="w-full text-xs"><thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted)]">
              <th className="py-1 pr-3">Field</th><th className="py-1 pr-3">CUI</th><th className="py-1 pr-3">PII</th><th className="py-1">Notes</th>
            </tr>
          </thead><tbody>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 font-mono text-[var(--color-accent)]">EDIPI</td><td className="pr-3 text-[var(--color-body)]">No</td><td className="pr-3 text-[var(--color-p3)]">Sensitive (if real)</td><td className="text-[var(--color-mute-2)]">Synthetic: prefixed 99. Real EDIPIs are linkable to identity.</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 font-mono text-[var(--color-accent)]">LastName / FirstName / MI</td><td className="pr-3 text-[var(--color-body)]">No</td><td className="pr-3 text-[var(--color-p2)]">Non-Sensitive</td><td className="text-[var(--color-mute-2)]">Synthetic placeholders. Real names alone are Non-Sensitive PII per DoDI 5400.11.</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 font-mono text-[var(--color-accent)]">Rank / PayGrade / Service / Component</td><td className="pr-3 text-[var(--color-body)]">No</td><td className="pr-3 text-[var(--color-body)]">Not PII</td><td className="text-[var(--color-mute-2)]">Organizational attributes, not individually identifying.</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 font-mono text-[var(--color-accent)]">Sex</td><td className="pr-3 text-[var(--color-body)]">No</td><td className="pr-3 text-[var(--color-p2)]">Non-Sensitive (if combined)</td><td className="text-[var(--color-mute-2)]">Alone: not identifying. Combined with name + unit: linkable.</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 font-mono text-[var(--color-accent)]">Unit / UnitName / ParentUIC</td><td className="pr-3 text-[var(--color-body)]">No</td><td className="pr-3 text-[var(--color-body)]">Not PII</td><td className="text-[var(--color-mute-2)]">Organizational identifiers.</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 font-mono text-[var(--color-accent)]">BIC / BMOS / PMOS / BilletTitle</td><td className="pr-3 text-[var(--color-body)]">No</td><td className="pr-3 text-[var(--color-body)]">Not PII</td><td className="text-[var(--color-mute-2)]">Billet and qualification codes.</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 font-mono text-[var(--color-accent)]">Category / DutyStatus / DLC</td><td className="pr-3 text-[var(--color-body)]">No</td><td className="pr-3 text-[var(--color-body)]">Not PII</td><td className="text-[var(--color-mute-2)]">Status and limitation codes.</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 font-mono text-[var(--color-accent)]">DRRSStatus / DeployableFlag</td><td className="pr-3 text-[var(--color-body)]">No</td><td className="pr-3 text-[var(--color-body)]">Not PII</td><td className="text-[var(--color-mute-2)]">Readiness status codes.</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 font-mono text-[var(--color-accent)]">EAS / EDD</td><td className="pr-3 text-[var(--color-body)]">No</td><td className="pr-3 text-[var(--color-p2)]">Non-Sensitive (if real)</td><td className="text-[var(--color-mute-2)]">Dates combined with name become linkable PII.</td></tr>
            <tr><td className="py-1 pr-3 font-mono text-[var(--color-accent)]">Location / StartDate / EndDate / AttachedFromUIC / DetachedToUIC / IAJIATasking</td><td className="pr-3 text-[var(--color-body)]">No</td><td className="pr-3 text-[var(--color-body)]">Not PII</td><td className="text-[var(--color-mute-2)]">Organizational / movement data.</td></tr>
          </tbody></table>
        </div>

        <div className="mt-3 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">T/O Structure &amp; Critical MOS Fields</div>
        <p className="mt-1 text-xs text-[var(--color-body)]">
          All fields (Unit, UnitName, BMOS, PayGrade, Authorized, BilletDescription, MOS, Description, Category, UnitType) &mdash; <strong>No CUI, No PII</strong>. Organizational T/O and reference data only.
        </p>

        <div className="mt-4 border-l-4 border-[var(--color-p1)] bg-[var(--color-p1)]/10 px-3 py-2 text-xs text-[var(--color-body)]">
          <strong>PoC Determination:</strong> With synthetic data (EDIPIs prefixed 99, placeholder names), zero fields contain real CUI or real PII. If an operator loads a real alpha roster, fields EDIPI, LastName, FirstName, MI, Sex, EAS, and EDD become PII. At that point the system crosses the PoC boundary.
        </div>
      </>
    ),
  },
  {
    num: "10", title: "Data Schema Provenance",
    content: (
      <>
        <p className="text-xs text-[var(--color-body)]">
          Per DD Form 2875 instructions and DoDI 8500.01, the highest-risk compliance question for this application is whether the data schema was derived from a DoD Information System accessed under a SAAR.
        </p>

        <div className="mt-3 border-l-4 border-[var(--color-p3)] bg-[var(--color-p3)]/10 px-3 py-2">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-[var(--color-p3)]">Status: Undetermined</div>
          <p className="mt-1 text-xs text-[var(--color-body)]">
            The application schema uses field names consistent with AAA (Cognos) and TFSMS exports (e.g., EDIPI, BMOS, PMOS, PayGrade, DRRSStatus). Whether the schema was independently designed using publicly available MCO 3000.13B definitions, or was derived from direct access to a DoD IS under a DD Form 2875, has not been formally determined in writing.
          </p>
        </div>

        <div className="mt-3 text-xs text-[var(--color-body)]">
          <strong>Required action:</strong> Obtain a written determination from qualified legal counsel (JAG) before any transition to real data or real users. For PoC purposes with synthetic data only, development may continue.
        </div>

        <div className="mt-3 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Determination Record (fill when obtained)</div>
        <table className="mt-1 w-full text-xs"><tbody>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">Determination</td><td className="text-[var(--color-mute-2)]">Clean / Flagged / Undetermined</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">Authority</td><td className="text-[var(--color-mute-2)]">Name, position, date</td></tr>
          <tr><td className="py-1 pr-4 font-bold text-[var(--color-accent)]">Basis</td><td className="text-[var(--color-mute-2)]">Summary of reasoning</td></tr>
        </tbody></table>

        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Reference: DD Form 2875 Instructions (2020 revision), DoDI 8500.01 Section 2, SYSTEM PROMPT Part 2 Item 2.
        </p>
      </>
    ),
  },
  {
    num: "11", title: "Additional Compliance Domains",
    content: (
      <>
        <p className="text-xs text-[var(--color-body)]">
          Compliance domains beyond NIST SP 800-171r3 that apply to any DoD-affiliated application, including PoC systems.
        </p>

        <div className="mt-3 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Accessibility (Section 508 / WCAG 2.1)</div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">Authority: Section 508 of the Rehabilitation Act; 36 CFR Part 1194; DoDI 8500.01 Section 3.</p>
        <table className="mt-1 w-full text-xs"><tbody>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">Skip-to-content link</td><td className="font-bold text-[var(--color-p1)]">Implemented</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">Semantic HTML (headings, landmarks, fieldsets, labels)</td><td className="font-bold text-[var(--color-p1)]">Implemented</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">ARIA live regions on dynamic status elements</td><td className="font-bold text-[var(--color-p1)]">Implemented</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">Keyboard navigability (standard HTML form controls)</td><td className="font-bold text-[var(--color-p1)]">Implemented</td></tr>
          <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-4 text-[var(--color-body)]">Band colors supplemented by text labels (not color-only)</td><td className="font-bold text-[var(--color-p1)]">Implemented</td></tr>
          <tr><td className="py-1 pr-4 text-[var(--color-body)]">Formal VPAT (Voluntary Product Accessibility Template)</td><td className="font-bold text-[var(--color-p3)]">Not yet completed</td></tr>
        </tbody></table>

        <div className="mt-4 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">CMMC 2.0 Awareness</div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">Authority: 32 CFR Part 170 (CMMC Final Rule, Dec 2024); DFARS 252.204-7021.</p>
        <p className="mt-1 text-xs text-[var(--color-body)]">
          Not applicable if developed by uniformed personnel or government civilians. If development is transferred to a DoD contractor, CMMC Level 2 certification may be required. CMMC Level 2 maps to NIST SP 800-171r2 (note: r2, not r3).
        </p>

        <div className="mt-4 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Records Management</div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">Authority: 44 U.S.C. Chapter 31; 36 CFR Chapter XII; DoD 5015.02-STD.</p>
        <p className="mt-1 text-xs text-[var(--color-body)]">
          Exported artifacts (JSON snapshots, PDF briefs, XLSX workbooks, audit CSVs) created by government personnel in official duties are federal records subject to retention schedules and disposition authority. This app does not manage retention &mdash; operators must follow Component records management guidance for readiness reporting artifacts.
        </p>

        <div className="mt-4 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">Software Supply Chain</div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">Authority: DoDI 8500.01; NIST SP 800-53r5 SA-12; EO 14028.</p>
        <div className="mt-1 overflow-x-auto">
          <table className="w-full text-xs"><thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted)]">
              <th className="py-1 pr-3">Library</th><th className="py-1 pr-3">Version</th><th className="py-1 pr-3">Purpose</th><th className="py-1">License</th>
            </tr>
          </thead><tbody>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 text-[var(--color-body)]">PapaParse</td><td className="pr-3 font-mono text-[var(--color-ink-soft)]">5.5.3</td><td className="pr-3 text-[var(--color-mute-2)]">CSV parsing</td><td className="text-[var(--color-mute-2)]">MIT</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 text-[var(--color-body)]">SheetJS (xlsx)</td><td className="pr-3 font-mono text-[var(--color-ink-soft)]">0.18.5</td><td className="pr-3 text-[var(--color-mute-2)]">XLSX export</td><td className="text-[var(--color-mute-2)]">Apache-2.0</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 text-[var(--color-body)]">Chart.js</td><td className="pr-3 font-mono text-[var(--color-ink-soft)]">bundled</td><td className="pr-3 text-[var(--color-mute-2)]">Trend chart</td><td className="text-[var(--color-mute-2)]">MIT</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 text-[var(--color-body)]">jsPDF</td><td className="pr-3 font-mono text-[var(--color-ink-soft)]">4.2.1</td><td className="pr-3 text-[var(--color-mute-2)]">PDF export</td><td className="text-[var(--color-mute-2)]">MIT</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 text-[var(--color-body)]">jsPDF-AutoTable</td><td className="pr-3 font-mono text-[var(--color-ink-soft)]">5.0.7</td><td className="pr-3 text-[var(--color-mute-2)]">PDF table layout</td><td className="text-[var(--color-mute-2)]">MIT</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 text-[var(--color-body)]">Lucide React</td><td className="pr-3 font-mono text-[var(--color-ink-soft)]">1.8.0</td><td className="pr-3 text-[var(--color-mute-2)]">Icons</td><td className="text-[var(--color-mute-2)]">ISC</td></tr>
            <tr className="border-b border-[var(--color-elevated)]"><td className="py-1 pr-3 text-[var(--color-body)]">Next.js</td><td className="pr-3 font-mono text-[var(--color-ink-soft)]">16.2.4</td><td className="pr-3 text-[var(--color-mute-2)]">Framework (static export)</td><td className="text-[var(--color-mute-2)]">MIT</td></tr>
            <tr><td className="py-1 pr-3 text-[var(--color-body)]">React</td><td className="pr-3 font-mono text-[var(--color-ink-soft)]">19.2.4</td><td className="pr-3 text-[var(--color-mute-2)]">UI library</td><td className="text-[var(--color-mute-2)]">MIT</td></tr>
          </tbody></table>
        </div>
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          Dependencies pinned in package-lock.json. If the tool transitions to a program of record, a formal SBOM (SPDX or CycloneDX) is required per EO 14028.
        </p>
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
