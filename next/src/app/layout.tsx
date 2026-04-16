import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DRRS P-Level Calculator",
  description:
    "USMC Personnel Readiness (P-Level) calculator per MCO 3000.13B. " +
    "Client-side only — no personnel data leaves the browser.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-ink)]">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-0 focus:top-0 focus:z-50 focus:bg-[var(--color-accent)] focus:text-black focus:px-3 focus:py-2"
        >
          Skip to calculator
        </a>
        {children}
      </body>
    </html>
  );
}
