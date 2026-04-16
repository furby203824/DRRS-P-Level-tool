export default function Home() {
  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-6 py-8 flex-1">
      {/* Classification banner — stub, real banner comes from the
          design system port. Positioned top and bottom per mil-spec
          document handling convention. */}
      <div className="-mx-6 mb-8 bg-[var(--color-classification)] border-y-4 border-[var(--color-classification-edge)] py-1 text-center font-mono text-xs tracking-widest text-white">
        UNCLASSIFIED // POC
      </div>

      <header className="mb-10 border-b border-[var(--color-elevated)] pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent-head)]">
          MCO 3000.13B &middot; para 7c
        </p>
        <h1 className="mt-2 font-mono text-3xl font-black tracking-wide text-[var(--color-ink)]">
          DRRS P-LEVEL CALCULATOR
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--color-body)]">
          Next.js port, static-exported for GitHub Pages. The live navy/gold
          version of this calculator runs from the repo root; this port is
          the future home of the tactical-brutalist design and the jsPDF /
          SheetJS exports.
        </p>
      </header>

      <section className="mb-10">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent-head)]">
          Status
        </p>
        <h2 className="mt-2 font-mono text-lg text-[var(--color-ink)]">
          Scaffold only &mdash; calculator not yet ported
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-[var(--color-body)]">
          <li>
            <span className="font-mono text-[var(--color-accent-hi)]">[ ] </span>
            Port <code className="font-mono text-[var(--color-ink-soft)]">calculator.js</code> as typed <code className="font-mono">lib/plevel.ts</code>
          </li>
          <li>
            <span className="font-mono text-[var(--color-accent-hi)]">[ ] </span>
            Port <code className="font-mono text-[var(--color-ink-soft)]">parser.js</code> as typed <code className="font-mono">lib/parser.ts</code>
          </li>
          <li>
            <span className="font-mono text-[var(--color-accent-hi)]">[ ] </span>
            Rebuild UI in React components (PLevelBadge, MetricRow, FileSlot, MethodologyAccordion, AuditTable, ExportActions)
          </li>
          <li>
            <span className="font-mono text-[var(--color-accent-hi)]">[ ] </span>
            Integrate jsPDF for the CO brief and SheetJS for the S-1 audit workbook
          </li>
          <li>
            <span className="font-mono text-[var(--color-accent-hi)]">[ ] </span>
            Migrate LocalStorage profile + Web Crypto encrypted export
          </li>
        </ul>
      </section>

      <footer className="mt-auto border-t border-[var(--color-elevated)] pt-4 text-xs text-[var(--color-mute-2)]">
        <p className="font-mono">
          Static export (<code>output: &lsquo;export&rsquo;</code>). No server. No telemetry. Data never leaves the browser.
        </p>
      </footer>
    </main>
  );
}
