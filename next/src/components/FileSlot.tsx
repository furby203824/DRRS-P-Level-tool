"use client";

import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { Upload, CheckCircle2, AlertCircle, X } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  accept?: string;
  rowCount?: number;
  expectedCols?: string[];
  onFile: (file: File) => void;
  onClear?: () => void;
}

type SlotState = "empty" | "loaded" | "error" | "dragover";

export function FileSlot({ title, subtitle, accept = ".csv", rowCount, expectedCols, onFile, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("Drop CSV or click to browse");
  const [slotState, setSlotState] = useState<SlotState>("empty");

  const handleFile = useCallback(
    (file: File) => {
      if (!/\.csv$/i.test(file.name)) {
        setStatus(`Not a .csv file: ${file.name}`);
        setSlotState("error");
        return;
      }
      setStatus(file.name);
      setSlotState("loaded");
      onFile(file);
    },
    [onFile],
  );

  const handleClear = useCallback(() => {
    setSlotState("empty");
    setStatus("Drop CSV or click to browse");
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  }, [onClear]);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setSlotState("empty");
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const Icon =
    slotState === "loaded" ? CheckCircle2
    : slotState === "error" ? AlertCircle
    : Upload;

  const borderCls =
    slotState === "loaded"
      ? "border-[var(--color-accent)] border-solid border-l-4 border-l-[var(--color-accent)] bg-[var(--color-accent-tint)]/30"
      : slotState === "error"
        ? "border-[var(--color-p4)] border-solid bg-[var(--color-error-tint)]/10"
        : slotState === "dragover"
          ? "border-[var(--color-accent-strong)] border-solid bg-[var(--color-surface)]"
          : "border-[var(--color-border)] border-dashed";

  const iconColor =
    slotState === "loaded" ? "text-[var(--color-accent-head)]"
    : slotState === "error" ? "text-[var(--color-error)]"
    : "text-[var(--color-mute-2)]";

  const statusColor =
    slotState === "loaded" ? "text-[var(--color-accent-hi)]"
    : slotState === "error" ? "text-[var(--color-error-hi)]"
    : "text-[var(--color-mute-2)]";

  return (
    <div className="relative">
      <label
        className={`group block cursor-pointer border-2 p-4 transition-all hover:border-[var(--color-accent-strong)] hover:bg-[var(--color-surface)] focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/40 ${borderCls}`}
        onDragEnter={(e) => { e.preventDefault(); setSlotState((prev) => prev === "loaded" ? prev : "dragover"); }}
        onDragOver={(e) => { e.preventDefault(); }}
        onDragLeave={(e) => {
          if (e.relatedTarget && (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
          setSlotState((prev) => prev === "dragover" ? "empty" : prev);
        }}
        onDrop={onDrop}
      >
        <div className="flex items-start gap-3">
          <Icon size={20} strokeWidth={1.5} className={`mt-0.5 flex-shrink-0 ${iconColor}`} />
          <div className="flex-1">
            <div className="font-mono text-sm font-semibold text-[var(--color-ink)]">{title}</div>
            <div className="mt-0.5 text-xs text-[var(--color-muted)]">{subtitle}</div>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={onChange}
        />
        <div className={`mt-3 font-mono text-xs font-medium ${statusColor}`} aria-live="polite">
          {status}
        </div>
        {slotState === "loaded" && rowCount != null && (
          <div className="mt-0.5 font-mono text-xs text-[var(--color-muted)]">
            {rowCount} rows parsed
          </div>
        )}
        {slotState === "empty" && expectedCols && expectedCols.length > 0 && (
          <div className="mt-1.5 text-xs text-[var(--color-muted)]">
            Expected: <span className="font-mono">{expectedCols.join(", ")}</span>
          </div>
        )}
      </label>
      {slotState === "loaded" && onClear && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          aria-label={`Clear ${title}`}
          title={`Clear ${title}`}
        >
          <X size={14} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
