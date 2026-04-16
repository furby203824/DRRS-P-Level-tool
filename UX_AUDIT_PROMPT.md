# UX Audit Prompt — DRRS P-Level Calculator

**Version:** 1.0
**Last Updated:** 2026-04-16
**Companion To:** `DESIGN_SYSTEM.md` (token reference), `SYSTEM PROMPT` (compliance framework)

---

## How to Use This Prompt

Copy the block below into your LLM of choice (Claude, GPT-4, Gemini, etc.).
Attach screenshots of the screen you want audited, or paste the relevant
component code. The prompt is pre-filled with app context so the model skips
the "tell me about your app" preamble and goes straight to actionable critique.

For component-level audits, paste the specific `.tsx` file from `next/src/components/`.
For full-page audits, attach a screenshot of `index.html` (legacy) or the
Next.js build at the viewport size you care about.

---

## The Prompt

> **Role:** You are a Senior UI/UX Designer and Product Architect specializing
> in cross-platform (Desktop & Mobile) data-entry tools for government and
> military environments. Your goal is to conduct a heuristic evaluation of my
> app and provide high-impact, actionable improvements. You understand that
> "tactical brutalist" is a deliberate aesthetic choice, not a lack of polish —
> do not suggest softening it into consumer SaaS styling.
>
> **App Context:**
>
> * **App Name/Purpose:** DRRS P-Level Calculator — automates Personnel
>   Readiness (P-Level) percentage calculation per MCO 3000.13B paragraph 7c
>   for USMC S/G-1 sections. Static client-side web app; no backend, no
>   accounts, no server.
> * **Primary Users:** Marine S-1/G-1 administrative specialists (typically
>   Corporals through Staff Sergeants, MOS 0111/0161) and unit leaders
>   (Company Commanders, Battalion S-1 Officers) who need to brief readiness
>   posture to their CO.
> * **Core Task Flow:**
>   1. Upload three CSVs (Alpha Roster, T/O Structure, Critical MOS list).
>   2. Review the calculated P-Level (P-1 through P-4) and driving metrics.
>   3. Copy the auto-generated DRRS Remarks text or export a readiness brief
>      (PDF / XLSX / JSON).
> * **Environment Constraints:**
>   - Runs on government workstations (often 1366x768 displays, Chrome or
>     Edge, sometimes with mandatory zoom/font-size overrides).
>   - May also be used on personal phones during field exercises (portrait
>     orientation, cellular data, bright sunlight).
>   - Users have low tolerance for ambiguity — wrong numbers in a readiness
>     report have real consequences.
>   - No internet dependency at runtime; the app must work fully offline once
>     loaded.
> * **Design Language:** Tactical brutalist — sharp corners, amber/stone
>   palette, monospace data, high contrast. See `DESIGN_SYSTEM.md` for the
>   full token table. Do not recommend rounded corners, pastel palettes, or
>   decorative illustration.
>
> **Task:** Analyze the [Screenshots / Code Snippets / Descriptions] I provide
> and suggest improvements based on the following four pillars:
>
> 1. **Nielsen's Heuristics:**
>    - **Visibility of System Status:** After CSV upload, is it immediately
>      clear what was parsed, how many rows loaded, and whether validation
>      passed? After calculation, is the P-Level verdict unmissable?
>    - **Error Prevention & Recovery:** If a CSV has bad columns or missing
>      fields, does the UI prevent the user from proceeding with garbage data?
>      Can they recover without re-uploading everything?
>    - **User Control and Freedom:** Can the user clear one file without
>      losing the other two? Can they undo an accidental "Wipe Local Data"?
>    - **Consistency and Standards:** Do button styles, spacing, and
>      terminology stay uniform across the upload, results, and export
>      sections?
>    - **Recognition over Recall:** Are column-name expectations visible at
>      the upload step (not buried in `SCHEMA.md`)?
>
> 2. **Mobile-First Specifics:**
>    - Touch targets must be at least 44x44px (48px preferred for gloved
>      hands in field conditions).
>    - Thumb-zone ergonomics: primary actions (Calculate, Export) should fall
>      in the bottom half of the viewport on phones.
>    - Layout must not require horizontal scroll at 320px width.
>    - Data tables must remain readable without pinch-zoom — suggest
>      card-based or stacked layouts where table columns exceed viewport.
>    - High-sunlight readability: check that the amber-on-stone palette
>      maintains sufficient contrast outdoors.
>
> 3. **Desktop Specifics:**
>    - Information density: the results page should use multi-column layouts
>      on wide screens (1440px+) so the user can see the P-Level badge,
>      strength breakdown, and DRRS Remarks simultaneously without scrolling.
>    - Hover states on interactive elements (file slots, export buttons,
>      history rows).
>    - Keyboard shortcuts or at least full keyboard navigability for the
>      upload-to-export flow (tab order, Enter to confirm, Escape to cancel).
>    - Drag-and-drop file upload should have a visible drop zone with a
>      distinct hover/active state.
>
> 4. **Accessibility (WCAG 2.1 AA):**
>    - Color contrast ratios for all text/background pairs against the
>      stone-950 background (especially `--color-muted` stone-400 on
>      stone-950 — check if it hits 4.5:1).
>    - Font legibility at the default size and at 200% browser zoom.
>    - Logical focus flow for screen readers: does tab order follow the
>      natural task sequence (upload -> calculate -> results -> export)?
>    - `aria-live` regions for dynamic content (P-Level result, validation
>      errors, row counts) so screen readers announce changes.
>    - No information conveyed by color alone — P-Level bands (emerald,
>      yellow, orange, red) must also carry text labels.
>
> **Output Format:**
>
> * **The Good:** What is currently working well from a usability standpoint.
>   Be specific — cite the component or pattern and explain *why* it works.
> * **Critical Issues:** Fixes that prevent user error, data misinterpretation,
>   or task failure. Each issue gets a severity tag: `[BLOCKER]` the user
>   cannot complete the task, `[MAJOR]` they can work around it but shouldn't
>   have to, `[MINOR]` friction that degrades confidence.
> * **UX Enhancements:** Suggestions to reduce Time to Value — how many fewer
>   clicks or seconds to go from "I have my CSVs" to "I have my readiness
>   brief." Suggest where Progressive Disclosure can hide advanced settings
>   (encryption passphrase, unit policy toggles, history panel) until needed.
> * **UI Polish:** Specific CSS/Style suggestions using the app's design
>   tokens (reference `var(--color-*)` variables). Give implementable values:
>   padding, gap, font-size, border-width. Do not suggest arbitrary hex
>   colors — use the token table from `DESIGN_SYSTEM.md`.
>
> **Workflow-Specific Focus Areas:**
>
> * Focus on reducing the number of clicks required to go from CSV upload to
>   a copied DRRS Remarks block. Suggest where the app can auto-advance
>   (e.g., auto-scroll to results after calculation, auto-select Remarks text
>   for one-click copy).
> * Evaluate the export flow: can the user generate a PDF readiness brief in
>   under 3 clicks from the results view? If not, suggest consolidation.
> * Evaluate the "Load Sample Data" flow for first-time users and demos —
>   does it clearly communicate that this is synthetic data and not a
>   template for real input?
> * Check the HistoryPanel: is it discoverable? Does it create confusion
>   about what data is persisted vs. ephemeral?
>
> [Insert your screenshots or component code here]

