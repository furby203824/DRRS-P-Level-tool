# DRRS P-Level Tool — Design System

Reference spec for the calculator UI. Bookmark this if you need to extend the
app or hand off to another developer.

## Aesthetic Direction

**Tactical brutalist.** Built to look like an operations center tool, not
consumer SaaS. Stripped of decoration. Every visual element has an
informational job. Inspired by mil-spec dashboards, naval bridge displays, and
the visual language of FOUO documents.

Deliberately avoided:

- Purple gradients (the AI dashboard cliche)
- Rounded soft corners (everything is sharp)
- Friendly micro-animations
- Hero illustrations or emoji
- Generic Inter typography

## Token Reference

All design decisions flow through CSS custom properties defined in a single
`@theme` block in `next/src/app/globals.css`. Components reference tokens via
Tailwind arbitrary-value syntax: `bg-[var(--color-surface)]`.

### Surfaces

| CSS Variable | Hex | Tailwind | Role |
| --- | --- | --- | --- |
| `--color-bg` | `#0c0a09` | stone-950 | Page background |
| `--color-surface` | `#1c1917` | stone-900 | Panel fill (use with `/40` for depth) |
| `--color-elevated` | `#292524` | stone-800 | Default panel borders, inner separators |
| `--color-border` | `#44403c` | stone-700 | Elevated panel borders, form borders |

### Text hierarchy

| CSS Variable | Hex | Tailwind | Role |
| --- | --- | --- | --- |
| `--color-ink` | `#f5f5f4` | stone-100 | Highest emphasis — headers, input text |
| `--color-ink-soft` | `#e7e5e4` | stone-200 | Body emphasis — data values |
| `--color-body` | `#d6d3d1` | stone-300 | Body — descriptions, secondary button text |
| `--color-muted` | `#a8a29e` | stone-400 | Labels — metric labels, subtitles |
| `--color-mute-2` | `#8a8480` | stone-500 adj. | Muted — tiny labels, footers, ghost text (5.36:1 on stone-950) |
| `--color-mute-3` | `#57534e` | stone-600 | Whisper — separators, inactive states only (not for text) |

### Brass accent layer (the "command color")

| CSS Variable | Hex | Tailwind | Role |
| --- | --- | --- | --- |
| `--color-accent` | `#d97706` | amber-600 | Primary accent — borders, icons, focus rings |
| `--color-accent-strong` | `#b45309` | amber-700 | Heavy emphasis — major borders, hover borders |
| `--color-accent-hi` | `#fbbf24` | amber-400 | Highlight text — featured numbers |
| `--color-accent-head` | `#f59e0b` | amber-500 | Section headings with `tracking-widest` |
| `--color-accent-bg` | `#78350f` | amber-900 | Primary button background |
| `--color-accent-bg-hover` | `#92400e` | amber-800 | Primary button hover |
| `--color-accent-ink` | `#fef3c7` | amber-100 | Primary button text |
| `--color-accent-tint` | `#451a03` | amber-950 | Filled-state bg tint (use with `/20`) |

### Error / validation feedback

| CSS Variable | Hex | Tailwind | Role |
| --- | --- | --- | --- |
| `--color-error` | `#ef4444` | red-500 | Error icons and text |
| `--color-error-hi` | `#f87171` | red-400 | Lighter error status text |
| `--color-error-tint` | `#450a0a` | red-950 | Error bg base (use with `/10`) |

### Readiness band semantics (mil-spec ordering)

| CSS Variable | Hex | Tailwind | Meaning |
| --- | --- | --- | --- |
| `--color-p1` | `#15803d` | emerald-700 | P-1 — signal green, go |
| `--color-p2` | `#ca8a04` | yellow-600 | P-2 — caution yellow |
| `--color-p3` | `#ea580c` | orange-600 | P-3 — warning orange |
| `--color-p4` | `#b91c1c` | red-700 | P-4 — critical red (also used for error borders) |

### Classification banner

| CSS Variable | Hex | Tailwind | Role |
| --- | --- | --- | --- |
| `--color-classification` | `#7f1d1d` | red-900 | Banner background |
| `--color-classification-edge` | `#dc2626` | red-600 | Banner `border-y-4` |

### Fonts

