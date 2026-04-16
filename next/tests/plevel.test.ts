/**
 * Calculator tests — plevel.ts
 *
 * Covers: withinOneGrade, bandFor, calculate (including ±1 fills,
 * PMOS fills, paygrade-ladder crossing, contractor filtering,
 * limited-duty toggle, empty inputs, band boundaries).
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { withinOneGrade, bandFor, calculate } from "../src/lib/plevel";
import { normalizeRoster, normalizeStructure, normalizeCritical } from "../src/lib/parser";

// ---------------------------------------------------------------------------
// Helpers — naive CSV parser for sample files (no PapaParse in tests)
// ---------------------------------------------------------------------------

function loadCSV(filePath: string): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  const lines = raw.split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const o: Record<string, string> = {};
    headers.forEach((h, i) => (o[h] = (cells[i] || "").trim()));
    return o;
  });
}

const SAMPLES = path.join(__dirname, "..", "public", "samples");

function loadSampleData() {
  const roster = normalizeRoster(loadCSV(path.join(SAMPLES, "alpha roster example.csv")));
  const structure = normalizeStructure(loadCSV(path.join(SAMPLES, "to structure example.csv")));
  const critical = normalizeCritical(loadCSV(path.join(SAMPLES, "critical mos example.csv")));
  return { roster, structure, critical };
}

// ---------------------------------------------------------------------------
// withinOneGrade
// ---------------------------------------------------------------------------

describe("withinOneGrade", () => {
  it("exact match on same ladder", () => {
    expect(withinOneGrade("E5", "E5")).toBe(true);
  });

  it("+1 on enlisted ladder", () => {
    expect(withinOneGrade("E5", "E6")).toBe(true);
    expect(withinOneGrade("E6", "E5")).toBe(true);
  });

  it("-1 on officer ladder", () => {
    expect(withinOneGrade("O3", "O4")).toBe(true);
  });

  it("rejects ±2 on same ladder", () => {
    expect(withinOneGrade("E5", "E7")).toBe(false);
  });

  it("rejects cross-ladder (E vs O)", () => {
    expect(withinOneGrade("E5", "O5")).toBe(false);
  });

  it("rejects cross-ladder (E vs W)", () => {
    expect(withinOneGrade("E7", "W1")).toBe(false);
  });

  it("handles edge of enlisted ladder (E1)", () => {
    expect(withinOneGrade("E1", "E2")).toBe(true);
    expect(withinOneGrade("E1", "E1")).toBe(true);
    expect(withinOneGrade("E1", "E3")).toBe(false);
  });

  it("handles top of enlisted ladder (E9)", () => {
    expect(withinOneGrade("E9", "E8")).toBe(true);
    expect(withinOneGrade("E9", "E7")).toBe(false);
  });

  it("handles empty / invalid grades", () => {
    expect(withinOneGrade("", "E5")).toBe(false);
    expect(withinOneGrade("E5", "")).toBe(false);
    expect(withinOneGrade("X1", "E5")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(withinOneGrade("e5", "E6")).toBe(true);
  });

  it("warrant officer ladder", () => {
    expect(withinOneGrade("W2", "W3")).toBe(true);
    expect(withinOneGrade("W2", "W4")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// bandFor
// ---------------------------------------------------------------------------

describe("bandFor", () => {
  it("P-1 when both >= thresholds", () => {
    const b = bandFor(95, 90);
    expect(b.finalBand).toBe(1);
    expect(b.pBand).toBe(1);
    expect(b.cBand).toBe(1);
  });

  it("P-2 driven by personnel", () => {
    const b = bandFor(85, 90);
    expect(b.finalBand).toBe(2);
    expect(b.pBand).toBe(2);
    expect(b.cBand).toBe(1);
    expect(b.driver).toMatch(/personnel/i);
  });

  it("P-3 driven by critical MOS", () => {
    const b = bandFor(92, 70);
    expect(b.finalBand).toBe(3);
    expect(b.cBand).toBe(3);
  });

  it("P-4 at 0%", () => {
    const b = bandFor(0, 0);
    expect(b.finalBand).toBe(4);
  });

  it("exact boundary: 90% PS is P-1", () => {
    expect(bandFor(90, 100).pBand).toBe(1);
  });

  it("just below boundary: 89.9% PS is P-2", () => {
    expect(bandFor(89.9, 100).pBand).toBe(2);
  });

  it("exact boundary: 85% CM is P-1", () => {
    expect(bandFor(100, 85).cBand).toBe(1);
  });

  it("just below boundary: 84.9% CM is P-2", () => {
    expect(bandFor(100, 84.9).cBand).toBe(2);
  });

  it("aligned bands", () => {
    const b = bandFor(85, 80);
    expect(b.finalBand).toBe(2);
    expect(b.driver).toMatch(/aligned/i);
  });
});

// ---------------------------------------------------------------------------
// calculate — full integration against sample data
// ---------------------------------------------------------------------------

describe("calculate (sample data)", () => {
  const { roster, structure, critical } = loadSampleData();

  it("produces P-4 on sample data", () => {
    const res = calculate(roster, structure, critical);
    expect(res.pLevel).toBe("P-4");
    expect(res.band.finalBand).toBe(4);
  });

  it("personnel strength matches expected values", () => {
    const res = calculate(roster, structure, critical);
    expect(res.personnel.assigned).toBe(145);
    expect(res.personnel.attached).toBe(5);
    expect(res.personnel.authorized).toBe(218);
    expect(res.personnel.effective).toBe(138);
    expect(res.personnel.pct).toBeCloseTo(63.3, 0);
  });

  it("critical MOS matches expected values", () => {
    const res = calculate(roster, structure, critical);
    expect(res.critical.filled).toBe(110);
    expect(res.critical.authorized).toBe(161);
    expect(res.critical.pct).toBeCloseTo(68.3, 0);
  });

  it("exercises ±1 and PMOS fill paths", () => {
    const res = calculate(roster, structure, critical);
    const s = res.critical.fillSummary;
    expect(s.exactBMOS).toBe(108);
    expect(s.flexBMOS).toBe(1);
    expect(s.exactPMOS).toBe(1);
    expect(s.flexPMOS).toBe(0);
    expect(s.unfilled).toBe(51);
  });

  it("driver is personnel strength", () => {
    const res = calculate(roster, structure, critical);
    expect(res.band.driver).toMatch(/personnel/i);
  });

  it("audit trail has one row per critical billet", () => {
    const res = calculate(roster, structure, critical);
    expect(res.critical.audit.length).toBe(161);
  });

  it("no contractors excluded in sample", () => {
    const res = calculate(roster, structure, critical);
    expect(res.excludedContractors).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculate — contractor filtering
// ---------------------------------------------------------------------------

describe("calculate (contractor filtering)", () => {
  const { roster, structure, critical } = loadSampleData();

  it("excludes CTR service rows", () => {
    const withContractor = [
      ...roster,
      { ...roster[0], EDIPI: "9999999999", Service: "CTR", DRRSStatus: "ASSIGNED", DeployableFlag: "Y" },
    ];
    const res = calculate(withContractor, structure, critical);
    expect(res.excludedContractors).toBe(1);
    // PS numbers should be same as without the contractor
    const baseline = calculate(roster, structure, critical);
    expect(res.personnel.effective).toBe(baseline.personnel.effective);
  });
});

// ---------------------------------------------------------------------------
// calculate — limited duty toggle
// ---------------------------------------------------------------------------

describe("calculate (limited duty toggle)", () => {
  const { roster, structure, critical } = loadSampleData();

  it("default subtracts limited-duty Marines", () => {
    const res = calculate(roster, structure, critical);
    expect(res.options.countLimitedAsNonDeployable).toBe(true);
    expect(res.personnel.limitedSubtracted).toBe(res.personnel.limited);
  });

  it("toggle off counts limited as effective", () => {
    const res = calculate(roster, structure, critical, { countLimitedAsNonDeployable: false });
    expect(res.options.countLimitedAsNonDeployable).toBe(false);
    expect(res.personnel.limitedSubtracted).toBe(0);
    // PS should be higher when limited are counted
    const resDefault = calculate(roster, structure, critical);
    expect(res.personnel.pct).toBeGreaterThan(resDefault.personnel.pct);
  });
});

// ---------------------------------------------------------------------------
// calculate — edge cases
// ---------------------------------------------------------------------------

describe("calculate (edge cases)", () => {
  it("handles empty roster", () => {
    const res = calculate([], [{ Unit: "X", BMOS: "0311", PayGrade: "E5", Authorized: 10 }], []);
    expect(res.personnel.effective).toBe(0);
    expect(res.personnel.pct).toBe(0);
    expect(res.pLevel).toBe("P-4");
  });

  it("handles zero authorized (empty T/O)", () => {
    const res = calculate(
      [{ EDIPI: "1234567890", LastName: "A", FirstName: "B", Rank: "CPL", PayGrade: "E4", Service: "USMC", Component: "AD", BMOS: "0311", PMOS: "0311", DRRSStatus: "ASSIGNED", DeployableFlag: "Y" }],
      [],
      [],
    );
    expect(res.personnel.authorized).toBe(0);
    expect(res.personnel.pct).toBe(0);
  });

  it("handles zero critical billets", () => {
    const { roster, structure } = loadSampleData();
    const res = calculate(roster, structure, []);
    expect(res.critical.authorized).toBe(0);
    expect(res.critical.filled).toBe(0);
    expect(res.critical.pct).toBe(0);
  });
});
