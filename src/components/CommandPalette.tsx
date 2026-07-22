import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import {
  Search,
  X,
  Compass,
  PlusCircle,
  GitCompare,
  BarChart3,
  BookOpen,
  CheckSquare,
  CalendarDays,
  Package,
} from "lucide-react";
import { useTrips } from "@/data/useTrips";
import type { Trip } from "@/data/types";

interface CommandResult {
  id: string;
  label: string;
  sublabel: string;
  icon: ReactNode;
  path: string;
  category: "Trips" | "Pages";
}

interface PageEntry {
  label: string;
  sublabel: string;
  icon: ReactNode;
  path: string;
  keywords: string;
}

const PAGES: PageEntry[] = [
  {
    label: "Explore Trips",
    sublabel: "Browse all itineraries",
    icon: <Compass size={15} />,
    path: "/",
    keywords: "explore browse trips itineraries",
  },
  {
    label: "Plan a Custom Trip",
    sublabel: "Describe your dream vacation",
    icon: <PlusCircle size={15} />,
    path: "/plan",
    keywords: "plan custom trip planner",
  },
  {
    label: "Compare Trips",
    sublabel: "Side-by-side comparison",
    icon: <GitCompare size={15} />,
    path: "/compare",
    keywords: "compare comparison trips",
  },
  {
    label: "Spending Dashboard",
    sublabel: "Cost breakdown & budget",
    icon: <BarChart3 size={15} />,
    path: "/dashboard",
    keywords: "spending dashboard budget cost",
  },
  {
    label: "Trip Journal",
    sublabel: "Notes & markdown editor",
    icon: <BookOpen size={15} />,
    path: "/notes",
    keywords: "notes journal markdown",
  },
  {
    label: "Checklist",
    sublabel: "Pre-trip tasks & to-dos",
    icon: <CheckSquare size={15} />,
    path: "/checklist",
    keywords: "checklist tasks todo",
  },
  {
    label: "Timeline",
    sublabel: "Schedule trips by month",
    icon: <CalendarDays size={15} />,
    path: "/timeline",
    keywords: "timeline schedule calendar",
  },
  {
    label: "Packing List",
    sublabel: "Personalized gear checklist",
    icon: <Package size={15} />,
    path: "/packing",
    keywords: "packing list gear",
  },
];

/** Bundle `nJ`: build up to 10 search results from trips + pages. */
function buildResults(query: string, trips: Trip[]): CommandResult[] {
  const term = query.toLowerCase().trim();
  if (!term) return [];
  const results: CommandResult[] = [];

  trips.forEach((trip) => {
    if (
      trip.name.toLowerCase().includes(term) ||
      trip.subtitle.toLowerCase().includes(term) ||
      trip.tags.some((tag) => tag.toLowerCase().includes(term)) ||
      trip.countries.some((country) => country.toLowerCase().includes(term)) ||
      trip.highlights.some((highlight) => highlight.toLowerCase().includes(term))
    ) {
      results.push({
        id: `trip-${trip.id}`,
        label: trip.name,
        sublabel: trip.subtitle,
        icon: <span className="text-base">{trip.emoji}</span>,
        path: `/trip/${trip.id}`,
        category: "Trips",
      });
    }
  });

  PAGES.forEach((page) => {
    if (
      page.label.toLowerCase().includes(term) ||
      page.sublabel.toLowerCase().includes(term) ||
      page.keywords.includes(term)
    ) {
      results.push({
        id: `page-${page.path}`,
        label: page.label,
        sublabel: page.sublabel,
        icon: page.icon,
        path: page.path,
        category: "Pages",
      });
    }
  });

  return results.slice(0, 10);
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const trips = useTrips();
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = buildResults(query, trips);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  function go(path: string) {
    navigate(path);
    close();
  }

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
    if (e.key === "Enter" && results[activeIndex]) {
      go(results[activeIndex].path);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid="btn-command-palette"
        className="fixed bottom-6 right-6 z-40 hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg text-xs text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-text)] transition-all"
        title="Search (⌘K)"
      >
        <Search size={13} />
        <span>Search…</span>
        <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-offset)] border border-[var(--color-border)] font-mono">
          ⌘K
        </kbd>
      </button>
    );
  }

  const grouped: Record<string, CommandResult[]> = {};
  results.forEach((result) => {
    (grouped[result.category] ||= []).push(result);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={close}
    >
      <div
        className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <Search size={16} className="text-[var(--color-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            data-testid="command-palette-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search trips, pages, destinations…"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder-[var(--color-text-faint)]"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-offset)] border border-[var(--color-border)] font-mono text-[var(--color-text-faint)]">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {!query && (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-text-faint)]">
              Type to search trips, pages, and destinations
            </div>
          )}
          {query && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-text-faint)]">
              No results for "{query}"
            </div>
          )}
          {Object.entries(grouped).map(([category, items]) => {
            const groupStart = results.indexOf(items[0]);
            return (
              <div key={category}>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-wider">
                  {category}
                </div>
                {items.map((item, offset) => {
                  const index = groupStart + offset;
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={item.id}
                      data-testid={`cmd-result-${item.id}`}
                      onClick={() => go(item.path)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive
                          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                          : "hover:bg-[var(--color-surface-offset)]"
                      }`}
                    >
                      <span
                        className={`shrink-0 ${
                          isActive
                            ? "text-[var(--color-primary)]"
                            : "text-[var(--color-text-muted)]"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.label}
                        </div>
                        {item.sublabel && (
                          <div className="text-xs text-[var(--color-text-faint)] truncate">
                            {item.sublabel}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center gap-4 text-[10px] text-[var(--color-text-faint)]">
          <span>
            <kbd className="font-mono">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-mono">↵</kbd> open
          </span>
          <span>
            <kbd className="font-mono">ESC</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
