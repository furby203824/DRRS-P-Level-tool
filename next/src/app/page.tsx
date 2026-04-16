import Image from "next/image";
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
          <div className="mt-2 flex items-center gap-4">
            <Image
              src="/mccsss-seal.png"
              alt="Marine Corps Combat Service Support Schools seal"
              width={56}
              height={56}
              className="flex-shrink-0"
              priority
            />
            <div>
              <h1 className="font-mono text-3xl font-black tracking-wide text-[var(--color-ink)]">
                DRRS P-LEVEL CALCULATOR
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--color-body)]">
                Personnel Readiness calculator. Client-side only &mdash; no
                personnel data leaves the browser.
              </p>
            </div>
          </div>
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
