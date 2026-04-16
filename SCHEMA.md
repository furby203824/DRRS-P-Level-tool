# Data Schema — P-Level Calculator

Data contract for the three CSV files that drive the P-Level calculator. In
production, these feed in from Cognos extracts of the AAA system. For the
proof of concept, the example files in the repo root model a fictional
Combat Logistics Battalion H&S Company at MCB Hawaii.

This is a markdown port of `SCHEMA.pdf`. Calculation details below were
reconciled against the implementation (see commit `14bd803`) — the PDF's
formula text is preserved verbatim in a footnote for reference.

## OPSEC note

Every EDIPI in the example data starts with `99` to flag synthetic data.
Names are placeholder. Do **not** load real PII into any environment
without an approved hosting decision.

---

## File 1: `alpha roster example.csv`

One row per Marine or attached service member. 155 rows in the example.

| Column | Type | Source | Notes |
| --- | --- | --- | --- |
| `EDIPI` | string | AAA | 10 digits, leading `99` in samples |
| `LastName` | string | AAA | All caps |
| `FirstName` | string | AAA | All caps |
| `MI` | string | AAA | Single letter |
| `Rank` | string | AAA | PVT, PFC, LCPL, CPL, SGT, SSGT, GYSGT, MSGT, 1STSGT, MGYSGT, SGTMAJ, WO, CWO2–5, 2NDLT, 1STLT, CAPT, MAJ, LTCOL, COL |
| `PayGrade` | string | AAA | `E1`–`E9`, `W2`–`W5`, `O1`–`O6` |
| `Service` | string | AAA | `USMC` or `USN` |
| `Component` | string | AAA | `AD` or `RES` |
| `Sex` | string | AAA | `M` or `F` |
| `Unit` | string | AAA | UIC of current unit |
| `UnitName` | string | AAA | Full unit descriptor |
| `ParentUIC` | string | AAA | Parent battalion or higher UIC |
| `BIC` | string | TFSMS | 13-char Billet Identification Code |
| `BMOS` | string | TFSMS | Billet MOS — the slot the Marine fills |
| `PMOS` | string | AAA | Primary MOS — what the Marine is qualified in |
| `BilletTitle` | string | TFSMS | Plain English title |
| `Category` | string | AAA | On Hand, Leave, TAD, Medical, Other |
| `DutyStatus` | string | AAA | Granular status, see list below |
| `DLC` | string | AAA / S-1 | Duty Limitation Code per MCO 3000.13B Appendix |
| `DLC_Desc` | string | derived | Human-readable DLC label |
| `DRRSStatus` | string | derived / S-1 | `ASSIGNED`, `ATTACHED`, `DETACHED`, `IA`, `JIA` |
| `DeployableFlag` | string | derived / S-1 | `Y`, `N`, or `L` (Limited) |
| `EAS` | date | AAA | End of Active Service, ISO date |
| `EDD` | date | AAA | End of Duty Date, ISO date |
| `ReportDate` | date | system | Date the morning report was pulled |
| `Location` | string | AAA | Geographic location |
| `StartDate` | date | AAA | Start date for current duty status |
| `EndDate` | date | AAA | End date if known, blank if open |
| `AttachedFromUIC` | string | S-1 | Parent UIC if attached IN to this unit |
| `DetachedToUIC` | string | S-1 | Gaining UIC if detached OUT |
| `IAJIATasking` | string | S-1 | IA / JIA tasking name if applicable |

### Duty Status values used

- Present for Duty
- Field Duty
- Telework
- Special Liberty
- Leave Annual
- Leave Terminal
- Leave Parental
- Convalescent
- Medical SIQ
- Medical Hospital
- TAD 30 days or less
- TAD 31+ days
- TAD Permissive
- IA Tasking
- Pregnancy
- Awaiting Med Board

### DLC codes used in samples (subset of MCO 3000.13B Appendix)

| Code | Meaning |
| --- | --- |
| `B` | Insufficient Active Service |
| `D` | Medical Non-Deployable |
| `E` | Admin Non-Deployable |
| `G` | LOD SIQ or Light Duty |
| `N` | Pregnancy |
| `P` | 17+ Years Service |
| `Q` | Pending Med Board |

