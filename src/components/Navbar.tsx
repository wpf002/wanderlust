import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  BookOpen,
  CalendarRange,
  ChartColumn,
  ChevronDown,
  CirclePlus,
  Compass,
  Menu,
  Package,
  SquareCheckBig,
  Telescope,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
}

/** The four things the app is actually for. */
const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Explore", icon: <Compass size={15} /> },
  { path: "/plan", label: "Plan", icon: <CirclePlus size={15} /> },
  { path: "/discover", label: "Discover", icon: <Telescope size={15} /> },
  { path: "/compare", label: "Compare", icon: <ChartColumn size={15} /> },
];

/**
 * Solo trip tools. A group trip has all of this built into its own space, so
 * these would crowd the main bar — but they're the whole toolkit when you're
 * travelling alone, so they stay one click away rather than being cut.
 */
const TOOL_ITEMS: NavItem[] = [
  { path: "/packing", label: "Packing", icon: <Package size={15} /> },
  { path: "/checklist", label: "Checklist", icon: <SquareCheckBig size={15} /> },
  { path: "/dashboard", label: "Spending", icon: <TrendingUp size={15} /> },
  { path: "/notes", label: "Journal", icon: <BookOpen size={15} /> },
  { path: "/timeline", label: "Timeline", icon: <CalendarRange size={15} /> },
];

/** Sticky top navigation bar (bundle `Sn`; nav items array `EL`). */
export default function Navbar() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  const inTools = TOOL_ITEMS.some((item) => item.path === location);

  function go(path: string) {
    navigate(path);
    setMenuOpen(false);
    setToolsOpen(false);
  }

  // Close the Tools dropdown on an outside click or Escape.
  useEffect(() => {
    if (!toolsOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!toolsRef.current?.contains(e.target as Node)) setToolsOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setToolsOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [toolsOpen]);

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <button onClick={() => go("/")} className="flex items-center gap-2.5 shrink-0">
          <svg aria-label="Wanderlust Planner" viewBox="0 0 40 40" width="32" height="32" fill="none">
            <circle
              cx="20"
              cy="20"
              r="18"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--color-border)]"
            />
            {/* Compass needle — north half in the brand color, south half muted */}
            <polygon
              points="20,6 25,20 15,20"
              fill="currentColor"
              className="text-[var(--color-primary)]"
            />
            <polygon
              points="20,34 25,20 15,20"
              fill="currentColor"
              className="text-[var(--color-text-muted)]"
            />
            <circle
              cx="20"
              cy="20"
              r="2.5"
              fill="currentColor"
              className="text-[var(--color-surface)]"
            />
            <circle
              cx="20"
              cy="20"
              r="2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-[var(--color-primary)]"
            />
          </svg>
          <span className="font-display font-bold text-base tracking-tight">Wanderlust</span>
        </button>
        <nav className="hidden lg:flex items-center gap-0.5 overflow-x-auto">
          {NAV_ITEMS.map(({ path, label, icon }) => (
            <button
              key={path}
              onClick={() => go(path)}
              data-testid={`nav-${label.toLowerCase().replace(/ /g, "-")}`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${location === path ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)]"}`}
            >
              {icon} {label}
            </button>
          ))}

          {/* Solo tools, tucked behind one menu so the main bar stays short */}
          <div className="relative" ref={toolsRef}>
            <button
              onClick={() => setToolsOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={toolsOpen}
              data-testid="nav-tools"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${inTools ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)]"}`}
            >
              <Wrench size={15} /> Tools
              <ChevronDown
                size={13}
                className={`transition-transform ${toolsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {toolsOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-1.5 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-lg z-50"
              >
                <p className="px-2.5 pt-1 pb-2 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
                  Planning a solo trip
                </p>
                {TOOL_ITEMS.map(({ path, label, icon }) => (
                  <button
                    key={path}
                    role="menuitem"
                    onClick={() => go(path)}
                    data-testid={`nav-${label.toLowerCase()}`}
                    className={`flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${location === path ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text)] hover:bg-[var(--color-surface-offset)]"}`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors text-[var(--color-text-muted)]"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            data-testid="nav-hamburger"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 pb-3 pt-2 flex flex-col gap-1">
          {NAV_ITEMS.map(({ path, label, icon }) => (
            <button
              key={path}
              onClick={() => go(path)}
              data-testid={`nav-mobile-${label.toLowerCase().replace(/ /g, "-")}`}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${location === path ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text)] hover:bg-[var(--color-surface-offset)]"}`}
            >
              {icon} {label}
            </button>
          ))}

          <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
            Planning a solo trip
          </p>
          {TOOL_ITEMS.map(({ path, label, icon }) => (
            <button
              key={path}
              onClick={() => go(path)}
              data-testid={`nav-mobile-${label.toLowerCase()}`}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${location === path ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text)] hover:bg-[var(--color-surface-offset)]"}`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
