interface Props {
  label: string;
  value: string | number;
  accent?: boolean;
  className?: string;
}

export function MetricRow({ label, value, accent = false, className = "" }: Props) {
  return (
    <div
      className={`
        flex justify-between items-baseline
        border-b border-[var(--color-elevated)] py-2
        ${className}
      `.trim()}
    >
      <span className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted)]">
        {label}
      </span>
      <span
        className={`font-mono ${
          accent
            ? "text-lg font-bold text-[var(--color-accent-hi)]"
            : "text-sm text-[var(--color-ink-soft)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
