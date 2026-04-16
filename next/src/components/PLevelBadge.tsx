import type { PLevelBand } from "@/lib/plevel";

const BAND_COLORS: Record<PLevelBand, string> = {
  1: "bg-[var(--color-p1)] border-[var(--color-p1)]",
  2: "bg-[var(--color-p2)] border-[var(--color-p2)]",
  3: "bg-[var(--color-p3)] border-[var(--color-p3)]",
  4: "bg-[var(--color-p4)] border-[var(--color-p4)]",
};

const SIZES = {
  lg: "text-6xl px-6 py-4",
  md: "text-3xl px-4 py-2",
  sm: "text-sm px-2 py-0.5",
} as const;

interface Props {
  band: PLevelBand;
  size?: keyof typeof SIZES;
  className?: string;
}

export function PLevelBadge({ band, size = "sm", className = "" }: Props) {
  return (
    <span
      className={`
        inline-block font-mono font-black tracking-wider text-white
        border ${BAND_COLORS[band]} ${SIZES[size]} ${className}
      `.trim()}
    >
      P-{band}
    </span>
  );
}
