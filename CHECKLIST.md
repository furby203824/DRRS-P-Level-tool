# Methodology Page Migration Checklist

## Overview
Move the Methodology content from the home page to a dedicated `/methodology/` page to provide:
- Clean calculator-first home page
- Stable, deep-linkable URLs per section
- Scannable sticky left-rail TOC
- Better integration of the MCO 3000.13B chip

---

## Phase 1: Create Shared Data Module

- [ ] **1.1** Create `next/src/components/methodologyBlocks.tsx`
  - [ ] Define Block interface with: `id`, `num`, `title`, `content`
  - [ ] Extract the blocks array from MethodologyAccordion.tsx (lines 12–471)
  - [ ] Create slug map (01→what-p-level-measures, 02→formulas, etc., §→sources)
  - [ ] Export `blocks: Block[]` and Block interface
  - [ ] Verify all JSX content copied verbatim and renders correctly

---

## Phase 2: Build the Methodology Page

- [ ] **2.1** Create `next/src/app/methodology/page.tsx` as a server component (no "use client")
- [ ] **2.2** Structure the page layout:
  - [ ] Import blocks from methodologyBlocks.tsx
  - [ ] Wrap in `<main id="main" className="flex-1">`
  - [ ] Add `<ClassificationBanner />` at top and bottom
  - [ ] Add breadcrumb: "← Back to Calculator" (Link to "/")
  - [ ] Add page header: H1 "METHODOLOGY" + subtitle
- [ ] **2.3** Build two-column layout (lg:grid-cols-[16rem_1fr] gap-8):
  - [ ] **Left column (sticky TOC):**
    - [ ] `<nav aria-label="Methodology sections">` with `lg:sticky lg:top-4 lg:self-start`
    - [ ] Map blocks: `<a href={#${b.id}}>{b.num} {b.title}</a>`
    - [ ] Stack on mobile (< lg)
  - [ ] **Right column (content):**
    - [ ] Map blocks: `<section id={b.id}>`
    - [ ] Add `scroll-mt-4` and `border-t` (skip first)
    - [ ] Render block.num chip + H2 block.title + block.content
    - [ ] All sections expanded (no toggles)
- [ ] **2.4** Add footer identical to home page footer
- [ ] **2.5** Test hash-scrolling doesn't hide headings behind banners

---

## Phase 3: Page Metadata

- [ ] **3.1** Add metadata export to `methodology/page.tsx`:
  ```typescript
  export const metadata: Metadata = {
    title: "Methodology · DRRS P-Level Calculator",
    description: "How P-Level is calculated per MCO 3000.13B paragraph 7c — formulas, band tables, worked example, and source documents.",
  };
  ```

---

## Phase 4: Update Home Page

- [ ] **4.1** Remove MethodologyAccordion from home page (`next/src/app/page.tsx`):
  - [ ] Delete `import { MethodologyAccordion }` (line 3)
  - [ ] Delete `<MethodologyAccordion />` render (line 56)
- [ ] **4.2** Delete `next/src/components/MethodologyAccordion.tsx`
- [ ] **4.3** Add navigation links on home page:
  - [ ] Add nav link: `<Link href="/methodology/">Methodology →</Link>` (header or below chip)
  - [ ] Style as accent link
  - [ ] Verify basePath is auto-prepended
- [ ] **4.4** Update footer on home page:
  - [ ] Add third `<p>`: `<Link href="/methodology/">Methodology</Link> · <Link href="/">Calculator</Link>`
  - [ ] Replicate same footer on methodology/page.tsx for back-navigation

---

## Phase 5: Update MCO Chip Navigation

- [ ] **5.1** Change MCO 3000.13B · para 7c chip (`page.tsx:22–30`):
  - [ ] Convert from external `<a target="_blank">` to internal `<Link href="/methodology/#formulas">`
  - [ ] Update `title=` tooltip to "View methodology (formulas section)"
  - [ ] Verify external MCO PDF link remains in §Sources section (`methodologyBlocks.tsx:397`)
  - [ ] Confirm users can reach PDF via `/methodology/#sources`

---

## Phase 6: Testing & Validation

- [ ] **6.1** Local development testing:
  - [ ] `npm run dev` starts without errors
  - [ ] Home page loads, no MethodologyAccordion rendered
  - [ ] Methodology nav links present and clickable
  - [ ] MCO chip points to `/methodology/#formulas`
- [ ] **6.2** Methodology page rendering:
  - [ ] Page loads at `/methodology/`
  - [ ] TOC appears on desktop (sticky, left-aligned)
  - [ ] TOC stacks on mobile
  - [ ] All sections render with content
  - [ ] Hash links work: click TOC → scroll to section
  - [ ] Footer navigation visible and functional
- [ ] **6.3** Deep-linking verification:
  - [ ] `/methodology/#what-p-level-measures` → scrolls to section 01
  - [ ] `/methodology/#formulas` → scrolls to section 02
  - [ ] `/methodology/#sources` → scrolls to sources section
  - [ ] All 13 anchor IDs work correctly
- [ ] **6.4** Styling & spacing:
  - [ ] Tailwind v4 + CSS variables from globals.css used (no new tokens)
  - [ ] `scroll-mt-4` prevents headings from hiding
  - [ ] Breadcrumb and footer styled consistently
  - [ ] Responsive on mobile, tablet, desktop

---

## Phase 7: Build & Deploy

- [ ] **7.1** Build static export:
  - [ ] `npm run build` completes without errors
  - [ ] Output generated in `next/out/`
- [ ] **7.2** Sync to GitHub Pages:
  - [ ] Copy `next/out/` → top-level `docs/`
  - [ ] Verify static routing (trailing slash: true) respected
  - [ ] Verify basePath `/DRRS-P-Level-tool` applied correctly
- [ ] **7.3** Test production build locally:
  - [ ] Serve `docs/` folder locally (e.g., `python3 -m http.server`)
  - [ ] Test home page at `/DRRS-P-Level-tool/`
  - [ ] Test methodology page at `/DRRS-P-Level-tool/methodology/`
  - [ ] Test hash links: `/DRRS-P-Level-tool/methodology/#formulas`
- [ ] **7.4** Deploy to GitHub Pages:
  - [ ] Commit all changes
  - [ ] Push to designated branch
  - [ ] Verify live at GitHub Pages URL

---

## Sign-Off

- [ ] **Final Verification:**
  - [ ] Home page is clean, calculator-focused
  - [ ] Methodology page is complete, all sections accessible
  - [ ] Deep-links work as specified
  - [ ] No broken imports or console errors
  - [ ] Responsive design verified across devices
  - [ ] All navigation (header chip, footer links, TOC) functional

---

## Notes

- **Constraints to respect:**
  - Static export with basePath `/DRRS-P-Level-tool` in prod
  - trailingSlash: true
  - Build output: `next/out/` → `docs/` (GitHub Pages)
  - Reuse existing Tailwind v4 + CSS variables, no new tokens

- **Files modified:**
  - Create: `next/src/components/methodologyBlocks.tsx`
  - Create: `next/src/app/methodology/page.tsx`
  - Update: `next/src/app/page.tsx`
  - Delete: `next/src/components/MethodologyAccordion.tsx`
  - Sync: `next/out/` → `docs/`
