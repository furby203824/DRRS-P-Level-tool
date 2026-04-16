# DRRS P-Level Calculator — Next.js port

Static-exported Next.js rebuild of the calculator currently running from
the repo root.

## Status

Scaffold only. The calculator logic is not yet ported. See `src/app/page.tsx`
for the current checklist.

## Why this exists

Per `../README.md` ADR-3: the Next.js port uses `output: 'export'` so it
keeps the no-server property of the static site (ADR-1). The port is the
home of the tactical-brutalist design system (`../DESIGN_SYSTEM.md`) and
the heavier export libraries (jsPDF, SheetJS) that are not worth adding
to the plain-HTML version.

## Commands

```
npm install         # install deps
npm run dev         # local dev server at http://localhost:3000
npm run build       # static export to ./out/
npm run lint
```

`npm run build` emits to `next/out/`. GitHub Pages will eventually be
pointed at that directory (see ADR-3); until the port is feature-complete
the Pages deploy continues to serve the repo-root static site.

## Configuration

`next.config.ts` sets:

- `output: 'export'` — static HTML only, no server routes.
- `basePath` — set to `/DRRS-P-Level-tool` in production so asset URLs
  resolve correctly under the GitHub Pages path.
- `trailingSlash: true` — Pages serves `/foo/` as `/foo/index.html`.
- `images.unoptimized: true` — the Image Optimization API needs a
  server; disable for static export.

## Design tokens

Palette, typography, geometry, and readiness semantics are defined in
`src/app/globals.css` under `@theme`. Change a single variable there to
swap a MARFORPAC vs MARFORLANT theme.
