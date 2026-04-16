"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Papa from "papaparse";

import { calculate, type CalcResult, type RosterRow, type StructureRow, type CriticalRow } from "@/lib/plevel";
import { validate, normalizeRoster, normalizeStructure, normalizeCritical, type FileKind, type ValidationResult } from "@/lib/parser";
import { buildReadinessBrief, sanitizeForDRRS, formatDateDDMMMYY, parseAsOfDate, DRRS_REMARKS_LIMIT, ACTIONS_PLACEHOLDER, RESULTS_PLACEHOLDER } from "@/lib/brief";

import { Calculator as CalcIcon, Copy, RotateCcw, AlertTriangle, TrendingDown, Download, Shuffle } from "lucide-react";
import { PLevelBadge } from "./PLevelBadge";
import { MetricRow } from "./MetricRow";
import { FileSlot } from "./FileSlot";
import { AuditTable } from "./AuditTable";
import { HistoryPanel } from "./HistoryPanel";
import { saveSnapshot, snapshotFromResult } from "@/lib/history";
import { exportPDF, exportXLSX } from "@/lib/exports";
import { loadProfile, saveProfile, clearProfile, encryptProfile, decryptProfile, CRYPTO_MIN_PASSPHRASE, PROFILE_KEY, type ProfileData, type EncryptedEnvelope } from "@/lib/persistence";
import { HISTORY_STORAGE_KEY, clearHistory as clearHistoryStorage } from "@/lib/history";
import { generateUnit } from "@/lib/generate";

// ---------------------------------------------------------------------------
// Sample CSV paths (relative to basePath, served from public/samples/)
// ---------------------------------------------------------------------------

const SAMPLE_PATHS: Record<FileKind, string> = {
  roster: "samples/alpha%20roster%20example.csv",
  structure: "samples/to%20structure%20example.csv",
  critical: "samples/critical%20mos%20example.csv",
};

function basePath(): string {
  return process.env.NODE_ENV === "production" ? "/DRRS-P-Level-tool" : "";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sanitizeForFilename(s: string): string {
  return (s || "").replace(/[^A-Za-z0-9_-]+/g, "").slice(0, 16) || "NOUIC";
}

function triggerDownload(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// CSV parse helper (wraps PapaParse in a promise)
// ---------------------------------------------------------------------------

function parseCSVFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h: string) => h.trim(),
      complete: (results) => {
        const fatal = results.errors?.find((e) => e.type !== "FieldMismatch");
        if (fatal) return reject(new Error(fatal.message));
        resolve(results.data);
      },
      error: (err: Error) => reject(err),
    });
  });
}

async function fetchSampleCSV(path: string): Promise<Record<string, string>[]> {
  const resp = await fetch(`${basePath()}/${path}`);
  if (!resp.ok) throw new Error(`Could not load ${path}`);
  const text = await resp.text();
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h: string) => h.trim(),
  });
  return result.data;
}

// ---------------------------------------------------------------------------
// Audit CSV builder
// ---------------------------------------------------------------------------

