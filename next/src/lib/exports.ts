/**
 * PDF and XLSX export helpers.
 *
 * jsPDF for the CO brief PDF; SheetJS (xlsx) for the S-1 audit XLSX.
 * Both are tree-shaken by the Next.js bundler and only loaded client-
 * side behind dynamic imports.
 */

import type { CalcResult, AuditRow, BreakdownRow } from "./plevel";
import { formatDateDDMMMYY, parseAsOfDate } from "./brief";

// ---------------------------------------------------------------------------
// PDF export (CO brief)
// ---------------------------------------------------------------------------

interface PdfUnit {
  uic: string;
  name: string;
  asOf: string;
}

export async function exportPDF(
  result: CalcResult,
  unit: PdfUnit,
  briefText: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 40;
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  // Header
  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  doc.text("DRRS PERSONNEL READINESS", margin, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont("courier", "normal");
  const unitLine = unit.name
    ? `UNIT: ${unit.uic || "NOUIC"} - ${unit.name.toUpperCase()}`
    : `UNIT: ${unit.uic || "NOUIC"}`;
  doc.text(unitLine, margin, y);
  y += 14;
  const asOf = parseAsOfDate(unit.asOf) ?? new Date();
  doc.text(`AS OF: ${formatDateDDMMMYY(asOf)}`, margin, y);
  y += 14;
  doc.text(`MCO 3000.13B para 7c`, margin, y);
  y += 20;

  // P-Level banner
  doc.setFont("courier", "bold");
  doc.setFontSize(28);
  doc.text(result.pLevel, margin, y);
  doc.setFontSize(10);
  doc.setFont("courier", "normal");
  doc.text(`  ${result.band.driver}`, margin + 70, y);
  y += 24;

  // Personnel Strength
  const p = result.personnel;
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text(`PERSONNEL STRENGTH: ${p.pct.toFixed(1)}% (${p.effective} / ${p.authorized})`, margin, y);
  y += 14;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text(`  ASG ${p.assigned} / ATT ${p.attached} / NON-DEP ${p.nonDeployable} / LTD ${p.limited} / DET ${p.detached} / IA ${p.ia} / JIA ${p.jia}`, margin, y);
  y += 18;

  // Critical MOS
  const c = result.critical;
  const s = c.fillSummary;
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text(`CRITICAL MOS: ${c.pct.toFixed(1)}% (${c.filled} / ${c.authorized})`, margin, y);
  y += 14;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.text(`  BMOS EX ${s.exactBMOS} / BMOS ±1 ${s.flexBMOS} / PMOS EX ${s.exactPMOS} / PMOS ±1 ${s.flexPMOS} / GAPS ${s.unfilled}`, margin, y);
  y += 22;

  // Brief text
  doc.setFontSize(8);
  const lines = doc.splitTextToSize(briefText, pageW - margin * 2);
  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 10;
  }
  y += 10;

  // Critical MOS breakdown table
  if (result.critical.breakdown.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 120) { doc.addPage(); y = margin; }
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      styles: { font: "courier", fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [31, 58, 95] },
      head: [["MOS", "Description", "Grade", "Auth", "Fill", "Fill %"]],
      body: result.critical.breakdown.map((row: BreakdownRow) => {
        const pct = row.Authorized > 0 ? ((row.Filled / row.Authorized) * 100).toFixed(0) + "%" : "—";
        return [row.MOS, row.Description, row.PayGrade, row.Authorized, row.Filled, pct];
      }),
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("courier", "normal");
    const footY = doc.internal.pageSize.getHeight() - 20;
    doc.text(
      `DRRS P-Level Calculator (POC) — MCO 3000.13B para 7c — Printed ${new Date().toISOString()}`,
      margin, footY,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin - 50, footY);
  }

  const stamp = formatDateDDMMMYY(asOf).toLowerCase();
  const uicPart = (unit.uic || "NOUIC").replace(/[^A-Za-z0-9_-]+/g, "").slice(0, 16);
  doc.save(`plevel-${uicPart}-${stamp}.pdf`);
}

