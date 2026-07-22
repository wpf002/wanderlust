import type { ReactNode } from "react";

/**
 * Plain-React replacement for the bundle's radix/cva `Badge` (`Is`).
 * Base classes copied verbatim; callers pass their own color/padding classes.
 * Default padding (px-2.5 py-0.5) is dropped when the caller supplies its own
 * px-/py- utility, mimicking the original's tailwind-merge behavior.
 */
interface BadgeProps {
  className?: string;
  children?: ReactNode;
}

export default function Badge({ className = "", children }: BadgeProps) {
  const hasPx = /(^|\s)-?px-/.test(className);
  const hasPy = /(^|\s)-?py-/.test(className);
  const base = [
    "inline-flex items-center whitespace-nowrap rounded-md border font-semibold transition-colors",
    hasPx ? "" : "px-2.5",
    hasPy ? "" : "py-0.5",
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={`${base} ${className}`.trim()}>{children}</div>;
}
