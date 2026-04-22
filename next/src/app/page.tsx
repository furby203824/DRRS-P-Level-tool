import { ClassificationBanner } from "@/components/ClassificationBanner";
import { Calculator } from "@/components/Calculator";
import { MethodologyAccordion } from "@/components/MethodologyAccordion";

const basePath = process.env.NODE_ENV === "production" ? "/DRRS-P-Level-tool" : "";

export default function Home() {
  return (
    <main id="main" className="flex-1">
      <ClassificationBanner />

      {/* OPSEC Banner — per SYSTEM PROMPT Part 8.1 */}
      <div className="border-b border-[var(--color-accent-strong)] bg-[var(--color-accent-tint)] px-6 py-2 text-center font-mono text-xs text-[var(--color-accent-hi)]">
        <strong>OPSEC:</strong> All processing happens in your browser. Nothing is
        uploaded to a server. Do not load real PII into this POC without an
        approved hosting decision.
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-8 border-b border-[var(--color-elevated)] pb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent-head)]">
            <a
              href="https://www.marines.mil/Portals/1/Publications/MCO%203000.13B.pdf?ver=2020-07-15-110758-503"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[var(--color-accent-hi)]"
              title="Open MCO 3000.13B (opens in a new tab)"
            >
              MCO 3000.13B &middot; para 7c
            </a>
          </p>
          <div className="mt-2 flex items-center gap-4">
            <img
              src={`${basePath}/mccsss-seal.png`}
              alt="Marine Corps Combat Service Support Schools seal"
              width={56}
              height={56}
              className="flex-shrink-0"
            />
            <div>
              <h1 className="font-mono text-3xl font-black tracking-wide text-[var(--color-ink)]">
                DRRS P-LEVEL CALCULATOR
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-body)]">
                Personnel Readiness calculator. Client-side only &mdash; no
                personnel data leaves the browser.
              </p>
              <p className="mt-0.5 font-mono text-xs text-[var(--color-mute-2)]">
                v2.0 &middot; Proof of Concept &middot; UNCLASSIFIED
              </p>
            </div>
          </div>
        </header>

        <Calculator />
        <MethodologyAccordion />

        <footer className="mt-8 border-t border-[var(--color-elevated)] pt-4 text-xs text-[var(--color-mute-2)]">
          <p className="font-mono">
            Implements MCO 3000.13B para 7c. Synthetic sample data only &mdash;
            EDIPIs prefixed <code className="text-[var(--color-muted)]">99</code>.
          </p>
          <p className="mt-1 font-mono">
            Static export. No server. No telemetry. Data never leaves the browser.
          </p>
        </footer>
      </div>

      <div className="mt-auto">
        <ClassificationBanner />
      </div>
    </main>
  );
}
