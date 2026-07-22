/**
 * Plain-React replacement for the bundle's radix/shadcn Select wrappers
 * (`ys`/`yo`/`vs`/`vo`/`En`). Same compound-component API and the original
 * classNames; the popover is a simple absolutely-positioned list.
 */
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  labels: Map<string, ReactNode>;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext(): SelectContextValue {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within <Select>");
  return ctx;
}

interface SelectItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

/** Walk the children tree collecting SelectItem value → label pairs. */
function collectLabels(children: ReactNode, map: Map<string, ReactNode>) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === SelectItem) {
      const props = child.props as SelectItemProps;
      map.set(props.value, props.children);
      return;
    }
    const nested = (child.props as { children?: ReactNode }).children;
    if (nested) collectLabels(nested, map);
  });
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const labels = new Map<string, ReactNode>();
  collectLabels(children, labels);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, labels }}>
      <div ref={rootRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SelectTrigger({
  children,
  className,
  "data-testid": testId,
}: SelectTriggerProps) {
  const { open, setOpen } = useSelectContext();
  return (
    <button
      type="button"
      data-testid={testId}
      aria-haspopup="listbox"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1${className ? ` ${className}` : ""}`}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, labels } = useSelectContext();
  return <span>{labels.get(value) ?? placeholder ?? null}</span>;
}

export function SelectContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { open } = useSelectContext();
  if (!open) return null;
  return (
    <div
      role="listbox"
      className={`absolute left-0 top-full mt-1.5 z-50 max-h-96 w-max min-w-full max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-popover-foreground shadow-lg${className ? ` ${className}` : ""}`}
    >
      <div className="p-1.5">{children}</div>
    </div>
  );
}

export function SelectItem({ value, children, className }: SelectItemProps) {
  const { value: selected, onValueChange, setOpen } = useSelectContext();
  const isSelected = selected === value;
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => {
        onValueChange(value);
        setOpen(false);
      }}
      className={`relative flex w-full cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-lg py-2 pl-8 pr-3 text-sm outline-none transition-colors hover:bg-[var(--color-surface-offset)] focus:bg-[var(--color-surface-offset)] ${isSelected ? "font-medium text-[var(--color-primary)]" : "text-[var(--color-text)]"}${className ? ` ${className}` : ""}`}
    >
      <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center text-[var(--color-primary)]">
        {isSelected && <Check className="h-3.5 w-3.5" />}
      </span>
      <span>{children}</span>
    </button>
  );
}
