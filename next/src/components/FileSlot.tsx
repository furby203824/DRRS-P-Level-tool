"use client";

import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from "react";

interface Props {
  title: string;
  subtitle: string;
  accept?: string;
  onFile: (file: File) => void;
}

type SlotState = "empty" | "loaded" | "error" | "dragover";

export function FileSlot({ title, subtitle, accept = ".csv", onFile }: Props) {
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
      setStatus(`${file.name}`);
      setSlotState("loaded");
      onFile(file);
    },
    [onFile],
  );

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

  const borderColor =
    slotState === "loaded"
      ? "border-[var(--color-p1)] border-solid"
      : slotState === "error"
        ? "border-[var(--color-p4)] border-solid"
        : slotState === "dragover"
          ? "border-[var(--color-accent)] border-solid shadow-[0_0_0_2px_var(--color-accent)]"
          : "border-[var(--color-border)] border-dashed";

  const statusColor =
    slotState === "loaded"
      ? "text-[var(--color-p1)]"
      : slotState === "error"
        ? "text-[var(--color-p4)]"
        : "text-[var(--color-muted)]";

  return (
    <label
      className={`block cursor-pointer border-2 p-4 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)] focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_2px_var(--color-accent)] ${borderColor}`}
      onDragEnter={(e) => { e.preventDefault(); setSlotState("dragover"); }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={(e) => {
        if (e.relatedTarget && (e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return;
        setSlotState(slotState === "dragover" ? "empty" : slotState);
      }}
      onDrop={onDrop}
    >
      <div className="font-mono text-sm font-semibold text-[var(--color-ink)]">{title}</div>
      <div className="mt-0.5 text-xs text-[var(--color-muted)]">{subtitle}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="mt-2 block w-full text-xs file:mr-2 file:cursor-pointer file:border-0 file:bg-[var(--color-surface)] file:px-2 file:py-1 file:text-xs file:text-[var(--color-ink-soft)]"
        onChange={onChange}
      />
      <div className={`mt-2 text-xs font-medium ${statusColor}`} aria-live="polite">
        {status}
      </div>
    </label>
  );
}
