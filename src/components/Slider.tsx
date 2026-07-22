/**
 * Plain-React replacement for the bundle's radix slider wrapper (`Bn`).
 * Visuals copied verbatim (track/range/thumb classNames); interaction is
 * backed by an invisible native range input so keyboard + drag both work.
 */
interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number[];
  onValueChange?: (value: number[]) => void;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
  "aria-label"?: string;
}

const THUMB_SIZE = 20; // h-5 w-5

export default function Slider({
  min = 0,
  max = 100,
  step = 1,
  value,
  onValueChange,
  className,
  disabled = false,
  "data-testid": testId,
  "aria-label": ariaLabel,
}: SliderProps) {
  const current = value[0] ?? min;
  const pct = max === min ? 0 : ((current - min) / (max - min)) * 100;

  return (
    <div
      className={`relative flex w-full touch-none select-none items-center${className ? ` ${className}` : ""}`}
    >
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <div className="absolute h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        style={{ left: `calc(${pct}% - ${(pct / 100) * THUMB_SIZE}px)` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        disabled={disabled}
        data-testid={testId}
        aria-label={ariaLabel}
        onChange={(e) => onValueChange?.([Number(e.target.value)])}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}
