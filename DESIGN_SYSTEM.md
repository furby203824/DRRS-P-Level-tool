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

## Color Palette

### Base layer (page and surfaces)

| Role | Token |
| --- | --- |
| Page background | `stone-950` — near black with slight warmth |
| Panel surface | `stone-900/40` — semi-transparent for depth |
| Panel border (default) | `stone-800` |
| Panel border (elevated) | `stone-700` |
| Hover surface | `stone-900` solid |

### Brass accent layer (the "command color")

| Role | Token |
| --- | --- |
| Primary accent | `amber-600` — borders and icons |
| Heavy emphasis | `amber-700` — major borders, hover backgrounds |
| Highlight text | `amber-400` — featured numbers |
| Section headings | `amber-500` with `tracking-widest` |

### Text hierarchy

| Role | Token |
| --- | --- |
| Highest emphasis | `stone-100` — headers |
| Body emphasis | `stone-200` — data values |
| Body | `stone-300` — descriptions |
| Labels | `stone-400` — metric labels |
| Muted | `stone-500` — tiny labels, footers |
| Whisper | `stone-600` — separators, inactive states |

### Status semantics (mil-spec ordering)

| Readiness | Token | Meaning |
| --- | --- | --- |
| P-1 | `emerald-700` | Signal green — go |
| P-2 | `yellow-600` | Caution yellow |
| P-3 | `orange-600` | Warning orange |
| P-4 | `red-700` | Critical red |

**Classification banner:** `red-900` background with `red-600 border-y-4`.
Persistent at top and bottom of the page.

## Typography

Three faces working together:

- **Sans body:** default Tailwind `font-sans` for descriptions and explanatory
  prose
- **Monospace data:** `font-mono` for every number, code, label, and heading
- **No custom fonts loaded** (artifact constraint)

### Labels and headings (military document convention)

- All UPPERCASE
- `tracking-widest` letter-spacing
- `text-xs` for label rows
- `text-sm` for section heads

### Data values

- Mono font for tabular alignment
- `text-lg` for standard metrics
- `text-2xl` bold amber for featured percentages
- `text-6xl` black for the final P-Level badge

## Geometry

Sharp by default. Zero border-radius except on form controls (checkboxes use
`accent-amber-600`). Border weights signal importance:

| Weight | Use |
| --- | --- |
| `border` (1px) | Default panels |
| `border-2` | Major sections (methodology, P-Level result) |
| `border-y-4` | Classification banner emphasis |
| `border-l-4` | Formula accent strips |

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
| `grid-cols-2` | Metrics display — parallel PS and CM tables |
| `grid-cols-2` | Methodology bands — side-by-side band tables |

### Vertical rhythm (repeating section pattern)

1. Tiny amber uppercase eyebrow label
2. Large content area
3. Optional explanatory paragraph below

## Component Patterns

### `PLevelBadge`

`bg` color + matching border + mono `font-black` + `tracking-wider`. Three
sizes: `lg` for the headline result, `md` unused, `sm` for inline use in
section headers.

### `MetricRow`

`flex justify-between` with label on left (uppercase mono tiny `stone-400`),
value on right (mono `stone-200`). Bottom border separator. Optional accent
variant flips colors and bumps to `amber-400` for the percentage row.

### `FileSlot`

Full-width clickable label wrapping a hidden file input. Border switches
`stone-700` → `amber-600` on file present. Icon swaps `Upload` → `CheckCircle2`.
Filename and parsed row count stack vertically.

### Section header

Three-part assembly inside `h2`:

1. Tiny uppercase amber label
2. Action buttons floated right
3. Bottom border separator

## Iconography

`lucide-react` with `strokeWidth={1.5}` for a lighter weight than default.

| Icon | Use |
| --- | --- |
| `Shield` | App identity in header |
| `BookOpen` | Methodology toggle |
| `Upload`, `FileText` | File slot states |
| `Calculator` | Empty state placeholder |
| `AlertTriangle` | Parse warnings |
| `AlertCircle` | Reason codes |
| `TrendingDown` | Critical MOS gaps |
| `Copy`, `RotateCcw` | Action buttons |
| `ChevronDown`, `ChevronRight` | Collapse state |
| `CheckCircle2` | File loaded confirmation |

## Interactive States

### Buttons (two-tier system)

- **Primary action:** `bg-amber-900` with `amber-700` border, hover
  `bg-amber-800`, text `amber-100`
- **Secondary action:** `bg-stone-800` with `stone-700` border, hover
  `bg-stone-700`, text `stone-300`

### Form inputs

- `bg-stone-900` with border `stone-700`
- `focus:border-amber-600 focus:outline-none`

### Checkbox

`accent-amber-600` keeps the system checkbox style but tints it brass.

### Drop zones

- Default: `border-2 dashed stone-700`
- Hover: `border-amber-700`
- Filled: `border-amber-600` with `amber-950/20` background tint

## Why This Works for Marines

- The aesthetic reads as a system tool, which builds trust before the math is
  verified
- UPPERCASE mono labels match the format of orders, MARADMINs, and DRRS itself
- Status colors follow the same semantic order as readiness reporting
  (green good, red bad)
- Classification banner top and bottom mirrors document handling habits
- The brass amber accent reads as authority without being aggressive

## Scaling Notes for the Next.js Port

When porting to production:

- Move the color values into Tailwind theme extension as semantic tokens
  (`color-readiness-p1`, etc.)
- Extract the badge, `MetricRow`, and `FileSlot` components into separate files
- Add a CSS variable for the accent color so a future MARFORPAC vs MARFORLANT
  theme swap is one line
- Preserve the sharp corners and mono-first labeling — those are the
  load-bearing visual choices
