import { Shield } from "lucide-react";
import { ClassificationBanner } from "@/components/ClassificationBanner";
import { Calculator } from "@/components/Calculator";
import { MethodologyAccordion } from "@/components/MethodologyAccordion";

export default function Home() {
  return (
    <main id="main" className="flex-1">
      <ClassificationBanner />

      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-8 border-b border-stone-800 pb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-500">
            MCO 3000.13B &middot; para 7c
          </p>
          <h1 className="mt-2 flex items-center gap-3 font-mono text-3xl font-black tracking-wide text-stone-100">
            <Shield size={28} strokeWidth={1.5} className="text-amber-600" />
            DRRS P-LEVEL CALCULATOR
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-300">
            Personnel Readiness calculator. Client-side only &mdash; no
            personnel data leaves the browser.
          </p>
        </header>

        <Calculator />
        <MethodologyAccordion />

        <footer className="mt-8 border-t border-stone-800 pt-4 text-xs text-stone-500">
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
