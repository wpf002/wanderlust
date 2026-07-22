/** Five-dot difficulty meter with a label (bundle `wh`). */
export default function DifficultyMeter({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-[var(--color-text-faint)]">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`w-1.5 h-1.5 rounded-full ${
              n <= Math.round(score)
                ? "bg-[var(--color-primary)]"
                : "bg-[var(--color-surface-offset)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