| CSS Variable | Stack | Role |
| --- | --- | --- |
| `--font-sans` | Geist Sans, system sans-serif | Descriptions, explanatory prose |
| `--font-mono` | Geist Mono, system monospace | Numbers, labels, headings, data |

## Typography

Three faces working together:

- **Sans body:** `font-sans` for descriptions and explanatory prose
- **Monospace data:** `font-mono` for every number, code, label, and heading
- **Geist family** loaded via Next.js font optimization (no external requests)

### Labels and headings (military document convention)

- All UPPERCASE
- `tracking-widest` letter-spacing
- `text-xs` for label rows
- `text-sm` for section heads

### Data values

- Mono font for tabular alignment
- `text-lg` for standard metrics
- `text-2xl` bold `--color-accent-hi` for featured percentages
- `text-6xl` black for the final P-Level badge

## Geometry

Sharp by default. Zero border-radius except on form controls (checkboxes use
`accent-[var(--color-accent)]`). Border weights signal importance:

| Weight | Use |
| --- | --- |
| `border` (1px) | Default panels |
| `border-2` | Major sections (methodology, P-Level result), drop zones |
| `border-y-4` | Classification banner emphasis |
| `border-l-4` | Formula accent strips, validation alerts |

### Spacing rhythm

| Value | Use |
| --- | --- |
| `mb-8` | Between major sections |
| `mb-4` | Between subsections |
| `gap-3` | Tight grids |
| `gap-6` | Spaced grids |
| `py-1` | Banners |
| `py-2` | Metric rows |
| `py-4` | Panel headers |
| `py-8` | Card interiors |

## Layout System

**Container:** `max-w-7xl mx-auto px-6 py-8`. Single column with grid
breakouts.

### Grid breakouts at `md` breakpoint

| Grid | Purpose |
| --- | --- |
| `grid-cols-3` | File upload — three CSV slots |
| `grid-cols-3` | Unit profile — UIC, name, date |
| `grid-cols-3` | Results — P-Level card, PS metrics, CM metrics |
| `grid-cols-2` | Methodology bands — side-by-side band tables |

### Vertical rhythm (repeating section pattern)

1. Tiny amber uppercase eyebrow label
2. Large content area
3. Optional explanatory paragraph below

## Component Patterns

### `PLevelBadge`

**File:** `src/components/PLevelBadge.tsx`

Band-colored background + matching border + mono `font-black` +
`tracking-wider`. White text.

| Prop | Type | Default | Use |
| --- | --- | --- | --- |
| `band` | `1 \| 2 \| 3 \| 4` | required | Readiness band |
| `size` | `"lg" \| "md" \| "sm"` | `"sm"` | `lg` for headline result, `sm` for inline |
| `className` | `string` | `""` | Additional classes |

### `MetricRow`

**File:** `src/components/MetricRow.tsx`

`flex justify-between` with label on left (uppercase mono tiny
`--color-muted`), value on right (mono `--color-ink-soft`). Bottom border
separator in `--color-elevated`.

| Prop | Type | Default | Use |
| --- | --- | --- | --- |
| `label` | `string` | required | Left-side label |
| `value` | `string \| number` | required | Right-side value |
| `accent` | `boolean` | `false` | Flips to `text-lg font-bold --color-accent-hi` |
| `className` | `string` | `""` | Additional classes |

### `FileSlot`

**File:** `src/components/FileSlot.tsx`

Full-width clickable label wrapping a hidden file input. Supports drag-and-drop.

| Prop | Type | Default | Use |
| --- | --- | --- | --- |
| `title` | `string` | required | Slot heading |
| `subtitle` | `string` | required | Description text |
| `accept` | `string` | `".csv"` | File input accept attribute |
| `rowCount` | `number` | — | Parsed row count, shown below filename |
| `onFile` | `(file: File) => void` | required | Callback on file selection |

State-driven visual changes:

| State | Border | Icon | Status text |
| --- | --- | --- | --- |
| Empty | `--color-border` dashed | `Upload` | "Drop CSV or click to browse" |
| Dragover | `--color-accent-strong` solid | `Upload` | — |
| Loaded | `--color-accent` solid, `--color-accent-tint/20` bg | `CheckCircle2` | Filename + row count |
| Error | `--color-p4` solid, `--color-error-tint/10` bg | `AlertCircle` | Error message |