The calculator treats `N` (non-deployable) as always subtracted from the
numerator, and `L` (limited duty) as subtracted by default with a unit
policy toggle to count as effective instead.

---

## File 2: `to structure example.csv`

One row per authorized billet bucket. Aggregated by BMOS and PayGrade.

| Column | Type | Source | Notes |
| --- | --- | --- | --- |
| `Unit` | string | TFSMS | UIC |
| `UnitName` | string | TFSMS | Full descriptor |
| `BMOS` | string | TFSMS | Billet MOS |
| `PayGrade` | string | TFSMS | Authorized grade for the billet |
| `Authorized` | integer | TFSMS | Count of authorized billets at this BMOS + grade |
| `BilletDescription` | string | TFSMS | Optional title for visibility |

---

## File 3: `critical mos example.csv`

Static reference list of mission-essential MOS for this unit type. Per
MCO 3000.13B, the critical MOS list is set by the unit type T/O. Update
this file when the unit changes type or when DC PP&O publishes revisions.

| Column | Type | Notes |
| --- | --- | --- |
| `MOS` | string | The MOS code |
| `Description` | string | Plain English |
| `Category` | string | Officer, Enlisted, or Navy |
| `UnitType` | string | The unit type this list applies to |

---

## P-Level Calculation Reference

Per MCO 3000.13B paragraph 7c.

### Personnel Strength Percentage

```
Numerator = (Assigned + Attached) − Non-Deployable
Denominator = Total Authorized from T/O
Percentage = Numerator / Denominator × 100
```

Detached, IA, and JIA Marines are **not** in the subtraction term —
their DRRSStatus places them outside the Assigned+Attached pool, so
subtracting them again would double-count. The calculator treats
`DeployableFlag = N` as always non-deployable. By default
`DeployableFlag = L` (Limited Duty) is also subtracted; this is a unit
policy toggle in the UI.

### Critical MOS Percentage

```
Numerator = Critical Billets Filled (greedy match, see below)
Denominator = Critical Billets Authorized from T/O
Percentage = Numerator / Denominator × 100
```

A critical billet is considered filled when a qualifying Marine can be
matched to it under these rules:

- **BMOS primary, PMOS secondary.** If the Marine's BMOS is on the
  critical list, the match is BMOS. Otherwise if the PMOS is on the
  critical list, the match is PMOS.
- **Exact grade preferred, ±1 grade fallback.** The calculator runs four
  greedy passes in order: BMOS exact → BMOS ±1 → PMOS exact → PMOS ±1.
- **±1 stays on the ladder.** `E`, `W`, and `O` are separate ladders. An
  E-grade Marine cannot fill a W or O billet even at ±1 distance.
- **No double counting.** Each Marine fills at most one critical billet.
- **Only deployable ASSIGNED/ATTACHED count.** Detached, IA, JIA,
  `DLC = N`, and `DLC = L` Marines are excluded from the candidate pool.

### Band table

| P-Level | Personnel Strength % | Critical MOS % |
| --- | --- | --- |
| P-1 | 90 – 100 | 85 – 100 |
| P-2 | 80 – 89 | 75 – 84 |
| P-3 | 70 – 79 | 65 – 74 |
| P-4 | 0 – 69 | 0 – 64 |

Final P-Level is the **lower** of the two percentages mapped against the
band table. Contractors are excluded. P-6 only by direction of HQMC
PP&O.

### Reconciliation with the PDF

The original `SCHEMA.pdf` renders the Personnel Strength numerator as:

> `Numerator = (Assigned + Attached) − (Detached + Non-Deployable + IA + JIA)`

And the Critical MOS numerator in parallel shape. That formulation
double-subtracts Detached / IA / JIA, which are already excluded from
the Assigned+Attached pool by DRRSStatus. The calculator implements the
reconciled form above; the band table, the ±1 rule, the BMOS/PMOS
hierarchy, and the contractor exclusion are unchanged from the PDF.
