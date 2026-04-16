/**
 * Brief builder + sanitizer tests — brief.ts
 */

import { describe, it, expect } from "vitest";
import { formatDateDDMMMYY, parseAsOfDate, suggestReasonCode, buildReadinessBrief, sanitizeForDRRS, DRRS_REMARKS_LIMIT } from "../src/lib/brief";
import { calculate } from "../src/lib/plevel";
import { normalizeRoster, normalizeStructure, normalizeCritical } from "../src/lib/parser";
import fs from "fs";
import path from "path";

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

function sampleResult() {
  const roster = normalizeRoster(loadCSV(path.join(SAMPLES, "alpha roster example.csv")));
  const structure = normalizeStructure(loadCSV(path.join(SAMPLES, "to structure example.csv")));
  const critical = normalizeCritical(loadCSV(path.join(SAMPLES, "critical mos example.csv")));
  return calculate(roster, structure, critical);
}

// ---------------------------------------------------------------------------
// formatDateDDMMMYY
// ---------------------------------------------------------------------------

describe("formatDateDDMMMYY", () => {
  it("formats Jan 5, 2026 as 05JAN26", () => {
    expect(formatDateDDMMMYY(new Date(2026, 0, 5))).toBe("05JAN26");
  });

  it("formats Dec 31, 2030 as 31DEC30", () => {
    expect(formatDateDDMMMYY(new Date(2030, 11, 31))).toBe("31DEC30");
  });

  it("zero-pads single-digit days", () => {
    expect(formatDateDDMMMYY(new Date(2026, 3, 1))).toBe("01APR26");
  });
});

// ---------------------------------------------------------------------------
// parseAsOfDate
// ---------------------------------------------------------------------------

describe("parseAsOfDate", () => {
  it("parses YYYY-MM-DD", () => {
    const d = parseAsOfDate("2026-04-15");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(3); // April = 3
    expect(d!.getDate()).toBe(15);
  });

  it("returns null for empty string", () => {
    expect(parseAsOfDate("")).toBeNull();
  });

  it("returns null for invalid format", () => {
    expect(parseAsOfDate("15APR26")).toBeNull();
    expect(parseAsOfDate("April 15, 2026")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// suggestReasonCode
// ---------------------------------------------------------------------------

describe("suggestReasonCode", () => {
  it("returns null at P-1", () => {
    // Fake a P-1 result
    const res = sampleResult();
    res.band.finalBand = 1;
    res.band.pBand = 1;
    res.band.cBand = 1;
    expect(suggestReasonCode(res)).toBeNull();
  });

  it("returns S-MANPOWER when PS is binding", () => {
    const res = sampleResult();
    // Sample is P-4 driven by PS
    expect(suggestReasonCode(res)).toBe("S-MANPOWER");
  });

  it("returns S-MOS-QUAL when CM is binding", () => {
    const res = sampleResult();
    res.band.pBand = 1;
    res.band.cBand = 3;
    res.band.finalBand = 3;
    expect(suggestReasonCode(res)).toBe("S-MOS-QUAL");
  });

  it("returns S-MANPOWER when aligned at sub-P-1", () => {
    const res = sampleResult();
    res.band.pBand = 2;
    res.band.cBand = 2;
    res.band.finalBand = 2;
    expect(suggestReasonCode(res)).toBe("S-MANPOWER");
  });
});

// ---------------------------------------------------------------------------
// buildReadinessBrief
// ---------------------------------------------------------------------------

describe("buildReadinessBrief", () => {
  it("includes BLUF line with P-Level", () => {
    const res = sampleResult();
    const unit = { uic: "M00378", name: "CLB-3 H&S Co", asOf: "2026-04-15" };
    const brief = buildReadinessBrief(res, unit, new Date(2026, 3, 15), new Date());
    expect(brief).toContain("BLUF:");
    expect(brief).toContain("P-4");
  });

  it("includes ACTIONS and RESULTS placeholders", () => {
    const res = sampleResult();
    const unit = { uic: "M00378", name: "Test", asOf: "2026-04-15" };
    const brief = buildReadinessBrief(res, unit, new Date(2026, 3, 15), new Date());
    expect(brief).toContain("ACTIONS:");
    expect(brief).toContain("RESULTS:");
    expect(brief).toContain("[S-1 to fill:");
  });

  it("includes UNIT line", () => {
    const res = sampleResult();
    const unit = { uic: "02301H", name: "H&S CO CLB", asOf: "2026-04-15" };
    const brief = buildReadinessBrief(res, unit, new Date(2026, 3, 15), new Date());
    expect(brief).toContain("UNIT: 02301H");
  });

  it("uses NOUIC when UIC is empty", () => {
    const res = sampleResult();
    const unit = { uic: "", name: "", asOf: "2026-04-15" };
    const brief = buildReadinessBrief(res, unit, new Date(2026, 3, 15), new Date());
    expect(brief).toContain("UNIT: NOUIC");
  });

  it("is under the DRRS remarks char limit with default placeholders", () => {
    const res = sampleResult();
    const unit = { uic: "M00378", name: "Test Unit", asOf: "2026-04-15" };
    const brief = buildReadinessBrief(res, unit, new Date(2026, 3, 15), new Date());
    expect(brief.length).toBeLessThan(DRRS_REMARKS_LIMIT);
  });

  it("includes REASON CODE", () => {
    const res = sampleResult();
    const unit = { uic: "X", name: "", asOf: "" };
    const brief = buildReadinessBrief(res, unit, new Date(), new Date());
    expect(brief).toContain("REASON CODE");
  });
});

// ---------------------------------------------------------------------------
// sanitizeForDRRS
// ---------------------------------------------------------------------------

describe("sanitizeForDRRS", () => {
  it("replaces curly quotes with straight", () => {
    expect(sanitizeForDRRS("\u201CHello\u201D")).toBe('"Hello"');
    expect(sanitizeForDRRS("\u2018it\u2019s")).toBe("'it's");
  });

  it("replaces em-dash and en-dash with hyphen", () => {
    expect(sanitizeForDRRS("A\u2014B")).toBe("A-B");
    expect(sanitizeForDRRS("A\u2013B")).toBe("A-B");
  });

  it("replaces ellipsis character", () => {
    expect(sanitizeForDRRS("wait\u2026")).toBe("wait...");
  });

  it("replaces right arrow", () => {
    expect(sanitizeForDRRS("\u2192")).toBe("->");
  });

  it("strips zero-width chars", () => {
    expect(sanitizeForDRRS("a\u200Bb\uFEFFc")).toBe("abc");
  });

  it("replaces non-breaking space with regular space", () => {
    expect(sanitizeForDRRS("a\u00A0b")).toBe("a b");
  });

  it("replaces remaining non-ASCII with ?", () => {
    expect(sanitizeForDRRS("caf\u00E9")).toBe("caf?");
  });

  it("preserves newlines", () => {
    expect(sanitizeForDRRS("line1\nline2")).toBe("line1\nline2");
  });

  it("is idempotent", () => {
    const input = "Hello \u201Cworld\u201D \u2014 test\u2026";
    const once = sanitizeForDRRS(input);
    const twice = sanitizeForDRRS(once);
    expect(once).toBe(twice);
  });
});