### `ClassificationBanner`

**File:** `src/components/ClassificationBanner.tsx`

| Prop | Type | Default | Use |
| --- | --- | --- | --- |
| `text` | `string` | `"UNCLASSIFIED // POC"` | Banner text |

### Section header

Three-part assembly:

1. Tiny uppercase amber eyebrow label (`--color-accent-head`)
2. Action buttons floated right (when applicable)
3. Bottom border separator (`border-b --color-elevated pb-3`)

Applied consistently to all four sections: Load Data, Results, Methodology,
Calculation History.

## Iconography

`lucide-react` with `strokeWidth={1.5}` for a lighter weight than default.

| Icon | Use |
| --- | --- |
| `Shield` | App identity in header |
| `BookOpen` | Methodology toggle |
| `Upload`, `CheckCircle2`, `AlertCircle` | File slot states |
| `Calculator` | Empty state placeholder |
| `AlertTriangle` | Parse warnings |
| `TrendingDown` | Critical MOS gaps |
| `Copy`, `RotateCcw` | Action buttons |
| `Download` | Export buttons |
| `ChevronDown`, `ChevronRight` | Collapse state |

## Interactive States

### Buttons (two-tier system)

**Primary action:**

```
border border-[var(--color-accent-strong)]
bg-[var(--color-accent-bg)]
text-[var(--color-accent-ink)]
hover:bg-[var(--color-accent-bg-hover)]
```

**Secondary action:**

```
border border-[var(--color-border)]
bg-[var(--color-elevated)]
text-[var(--color-body)]
hover:bg-[var(--color-border)]
```

**Ghost action:** no border/bg, `text-[var(--color-mute-2)]
hover:text-[var(--color-ink)]`

### Form inputs

```
bg-[var(--color-surface)]
border border-[var(--color-border)]
text-[var(--color-ink)]
focus:border-[var(--color-accent)] focus:outline-none
```

### Checkbox

`accent-[var(--color-accent)]` keeps the system checkbox style but tints it
brass.

### Drop zones

- Default: `border-2 dashed --color-border`
- Hover: `--color-accent-strong`
- Filled: `--color-accent` solid with `--color-accent-tint/20` bg
- Error: `--color-p4` solid with `--color-error-tint/10` bg

## Why This Works for Marines

- The aesthetic reads as a system tool, which builds trust before the math is
  verified
- UPPERCASE mono labels match the format of orders, MARADMINs, and DRRS itself
- Status colors follow the same semantic order as readiness reporting
  (green good, red bad)
- Classification banner top and bottom mirrors document handling habits
- The brass amber accent reads as authority without being aggressive

## Theme Swap Procedure

All accent colors flow through `--color-accent-*` tokens in `globals.css`.
To swap themes (e.g., MARFORPAC vs MARFORLANT), change the eight accent
values in the `@theme` block:

```css
/* Example: swap brass (amber) for navy (blue) */
--color-accent:          #2563eb;  /* blue-600 */
--color-accent-strong:   #1d4ed8;  /* blue-700 */
--color-accent-hi:       #60a5fa;  /* blue-400 */
--color-accent-head:     #3b82f6;  /* blue-500 */
--color-accent-bg:       #1e3a5f;  /* blue-900 */
--color-accent-bg-hover: #1e40af;  /* blue-800 */
--color-accent-ink:      #dbeafe;  /* blue-100 */
--color-accent-tint:     #172554;  /* blue-950 */
```

No component files need to change. Surface, text, readiness, error, and
classification tokens stay fixed across themes.

## Scaling Notes — Status

Items from the original design spec and their completion status in the Next.js
port (`next/`):

- [x] Move color values into Tailwind theme extension as semantic tokens
  — Done. All 30 tokens in `@theme` block in `globals.css`.
- [x] Extract badge, `MetricRow`, and `FileSlot` into separate component files
  — Done. Eight components in `src/components/`.
- [x] Add CSS variable for accent color enabling one-line theme swap
  — Done. Eight `--color-accent-*` tokens; see Theme Swap Procedure above.
- [x] Preserve sharp corners and mono-first labeling
  — Preserved. Zero `rounded-*` usage, `font-mono` on all data and labels.
