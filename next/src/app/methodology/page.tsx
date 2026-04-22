import { Metadata } from "next";
import Link from "next/link";
import { ClassificationBanner } from "@/components/ClassificationBanner";
import { blocks } from "@/components/methodologyBlocks";

const basePath = process.env.NODE_ENV === "production" ? "/DRRS-P-Level-tool" : "";

export const metadata: Metadata = {
  title: "Methodology · DRRS P-Level Calculator",
  description: "How P-Level is calculated per MCO 3000.13B paragraph 7c — formulas, band tables, worked example, and source documents.",
};

export default function MethodologyPage() {
  return (
    <main id="main" className="flex-1">
      <ClassificationBanner />

      <div className="border-b border-[var(--color-accent-strong)] bg-[var(--color-accent-tint)] px-6 py-2 text-center font-mono text-xs text-[var(--color-accent-hi)]">
        <strong>OPSEC:</strong> All processing happens in your browser. Nothing is
        uploaded to a server. Do not load real PII into this POC without an
        approved hosting decision.
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <header className="mb-8 border-b border-[var(--color-elevated)] pb-6">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">
            <Link href="/" className="text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-hi)]">
              ← Back to Calculator
            </Link>
          </p>
          <h1 className="font-mono text-3xl font-black tracking-wide text-[var(--color-ink)]">
            METHODOLOGY
          </h1>
          <p className="mt-2 text-sm text-[var(--color-body)]">
            How P-Level is calculated per MCO 3000.13B paragraph 7c. Formulas, band tables, worked examples, and source documents.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
          {/* Left column: TOC */}
          <nav aria-label="Methodology sections" className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-4">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">
                On this page
              </p>
              <ul className="space-y-1 text-sm">
                {blocks.map((block) => (
                  <li key={block.id}>
                    <a
                      href={`#${block.id}`}
                      className="block text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-hi)] transition-colors"
                    >
                      <span className="font-mono text-xs font-semibold">{block.num}</span>
                      {" "}
                      <span>{block.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Right column: Content */}
          <div>
            {blocks.map((block, index) => (
              <section
                key={block.id}
                id={block.id}
                className={`scroll-mt-4 ${index > 0 ? "border-t border-[var(--color-border)] pt-6 mt-6" : ""}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-block bg-[var(--color-elevated)] px-3 py-1.5 text-center font-mono text-sm font-semibold text-[var(--color-accent)]">
                    {block.num}
                  </span>
                </div>
                <h2 className="mb-4 text-lg font-semibold text-[var(--color-ink)]">
                  {block.title}
                </h2>
                <div className="prose prose-sm max-w-none text-[var(--color-body)]">
                  {block.content}
                </div>
              </section>
            ))}
          </div>
        </div>

        <footer className="mt-8 border-t border-[var(--color-elevated)] pt-4 text-xs text-[var(--color-mute-2)]">
          <p className="font-mono">
            <Link href="/" className="text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-hi)]">
              Calculator
            </Link>
            {" "}· {" "}
            <Link href="/methodology/" className="text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-hi)]">
              Methodology
            </Link>
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
