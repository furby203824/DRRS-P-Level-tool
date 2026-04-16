/**
 * Parser tests — parser.ts
 *
 * Covers: validate (schema checks, per-row errors + warnings),
 * normalizeRoster, normalizeStructure, normalizeCritical.
 */

import { describe, it, expect } from "vitest";
import { validate, normalizeRoster, normalizeStructure, normalizeCritical } from "../src/lib/parser";

// ---------------------------------------------------------------------------
// validate — roster
// ---------------------------------------------------------------------------

describe("validate roster", () => {
  it("rejects empty file", () => {
    const v = validate("roster", []);
    expect(v.errors.length).toBeGreaterThan(0);
    expect(v.errors[0]).toMatch(/empty/i);
  });

  it("rejects missing required columns", () => {
    const v = validate("roster", [{ Foo: "bar" }]);
    expect(v.errors.length).toBeGreaterThan(0);
    expect(v.errors[0]).toMatch(/missing required/i);
  });

  it("reports missing EDIPI as error", () => {
    const row = makeRosterRow({ EDIPI: "" });
    const v = validate("roster", [row]);
    expect(v.errors.some((e) => /missing EDIPI/i.test(e))).toBe(true);
  });

  it("warns on short EDIPI", () => {
    const row = makeRosterRow({ EDIPI: "123" });
    const v = validate("roster", [row]);
    expect(v.warnings.some((w) => /not 10 digits/i.test(w))).toBe(true);
    expect(v.errors.length).toBe(0); // warning, not error
  });

  it("warns on unknown DRRSStatus", () => {
    const row = makeRosterRow({ DRRSStatus: "BOGUS" });
    const v = validate("roster", [row]);
    expect(v.warnings.some((w) => /DRRSStatus/i.test(w))).toBe(true);
  });

  it("warns on unknown DeployableFlag", () => {
    const row = makeRosterRow({ DeployableFlag: "X" });
    const v = validate("roster", [row]);
    expect(v.warnings.some((w) => /DeployableFlag/i.test(w))).toBe(true);
  });

  it("warns on unrecognized PayGrade", () => {
    const row = makeRosterRow({ PayGrade: "Z9" });
    const v = validate("roster", [row]);
    expect(v.warnings.some((w) => /PayGrade/i.test(w))).toBe(true);
  });

  it("warns on missing BMOS", () => {
    const row = makeRosterRow({ BMOS: "" });
    const v = validate("roster", [row]);
    expect(v.warnings.some((w) => /BMOS/i.test(w))).toBe(true);
  });

  it("passes clean row without errors or warnings", () => {
    const row = makeRosterRow({});
    const v = validate("roster", [row]);
    expect(v.errors.length).toBe(0);
    expect(v.warnings.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validate — structure
// ---------------------------------------------------------------------------

describe("validate structure", () => {
  it("rejects missing BMOS", () => {
    const v = validate("structure", [{ Unit: "X", BMOS: "", PayGrade: "E5", Authorized: "2" }]);
    expect(v.errors.some((e) => /missing BMOS/i.test(e))).toBe(true);
  });

  it("rejects non-numeric Authorized", () => {
    const v = validate("structure", [{ Unit: "X", BMOS: "0311", PayGrade: "E5", Authorized: "abc" }]);
    expect(v.errors.some((e) => /non-numeric/i.test(e))).toBe(true);
  });

  it("rejects negative Authorized", () => {
    const v = validate("structure", [{ Unit: "X", BMOS: "0311", PayGrade: "E5", Authorized: "-3" }]);
    expect(v.errors.some((e) => /negative/i.test(e))).toBe(true);
  });

  it("passes clean row", () => {
    const v = validate("structure", [{ Unit: "X", BMOS: "0311", PayGrade: "E5", Authorized: "2" }]);
    expect(v.errors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// validate — critical
// ---------------------------------------------------------------------------

describe("validate critical", () => {
  it("rejects missing MOS", () => {
    const v = validate("critical", [{ MOS: "", Description: "Test", Category: "Enlisted" }]);
    expect(v.errors.some((e) => /missing MOS/i.test(e))).toBe(true);
  });

  it("warns on duplicate MOS", () => {
    const v = validate("critical", [
      { MOS: "0311", Description: "Rifleman", Category: "Enlisted" },
      { MOS: "0311", Description: "Rifleman", Category: "Enlisted" },
    ]);
    expect(v.warnings.some((w) => /duplicate/i.test(w))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeRoster
// ---------------------------------------------------------------------------

describe("normalizeRoster", () => {
  it("uppercases DRRSStatus and DeployableFlag", () => {
    const rows = normalizeRoster([makeRosterRow({ DRRSStatus: "assigned", DeployableFlag: "y" })]);
    expect(rows[0].DRRSStatus).toBe("ASSIGNED");
    expect(rows[0].DeployableFlag).toBe("Y");
  });

  it("trims whitespace", () => {
    const rows = normalizeRoster([makeRosterRow({ EDIPI: " 1234567890 " })]);
    expect(rows[0].EDIPI).toBe("1234567890");
  });
});

// ---------------------------------------------------------------------------
// normalizeStructure
// ---------------------------------------------------------------------------

describe("normalizeStructure", () => {
  it("parses Authorized as integer", () => {
    const rows = normalizeStructure([{ Unit: "X", BMOS: "0311", PayGrade: "e5", Authorized: "3" }]);
    expect(rows[0].Authorized).toBe(3);
    expect(rows[0].PayGrade).toBe("E5");
  });

  it("coerces non-numeric Authorized to 0", () => {
    const rows = normalizeStructure([{ Unit: "X", BMOS: "0311", PayGrade: "E5", Authorized: "abc" }]);
    expect(rows[0].Authorized).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// normalizeCritical
// ---------------------------------------------------------------------------

describe("normalizeCritical", () => {
  it("filters out rows with empty MOS", () => {
    const rows = normalizeCritical([
      { MOS: "0311", Description: "Rifleman", Category: "Enlisted" },
      { MOS: "", Description: "Empty", Category: "Enlisted" },
    ]);
    expect(rows.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRosterRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    EDIPI: "9900000001",
    LastName: "DOE",
    FirstName: "JOHN",
    Rank: "CPL",
    PayGrade: "E4",
    Service: "USMC",
    Component: "AD",
    Unit: "M00001",
    BMOS: "0311",
    PMOS: "0311",
    Category: "On Hand",
    DutyStatus: "Present for Duty",
    DRRSStatus: "ASSIGNED",
    DeployableFlag: "Y",
    ...overrides,
  };
}
