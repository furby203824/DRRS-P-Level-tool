# DRRS-P-Level-tool

Standardizes how S/G-1s upload their alpha roster, and the tool auto-populates
the Personnel Readiness (P-Level) percentage per **MCO 3000.13B** paragraph 7c.

## Live demo (GitHub Pages)

This is a static site -- no backend, no build step. All CSV parsing and
calculation runs in the browser. **No personnel data leaves the user's
machine.**

To enable hosting:
1. Push this branch to GitHub.
2. Repo Settings -> Pages -> Source: deploy from branch -> select this branch,
   `/ (root)`.
3. The site will be served at
   `https://<user>.github.io/DRRS-P-Level-tool/`.

For local preview without deploying, serve the repo root with any static
server, e.g.:

```
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Inputs

Three CSVs per the schema in [`SCHEMA.md`](SCHEMA.md) (markdown mirror of
`SCHEMA.pdf` with the calculation reference reconciled to match the
implementation):

| File | Source | Description |
| --- | --- | --- |
| Alpha Roster | AAA (Cognos) + S-1 | One row per Marine / attached service member |
| T/O Structure | TFSMS | Authorized billets aggregated by BMOS + PayGrade |
| Critical MOS | DC PP&O / unit T/O | Mission-essential MOS list for the unit type |

Sample data for a fictional CLB H&S Company at MCB Hawaii ships in the repo
root. Click **Load Sample Data** in the UI to populate all three slots.

## Outputs

- Overall P-Level (P-1 through P-4) with the driving metric highlighted
- Personnel Strength % with full numerator/denominator breakdown
- Critical MOS fill % with per-billet breakdown (applies the +/-1 paygrade rule
  and avoids double-counting)

## OPSEC

Sample EDIPIs all start with `99` to flag synthetic data. Do not load real PII
into any environment without an approved hosting decision.

## Architecture Decisions

Decisions locked in for the proof of concept and (unless explicitly
revisited) for any Next.js port. Each one exists to prevent future
contributors from re-opening a path that was already considered.

### ADR-1 — Hosting stays static. No server, ever, for this POC.

Server-backed hosting is the wrong fight:

- Server with DoD PII forces a Privacy Impact Assessment.
- PII at rest triggers IL5 hosting (NIPR cloud / MilCloud / AWS GovCloud)
  and a full Authority to Operate package.
- Realistic ATO timeline is 18–36 months with real compliance cost.

Multi-user, central history, and central data feeds are addressable
without a server:

- Admin cells of 3–5 Marines do not need a shared database. One Marine
  runs the calc, exports the artifacts, shares the files.
- Central history is solved by exported JSON snapshots dropped into a
  SharePoint folder.
- Central data feed is Cognos; Cognos already has the accreditation. The
  calculator is a downstream consumer. The Marine pulls the Cognos
  export, drags it in.

The OPSEC argument is a one-sentence explanation that survives any
inspection: *data never leaves your browser*. No server logs, no
database breach surface, a **Wipe Local Data** button ends every
concern.

If this ever gets sponsorship for a program of record, the calculation
engine and components port to a server-backed version — the investment
is preserved. The static version remains as a fallback for
forward-deployed units with limited connectivity.

### ADR-2 — DRRS export is paste-into-Remarks. No API, no structured import.

DRRS-MC has no unit-level structured import endpoint; strength data is
auto-pulled from MCTFS and TFSMS, and Remarks are manual text entry. So
there is no spec to write for "structured DRRS import" — the file does
not exist.

API integration with DRRS-MC (option 2.c in earlier planning) is
deferred indefinitely. It requires a System Access Request, data
sharing agreement, ATO, and DISA coordination — a 12–24 month path
inappropriate for a POC. Revisit only with program-of-record
sponsorship.

What we build instead:

- **Clipboard export** formatted for the DRRS-MC Remarks field
  (BLUF / Actions / Results structure, reason-code suggestion,
  DRRS-Ready sanitizer).
- **PDF export** of the full readiness packet for the CO brief.
- **XLSX export** with Roster, Calculation, and Result sheets for the
  S-1 audit trail.
- **JSON snapshot** for the calculator's own history feature and for
  cross-device portability via SharePoint or CAC-protected USB.

### ADR-3 — Next.js port uses `output: 'export'`.

When the static HTML gets ported, the Next.js scaffold is configured
for static export from day one with `basePath` set to the repo name for
GitHub Pages routing. This preserves the no-server property in ADR-1
and avoids accidentally introducing server routes that would need
accreditation.

If a future contributor adds an API route or server action, that is a
deliberate break of ADR-1 and must come with updated hosting paperwork.

## Files

```
index.html
assets/
  css/styles.css
  js/parser.js       -- CSV parsing + schema validation
  js/calculator.js   -- P-Level math (MCO 3000.13B para 7c)
  js/app.js          -- UI wiring
SCHEMA.md            -- Data contract for the three CSVs (greppable)
SCHEMA.pdf           -- Original data contract PDF
generate alpha roster.pdf  -- Source of the sample data generator
alpha roster example.csv
to structure example.csv
critical mos example.csv
DESIGN_SYSTEM.md     -- UI style and scheme reference (for extension/handoff)
```
