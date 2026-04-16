import { Shield } from "lucide-react";
import { ClassificationBanner } from "@/components/ClassificationBanner";
import { Calculator } from "@/components/Calculator";
import { MethodologyAccordion } from "@/components/MethodologyAccordion";

export default function Home() {
  return (
    <main id="main" className="flex-1">
      <ClassificationBanner />

      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-8 border-b border-[var(--color-elevated)] pb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent-head)]">
            MCO 3000.13B &middot; para 7c
          </p>
          <h1 className="mt-2 flex items-center gap-3 font-mono text-3xl font-black tracking-wide text-[var(--color-ink)]">
            <Shield size={28} strokeWidth={1.5} className="text-[var(--color-accent)]" />
            DRRS P-LEVEL CALCULATOR
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-body)]">
            Personnel Readiness calculator. Client-side only &mdash; no
            personnel data leaves the browser.
          </p>
        </header>

        <Calculator />
        <MethodologyAccordion />

        <footer className="mt-8 border-t border-[var(--color-elevated)] pt-4 text-xs text-[var(--color-mute-2)]">
          <p className="font-mono">
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
