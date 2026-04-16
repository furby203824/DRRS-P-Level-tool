interface Props {
  text?: string;
}

export function ClassificationBanner({ text = "UNCLASSIFIED // POC" }: Props) {
  return (
    <div className="bg-[var(--color-classification)] border-y-4 border-[var(--color-classification-edge)] py-1 text-center font-mono text-xs tracking-widest text-white">
      {text}
    </div>
  );
}
