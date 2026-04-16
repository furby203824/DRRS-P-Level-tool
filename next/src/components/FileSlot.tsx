"use client";

import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

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
      setStatus(file.name);
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

  const Icon =
    slotState === "loaded" ? CheckCircle2
    : slotState === "error" ? AlertCircle
    : Upload;

  const borderCls =
    slotState === "loaded"
      ? "border-amber-600 border-solid bg-amber-950/20"
      : slotState === "error"
        ? "border-red-700 border-solid bg-red-950/10"
        : slotState === "dragover"
          ? "border-amber-700 border-solid bg-stone-900"
          : "border-stone-700 border-dashed";

  const iconColor =
    slotState === "loaded" ? "text-amber-500"
    : slotState === "error" ? "text-red-500"
    : "text-stone-500";

  const statusColor =
    slotState === "loaded" ? "text-amber-400"
    : slotState === "error" ? "text-red-400"
    : "text-stone-500";

  return (
    <label
      className={`group block cursor-pointer border-2 p-4 transition-all hover:border-amber-700 hover:bg-stone-900 focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600/40 ${borderCls}`}
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
          <div className="font-mono text-sm font-semibold text-stone-100">{title}</div>
          <div className="mt-0.5 text-xs text-stone-400">{subtitle}</div>
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
    </label>
  );
}