// ---------------------------------------------------------------------------
// XLSX export (S-1 audit workbook)
// ---------------------------------------------------------------------------

export async function exportXLSX(
  result: CalcResult,
  unit: PdfUnit,
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Sheet 1: Roster summary (calculation inputs)
  const p = result.personnel;
  const summaryData = [
    ["Unit", unit.uic || "NOUIC"],
    ["Unit Name", unit.name || ""],
    ["As-Of Date", unit.asOf || ""],
    [""],
    ["PERSONNEL STRENGTH"],
    ["Assigned", p.assigned],
    ["Attached", p.attached],
    ["Non-Deployable (DLC=N)", p.nonDeployable],
    ["Limited (DLC=L)", p.limited],
    ["Detached (excluded)", p.detached],
    ["IA (excluded)", p.ia],
    ["JIA (excluded)", p.jia],
    ["Effective Numerator", p.effective],
    ["Authorized (T/O)", p.authorized],
    ["Percentage", `${p.pct.toFixed(1)}%`],
    [""],
    ["CRITICAL MOS"],
    ["Filled", result.critical.filled],
    ["Authorized", result.critical.authorized],
    ["Percentage", `${result.critical.pct.toFixed(1)}%`],
    ["BMOS Exact", result.critical.fillSummary.exactBMOS],
    ["BMOS ±1", result.critical.fillSummary.flexBMOS],
    ["PMOS Exact", result.critical.fillSummary.exactPMOS],
    ["PMOS ±1", result.critical.fillSummary.flexPMOS],
    ["Gaps", result.critical.fillSummary.unfilled],
    [""],
    ["RESULT"],
    ["P-Level", result.pLevel],
    ["PS Band", `P-${result.band.pBand}`],
    ["CM Band", `P-${result.band.cBand}`],
    ["Driver", result.band.driver],
    ["Excluded Contractors", result.excludedContractors],
    ["Limited Duty Policy", result.options.countLimitedAsNonDeployable ? "Subtracted" : "Counted as effective"],
    ["Reference", "MCO 3000.13B para 7c"],
    ["Computed", new Date().toISOString()],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"] = [{ wch: 28 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Calculation");

  // Sheet 2: Critical MOS breakdown
  const bdHeader = ["MOS", "Description", "PayGrade", "Authorized", "Filled", "Fill %"];
  const bdRows = result.critical.breakdown.map((row: BreakdownRow) => [
    row.MOS, row.Description, row.PayGrade, row.Authorized, row.Filled,
    row.Authorized > 0 ? `${((row.Filled / row.Authorized) * 100).toFixed(0)}%` : "—",
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([bdHeader, ...bdRows]);
  ws2["!cols"] = [{ wch: 8 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws2, "CM Breakdown");

  // Sheet 3: Per-billet audit trail
  const auditHeader = ["MOS", "Description", "Auth Grade", "Status", "Filler EDIPI", "Filler Name", "Filler Grade", "BMOS", "PMOS", "Fill Source", "Match Type"];
  const auditRows = result.critical.audit.map((row: AuditRow) => [
    row.MOS, row.Description, row.AuthorizedPayGrade,
    row.Filled ? "FILLED" : "UNFILLED",
    row.FillerEDIPI, row.FillerName, row.FillerPayGrade,
    row.FillerBMOS, row.FillerPMOS,
    row.FillSource ?? "", row.MatchType ?? "",
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([auditHeader, ...auditRows]);
  ws3["!cols"] = [{ wch: 8 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 28 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Audit Trail");

  const asOf = parseAsOfDate(unit.asOf) ?? new Date();
  const stamp = formatDateDDMMMYY(asOf).toLowerCase();
  const uicPart = (unit.uic || "NOUIC").replace(/[^A-Za-z0-9_-]+/g, "").slice(0, 16);
  XLSX.writeFile(wb, `plevel-audit-${uicPart}-${stamp}.xlsx`);
}