function buildAuditCSV(result: CalcResult): string {
  const audit = result.critical.audit;
  const header = [
    "MOS", "Description", "AuthorizedPayGrade", "BIC", "Status",
    "FillerEDIPI", "FillerName", "FillerPayGrade",
    "FillerBMOS", "FillerPMOS", "FillSource", "MatchType",
  ];
  const esc = (v: string | null | undefined) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [header.join(",")];
  for (const row of audit) {
    lines.push(
      [
        row.MOS, row.Description, row.AuthorizedPayGrade, row.BIC,
        row.Filled ? "FILLED" : "UNFILLED",
        row.FillerEDIPI, row.FillerName, row.FillerPayGrade,
        row.FillerBMOS, row.FillerPMOS,
        row.FillSource ?? "", row.MatchType ?? "",
      ].map(esc).join(","),
    );
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Calculator() {
  // CSV data
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [structure, setStructure] = useState<StructureRow[] | null>(null);
  const [critical, setCritical] = useState<CriticalRow[] | null>(null);

  // Validation
  const [validation, setValidation] = useState<Record<FileKind, ValidationResult | null>>({
    roster: null, structure: null, critical: null,
  });

  // Calc result
  const [result, setResult] = useState<CalcResult | null>(null);

  // Unit identity (derived from CSV)
  const [detectedUnit, setDetectedUnit] = useState({ uic: "", name: "" });

  // Operator inputs
  const [asOfDate, setAsOfDate] = useState(todayISO());
  const [limitedPolicy, setLimitedPolicy] = useState(true);
  const [drrsReady, setDrrsReady] = useState(true);

  // Brief
  const [briefText, setBriefText] = useState("");
  const briefRef = useRef<HTMLTextAreaElement>(null);

  // History refresh key — bump to re-read LocalStorage in HistoryPanel
  const [historyKey, setHistoryKey] = useState(0);

  // Profile encrypt toggle
  const [encryptExport, setEncryptExport] = useState(false);

  // Export status
  const [exportMsg, setExportMsg] = useState("");
  const exportTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function flashExport(msg: string) {
    setExportMsg(msg);
    clearTimeout(exportTimer.current);
    exportTimer.current = setTimeout(() => setExportMsg(""), 2500);
  }

  // Refresh detected unit from loaded CSVs
  const refreshUnit = useCallback(() => {
    const src = structure?.[0] ?? roster?.[0];
    setDetectedUnit({
      uic: (src as Record<string, string>)?.Unit?.trim() ?? "",
      name: (src as Record<string, string>)?.UnitName?.trim() ?? "",
    });
  }, [structure, roster]);

  useEffect(() => { refreshUnit(); }, [refreshUnit]);

  // Profile auto-load on mount
  useEffect(() => {
    const saved = loadProfile();
    if (saved) {
      if (saved.asOf) setAsOfDate(saved.asOf);
      if (typeof saved.policy?.countLimitedAsNonDeployable === "boolean")
        setLimitedPolicy(saved.policy.countLimitedAsNonDeployable);
    }
  }, []);

  // Profile auto-save on change
  useEffect(() => {
    saveProfile({ asOf: asOfDate, policy: { countLimitedAsNonDeployable: limitedPolicy } });
  }, [asOfDate, limitedPolicy]);

  // Handle file load for a slot
  const handleFile = useCallback(async (kind: FileKind, file: File) => {
    try {
      const rows = await parseCSVFile(file);
      const v = validate(kind, rows);
      setValidation((prev) => ({ ...prev, [kind]: v }));
      if (v.errors.length) {
        if (kind === "roster") setRoster(null);
        else if (kind === "structure") setStructure(null);
        else setCritical(null);
        return;
      }
      if (kind === "roster") setRoster(normalizeRoster(rows));
      else if (kind === "structure") setStructure(normalizeStructure(rows));
      else setCritical(normalizeCritical(rows));
    } catch (err) {
      setValidation((prev) => ({
        ...prev,
        [kind]: { errors: [`${kind}: ${(err as Error).message}`], warnings: [] },
      }));
    }
  }, []);

  // Load sample data
  const loadSample = useCallback(async () => {
    for (const kind of ["roster", "structure", "critical"] as FileKind[]) {
      try {
        const rows = await fetchSampleCSV(SAMPLE_PATHS[kind]);
        const v = validate(kind, rows);
        setValidation((prev) => ({ ...prev, [kind]: v }));
        if (v.errors.length) continue;
        if (kind === "roster") setRoster(normalizeRoster(rows));
        else if (kind === "structure") setStructure(normalizeStructure(rows));
        else setCritical(normalizeCritical(rows));
      } catch (err) {
        setValidation((prev) => ({
          ...prev,
          [kind]: { errors: [`${kind}: ${(err as Error).message}`], warnings: [] },
        }));
      }
    }
  }, []);

  // Generate random synthetic unit
  const loadRandom = useCallback(() => {
    const unit = generateUnit();
    setRoster(unit.roster);
    setStructure(unit.structure);
    setCritical(unit.critical);
    setValidation({ roster: null, structure: null, critical: null });
    setDetectedUnit({ uic: unit.uic, name: unit.unitName });
    setResult(null);
    setBriefText("");
  }, []);

  // Calculate
  const canCalculate = Boolean(roster && structure && critical);

  const doCalculate = useCallback(() => {
    if (!roster || !structure || !critical) return;
    const res = calculate(roster, structure, critical, {
      countLimitedAsNonDeployable: limitedPolicy,
    });
    setResult(res);

    // Generate the brief
    const unit = { uic: detectedUnit.uic, name: detectedUnit.name, asOf: asOfDate };
    const asOf = parseAsOfDate(asOfDate) ?? new Date();
    setBriefText(buildReadinessBrief(res, unit, asOf, new Date()));

    // Save aggregate snapshot to history
    saveSnapshot(snapshotFromResult(res, unit, asOfDate || todayISO()));
    setHistoryKey((k) => k + 1);
  }, [roster, structure, critical, limitedPolicy, detectedUnit, asOfDate]);

  // Reset
  const doReset = useCallback(() => {
    setRoster(null);
    setStructure(null);
    setCritical(null);
    setResult(null);
    setValidation({ roster: null, structure: null, critical: null });
    setBriefText("");
    setDetectedUnit({ uic: "", name: "" });
  }, []);

  // Exports
  const copyBrief = useCallback(async () => {
    let text = briefText;
    if (drrsReady) text = sanitizeForDRRS(text);
    try {
      await navigator.clipboard.writeText(text);
      flashExport(`Copied ${text.length} / ${DRRS_REMARKS_LIMIT} chars`);
    } catch {
      flashExport("Copy failed");
    }
  }, [briefText, drrsReady]);

  const downloadJSON = useCallback(() => {
    if (!result) return;
    const unit = { uic: detectedUnit.uic, name: detectedUnit.name, asOf: asOfDate };
    const payload = JSON.stringify({
      generatedAt: new Date().toISOString(),
      asOfDate: asOfDate || todayISO(),
      unit,
      reference: "MCO 3000.13B para 7c",
      result,
    }, null, 2);
    const stamp = formatDateDDMMMYY(parseAsOfDate(asOfDate) ?? new Date()).toLowerCase();
    triggerDownload(`plevel-${sanitizeForFilename(detectedUnit.uic)}-${stamp}.json`, "application/json", payload);
    flashExport("JSON downloaded");
  }, [result, detectedUnit, asOfDate]);

  const downloadCSV = useCallback(() => {
    if (!result) return;
    const csv = buildAuditCSV(result);
    const stamp = formatDateDDMMMYY(parseAsOfDate(asOfDate) ?? new Date()).toLowerCase();
    triggerDownload(`plevel-audit-${sanitizeForFilename(detectedUnit.uic)}-${stamp}.csv`, "text/csv", csv);
    flashExport("Audit CSV downloaded");
  }, [result, detectedUnit, asOfDate]);

  const downloadPDF = useCallback(async () => {
    if (!result) return;
    const unit = { uic: detectedUnit.uic, name: detectedUnit.name, asOf: asOfDate };
    try {
      await exportPDF(result, unit, briefText);
      flashExport("PDF downloaded");
    } catch (err) { flashExport("PDF failed: " + (err as Error).message); }
  }, [result, detectedUnit, asOfDate, briefText]);

  const downloadXLSX = useCallback(async () => {
    if (!result) return;
    const unit = { uic: detectedUnit.uic, name: detectedUnit.name, asOf: asOfDate };
    try {
      await exportXLSX(result, unit);
      flashExport("XLSX downloaded");
    } catch (err) { flashExport("XLSX failed: " + (err as Error).message); }
  }, [result, detectedUnit, asOfDate]);

  // Profile export/import
  const profileImportRef = useRef<HTMLInputElement>(null);

  const doExportProfile = useCallback(async () => {
    const profile: ProfileData = { asOf: asOfDate, policy: { countLimitedAsNonDeployable: limitedPolicy } };
    const uicPart = sanitizeForFilename(detectedUnit.uic);
    if (encryptExport) {
      const pass = prompt("Pick a passphrase for encryption (min 8 chars):");
      if (!pass || pass.length < CRYPTO_MIN_PASSPHRASE) { flashExport(pass ? "Too short" : "Cancelled"); return; }
      try {
        const env = await encryptProfile(profile, pass);
        triggerDownload(`unit-profile-${uicPart}.enc.json`, "application/json", JSON.stringify(env, null, 2));
        flashExport("Encrypted profile exported");
      } catch (err) { flashExport("Encryption failed: " + (err as Error).message); }
    } else {
      triggerDownload(`unit-profile-${uicPart}.json`, "application/json", JSON.stringify({ ...profile, schema: "drrs-plevel-unit-profile.v1", exportedAt: new Date().toISOString() }, null, 2));
      flashExport("Profile exported (plaintext)");
    }
  }, [asOfDate, limitedPolicy, encryptExport, detectedUnit]);

  const doImportProfile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        let data = JSON.parse(reader.result as string);
        if (data.encrypted === true) {
          const pass = prompt("Enter passphrase to decrypt:");
          if (!pass) { flashExport("Cancelled"); return; }
          try { data = await decryptProfile(data as EncryptedEnvelope, pass); }
          catch { flashExport("Wrong passphrase or corrupted file"); return; }
        }
        if (data.asOf) setAsOfDate(data.asOf);
        if (typeof data.policy?.countLimitedAsNonDeployable === "boolean")
          setLimitedPolicy(data.policy.countLimitedAsNonDeployable);
        flashExport("Profile loaded from " + file.name);
      } catch (err) { flashExport("Import failed: " + (err as Error).message); }
    };
    reader.readAsText(file);
  }, []);

  const doWipe = useCallback(() => {
    if (!confirm("Wipe locally stored unit profile, calculation history, and session data?")) return;
    clearProfile();
    clearHistoryStorage();
    doReset();
    setAsOfDate(todayISO());
    setLimitedPolicy(true);
    setHistoryKey((k) => k + 1);
    flashExport("Local data wiped");
  }, [doReset]);

  // Brief char count
  const briefEffective = drrsReady ? sanitizeForDRRS(briefText) : briefText;
  const briefLen = briefEffective.length;
  const overLimit = briefLen > DRRS_REMARKS_LIMIT;

  // Collect validation messages
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  for (const k of ["roster", "structure", "critical"] as FileKind[]) {
    const v = validation[k];
    if (v) {
      allErrors.push(...v.errors);
      allWarnings.push(...v.warnings);
    }
  }

  return (
    <>
      {/* ---- UPLOAD CARD ---- */}
      <section className="mb-8 border border-[var(--color-border)] bg-[var(--color-surface)]/40 p-6">
        <h2 className="border-b border-[var(--color-elevated)] pb-3 font-mono text-sm uppercase tracking-widest text-[var(--color-accent-head)]">
          1. Load Data
        </h2>
        <p className="mt-1 text-sm text-[var(--color-body)]">
          Upload the three CSVs, or load the bundled sample data to preview.
        </p>

        {/* File slots */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <FileSlot title="Alpha Roster" subtitle="One row per Marine / service member" rowCount={roster?.length} onFile={(f) => handleFile("roster", f)} />
          <FileSlot title="T/O Structure" subtitle="Authorized billets by BMOS + PayGrade" rowCount={structure?.length} onFile={(f) => handleFile("structure", f)} />
          <FileSlot title="Critical MOS List" subtitle="Mission-essential MOS for unit type" rowCount={critical?.length} onFile={(f) => handleFile("critical", f)} />
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={loadSample} className="border border-[var(--color-border)] bg-[var(--color-elevated)] px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-[var(--color-body)] hover:bg-[var(--color-border)]">
            Load Sample Data
          </button>
          <button onClick={loadRandom} className="flex items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-elevated)] px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-[var(--color-body)] hover:bg-[var(--color-border)]">
            <Shuffle size={14} strokeWidth={1.5} />
            Random Unit
          </button>
          <button onClick={doCalculate} disabled={!canCalculate} className="flex items-center gap-1.5 border border-[var(--color-accent-strong)] bg-[var(--color-accent-bg)] px-5 py-3 font-mono text-xs uppercase tracking-wider text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-bg-hover)] disabled:cursor-not-allowed disabled:opacity-40">
            <CalcIcon size={14} strokeWidth={1.5} />
            Calculate P-Level
          </button>
          <button onClick={doReset} className="flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-[var(--color-mute-2)] hover:text-[var(--color-ink)]">
            <RotateCcw size={14} strokeWidth={1.5} />
            Reset
          </button>
          <label className="ml-auto flex items-center gap-2 font-mono text-xs text-[var(--color-muted)]">
            <input type="checkbox" checked={limitedPolicy} onChange={(e) => setLimitedPolicy(e.target.checked)} className="accent-[var(--color-accent)]" />
            DLC=L as non-deployable
          </label>
        </div>

        {/* Validation messages */}
        {(allErrors.length > 0 || allWarnings.length > 0) && (
          <div className="mt-4 space-y-2" role="alert" aria-live="polite">
            {allErrors.length > 0 && (
              <div className="border-l-4 border-[var(--color-p4)] bg-[var(--color-p4)]/10 px-3 py-2 text-xs text-[var(--color-p4)]">
                <strong>Errors ({allErrors.length})</strong>
                <ul className="ml-4 mt-1 list-disc">{allErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
            {allWarnings.length > 0 && (
              <div className="border-l-4 border-[var(--color-p2)] bg-[var(--color-p2)]/10 px-3 py-2 text-xs text-[var(--color-p2)]">
                <strong className="flex items-center gap-1"><AlertTriangle size={12} strokeWidth={1.5} /> Warnings ({allWarnings.length})</strong>
                <ul className="ml-4 mt-1 list-disc">{allWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---- EMPTY STATE ---- */}
      {!result && (
        <div className="mb-8 flex flex-col items-center justify-center border border-dashed border-[var(--color-border)] py-16 text-center">
          <CalcIcon size={48} strokeWidth={1.5} className="text-[var(--color-mute-2)]" />
          <p className="mt-4 font-mono text-sm uppercase tracking-widest text-[var(--color-muted)]">
            No calculation yet
          </p>
          <p className="mt-1 text-xs text-[var(--color-mute-2)]">
            Load the three CSVs above, then press Calculate P-Level
          </p>
        </div>
      )}

      {/* ---- RESULTS ---- */}
      {result && (
        <section className="mb-8 border-2 border-[var(--color-accent-strong)] bg-[var(--color-surface)]/40 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--color-elevated)] pb-3">
            <h2 className="font-mono text-sm uppercase tracking-widest text-[var(--color-accent-head)]">
              2. Results
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={copyBrief} className="flex items-center gap-1.5 border border-[var(--color-accent-strong)] bg-[var(--color-accent-bg)] px-3 py-2.5 font-mono text-xs text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-bg-hover)]"><Copy size={14} strokeWidth={1.5} /> Copy Brief</button>
              <button onClick={downloadPDF} className="flex items-center gap-1.5 border border-[var(--color-accent-strong)] bg-[var(--color-accent-bg)] px-3 py-2.5 font-mono text-xs text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-bg-hover)]"><Download size={14} strokeWidth={1.5} /> PDF</button>
              <button onClick={downloadCSV} className="flex items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-2.5 font-mono text-xs text-[var(--color-body)] hover:bg-[var(--color-border)]"><Download size={14} strokeWidth={1.5} /> Audit CSV</button>
              <span className="font-mono text-xs text-[var(--color-accent-head)]" aria-live="polite">{exportMsg}</span>
            </div>
          </div>

          {/* P-Level + metrics grid */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* P-Level card */}
            <div className="flex flex-col items-center justify-center border-2 border-[var(--color-accent)] bg-[var(--color-bg)] p-6">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">
                Overall P-Level
              </span>
              <PLevelBadge band={result.band.finalBand} size="lg" className="mt-2" />
              <span className="mt-2 text-center font-mono text-xs text-[var(--color-body)]">
                {result.band.driver}
              </span>
            </div>

            {/* Personnel Strength */}
            <div className="border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">
                Personnel Strength
              </span>
              <div className="mt-1 font-mono text-2xl font-bold text-[var(--color-accent-hi)]">
                {result.personnel.pct.toFixed(1)}%
              </div>
              <span className="font-mono text-xs text-[var(--color-mute-2)]">
                {result.personnel.effective} effective / {result.personnel.authorized} authorized
              </span>
              <div className="mt-3 space-y-0">
                <MetricRow label="Assigned" value={result.personnel.assigned} />
                <MetricRow label="Attached" value={result.personnel.attached} />
                <MetricRow label="Non-Dep (DLC=N)" value={result.personnel.nonDeployable} />
                <MetricRow label="Limited (DLC=L)" value={result.personnel.limited} />
                <MetricRow label="Detached" value={result.personnel.detached} />
                <MetricRow label="IA" value={result.personnel.ia} />
                <MetricRow label="JIA" value={result.personnel.jia} />
                <MetricRow label="Effective" value={result.personnel.effective} accent />
              </div>
            </div>

            {/* Critical MOS */}
            <div className="border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">
                Critical MOS
              </span>
              <div className="mt-1 font-mono text-2xl font-bold text-[var(--color-accent-hi)]">
                {result.critical.pct.toFixed(1)}%
              </div>
              <span className="font-mono text-xs text-[var(--color-mute-2)]">
                {result.critical.filled} filled / {result.critical.authorized} authorized
              </span>
              <div className="mt-3 space-y-0">
                <MetricRow label="BMOS Exact" value={result.critical.fillSummary.exactBMOS} />
                <MetricRow label="BMOS ±1" value={result.critical.fillSummary.flexBMOS} />
                <MetricRow label="PMOS Exact" value={result.critical.fillSummary.exactPMOS} />
                <MetricRow label="PMOS ±1" value={result.critical.fillSummary.flexPMOS} />
                <MetricRow label="Gaps" value={result.critical.fillSummary.unfilled} />
                <MetricRow label="Filled" value={result.critical.filled} accent />
              </div>
            </div>
          </div>

          {/* Brief editor */}
          <div className="mt-6 border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent-head)]">
                DRRS Remarks Brief
              </span>
              <label className="flex items-center gap-1.5 font-mono text-xs text-[var(--color-muted)]">
                <input type="checkbox" checked={drrsReady} onChange={(e) => setDrrsReady(e.target.checked)} className="accent-[var(--color-accent)]" />
                DRRS-Ready
              </label>
              <button
                onClick={() => {
                  if (!result) return;
                  const unit = { uic: detectedUnit.uic, name: detectedUnit.name, asOf: asOfDate };
                  const asOf = parseAsOfDate(asOfDate) ?? new Date();
                  setBriefText(buildReadinessBrief(result, unit, asOf, new Date()));
                }}
                className="px-3 py-2.5 font-mono text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                Regenerate
              </button>
              <span className={`ml-auto font-mono text-xs tabular-nums ${overLimit ? "font-bold text-[var(--color-p4)]" : "text-[var(--color-muted)]"}`}>
                {briefLen.toLocaleString()} / {DRRS_REMARKS_LIMIT.toLocaleString()}
              </span>
            </div>
            <textarea
              ref={briefRef}
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              rows={16}
              className="mt-2 block w-full resize-y border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-mono text-xs leading-relaxed text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
              aria-label="Readiness brief, editable before copy"
            />
          </div>

          {/* Critical MOS breakdown table */}
          {result.critical.breakdown.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <h3 className="font-mono text-xs uppercase tracking-widest text-[var(--color-accent-head)]">
                Critical MOS Breakdown
              </h3>
              <table className="mt-2 w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                    <th className="py-1.5 pr-3">MOS</th>
                    <th className="py-1.5 pr-3">Description</th>
                    <th className="py-1.5 pr-3">Grade</th>
                    <th className="py-1.5 pr-3 text-right">Auth</th>
                    <th className="py-1.5 pr-3 text-right">Fill</th>
                    <th className="py-1.5 text-right">Fill %</th>
                  </tr>
                </thead>
                <tbody>
                  {result.critical.breakdown.map((row, i) => {
                    const pct = row.Authorized > 0 ? (row.Filled / row.Authorized) * 100 : 0;
                    return (
                      <tr key={i} className="border-b border-[var(--color-elevated)] text-[var(--color-ink-soft)]">
                        <td className="py-1 pr-3">{row.MOS}</td>
                        <td className="py-1 pr-3 text-[var(--color-body)]">{row.Description}</td>
                        <td className="py-1 pr-3">{row.PayGrade}</td>
                        <td className="py-1 pr-3 text-right">{row.Authorized}</td>
                        <td className="py-1 pr-3 text-right">{row.Filled}</td>
                        <td className="py-1 text-right">{pct.toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Per-billet audit trail */}
          <AuditTable audit={result.critical.audit} />
        </section>
      )}

      {/* History panel — always visible once there's at least one entry */}
      <HistoryPanel refreshKey={historyKey} />

      {/* Profile actions + Wipe Local Data */}
      <div className="mb-8 flex flex-wrap items-center gap-3 border-t border-[var(--color-elevated)] pt-4">
        <label className="flex items-center gap-1.5 font-mono text-xs text-[var(--color-muted)]">
          <input type="checkbox" checked={encryptExport} onChange={(e) => setEncryptExport(e.target.checked)} className="accent-[var(--color-accent)]" />
          Encrypt export
        </label>
        <button onClick={doExportProfile} className="px-3 py-2.5 font-mono text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]">Export Profile</button>
        <button onClick={() => profileImportRef.current?.click()} className="px-3 py-2.5 font-mono text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]">Import Profile</button>
        <input ref={profileImportRef} type="file" accept=".json" hidden onChange={(e) => { if (e.target.files?.[0]) doImportProfile(e.target.files[0]); e.target.value = ""; }} />
        <button onClick={doWipe} className="ml-auto px-3 py-2.5 font-mono text-xs text-[var(--color-p4)] hover:text-white hover:bg-[var(--color-p4)]">Wipe Local Data</button>
      </div>
    </>
  );
}
