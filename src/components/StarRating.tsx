import { Star } from "lucide-react";

/** Read-only 5-star display (bundle `Lre`). */
export default function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={11}
          className={
            n <= stars
              ? "text-amber-400 fill-amber-400"
              : "text-[var(--color-text-faint)]"
          }
        />
      ))}
    </div>
  );
}
