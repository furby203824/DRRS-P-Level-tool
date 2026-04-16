import { ClassificationBanner } from "@/components/ClassificationBanner";
import { Calculator } from "@/components/Calculator";

export default function Home() {
  return (
    <main id="main" className="flex-1">
      <ClassificationBanner />

      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-8 border-b border-[var(--color-elevated)] pb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent-head)]">
            MCO 3000.13B &middot; para 7c
          </p>
          <h1 className="mt-2 font-mono text-3xl font-black tracking-wide text-[var(--color-ink)]">
            DRRS P-LEVEL CALCULATOR
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-body)]">
            Personnel Readiness calculator. Client-side only &mdash; no
            personnel data leaves the browser.
          </p>
        </header>

        <Calculator />
      </div>

      <div className="mt-auto">
        <ClassificationBanner />
      </div>
    </main>
  );
}
