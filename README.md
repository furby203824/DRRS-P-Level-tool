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

Three CSVs per the schema in `SCHEMA.pdf`:

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

## Files

```
index.html
assets/
  css/styles.css
  js/parser.js       -- CSV parsing + schema validation
  js/calculator.js   -- P-Level math (MCO 3000.13B para 7c)
  js/app.js          -- UI wiring
SCHEMA.pdf           -- Data contract for the three CSVs
generate alpha roster.pdf  -- Source of the sample data generator
alpha roster example.csv
to structure example.csv
critical mos example.csv
```