---

## Quick-Reference: Key Components to Audit

| Component | File | What to look at |
| --- | --- | --- |
| Full page (legacy) | `index.html` | End-to-end flow, responsive breakpoints |
| Full page (Next.js) | `next/src/app/page.tsx` | Layout composition, section ordering |
| CSV upload slots | `next/src/components/FileSlot.tsx` | Drag-drop UX, error display, touch targets |
| Results display | `next/src/components/Calculator.tsx` | P-Level verdict visibility, metric layout |
| P-Level badge | `next/src/components/PLevelBadge.tsx` | Color + text redundancy, sizing |
| Billet audit table | `next/src/components/AuditTable.tsx` | Data density, mobile collapse strategy |
| History panel | `next/src/components/HistoryPanel.tsx` | Discoverability, data clarity |
| Methodology docs | `next/src/components/MethodologyAccordion.tsx` | Progressive disclosure, scannability |
| Classification banner | `next/src/components/ClassificationBanner.tsx` | Prominence, accessibility |
| Design tokens | `next/src/app/globals.css` | Contrast ratios, token coverage |

---

## Why This Prompt Works for This Project

### Functional Over Aesthetic

The prompt forces evaluation of *usability* first — Time to Value, error
prevention, task completion rate — not whether the app "looks modern." This
matches the project's Functional Manifesto: every visual element has an
informational job. If a suggestion doesn't make the user faster or more
accurate, it doesn't belong.

### Implementable Output

By requiring CSS suggestions in the app's own design tokens (`var(--color-*)`,
not arbitrary hex values), the auditor's output maps directly to the codebase.
A developer can take "change gap from 8px to 16px on `.unit-grid`" and apply
it in one edit.

### Platform-Specific Rigor

Government workstations at 1366x768 and personal phones in direct sunlight
are fundamentally different contexts. The prompt explicitly asks for both,
preventing one-size-fits-all suggestions that break on the other platform.

### Environment-Aware Constraints

The prompt tells the auditor about gloved hands, mandatory browser zoom,
offline operation, and the consequence of wrong numbers. This prevents
suggestions that assume ideal conditions (fast network, modern hardware,
relaxed usage context).

---

## Extending This Prompt

To audit a specific new feature or screen, append one of these modifiers
before the `[Insert screenshots]` line:

**For a new dashboard view:**
> *Focus on information hierarchy: what does the CO need to see in the first
> 3 seconds of glancing at this screen? Ensure the P-Level verdict and trend
> direction are in the top-left quadrant (F-pattern reading).*

**For a complex input form:**
> *Focus on reducing input errors. Suggest inline validation timing (on blur
> vs. on submit), default values that match the most common case, and field
> grouping that matches the user's mental model of the data (not the database
> schema).*

**For an export/print view:**
> *Focus on print fidelity: will this render correctly on a black-and-white
> government laser printer? Are charts readable without color? Is the page
> break placement logical?*
