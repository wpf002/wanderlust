import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  BookOpen,
  CalendarRange,
  ChartColumn,
  CirclePlus,
  Compass,
  Menu,
  Package,
  SquareCheckBig,
  Telescope,
  TrendingUp,
  X,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Explore", icon: <Compass size={15} /> },
  { path: "/plan", label: "Plan", icon: <CirclePlus size={15} /> },
  { path: "/discover", label: "Discover", icon: <Telescope size={15} /> },
  { path: "/compare", label: "Compare", icon: <ChartColumn size={15} /> },
  { path: "/dashboard", label: "Spending", icon: <TrendingUp size={15} /> },
  { path: "/notes", label: "Journal", icon: <BookOpen size={15} /> },
  { path: "/checklist", label: "Checklist", icon: <SquareCheckBig size={15} /> },
  { path: "/timeline", label: "Timeline", icon: <CalendarRange size={15} /> },
  { path: "/packing", label: "Packing", icon: <Package size={15} /> },
];

/** Sticky top navigation bar (bundle `Sn`; nav items array `EL`). */
export default function Navbar() {
  const [location, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function go(path: string) {
    navigate(path);
    setMenuOpen(false);
  }

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
        </div>
      )}
    </header>
  );
}
