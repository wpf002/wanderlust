# Porting conventions (Perplexity bundle → real source)

We are rebuilding the "Wanderlust — Vacation Planner" app from a minified Perplexity-generated
bundle into clean TypeScript source. The pretty-printed bundle lives at:

`/private/tmp/claude-501/-Users-willfoti-Documents-GitHub-wanderlust/46c22779-36db-42a7-b456-fd01c0b2e76a/scratchpad/wanderlust-extract/pretty-index.js`

## Ground rules

1. **Faithful port, clean code.** Reproduce the original UI/behavior exactly — copy Tailwind
   `className` strings verbatim from the bundle (our theme defines the same CSS variables:
   `--color-bg`, `--color-surface`, `--color-surface-2`, `--color-surface-offset`,
   `--color-border`, `--color-divider`, `--color-text`, `--color-text-muted`,
   `--color-text-faint`, `--color-primary`, `--color-primary-hover`, plus shadcn-style
   `--primary`, `--muted`, etc. and chart colors `--chart-1..5`). Convert `h.jsx(...)` calls
   back to JSX, rename minified locals to meaningful names, and split large components into
   helpers within the same file (or a sibling component file if reused).
2. **Dependencies** (already in package.json — do NOT add new ones):
   react, react-dom, wouter (v3, browser routing — NOT hash routing), @tanstack/react-query v5,
   leaflet, lucide-react, recharts, @uiw/react-md-editor.
   Radix primitives are NOT installed — replace any radix Tabs/Dialog/Popover with plain
   React + Tailwind equivalents that look identical.
3. **Icons:** the bundle's icon components (e.g. `rC`, `wf`, sizes 15/16) are lucide icons.
   Infer the right lucide-react icon from context (Compass, PlusCircle, BarChart3, TrendingUp,
   BookOpen, CheckSquare, CalendarDays, Package, etc.).
4. **Shared infra (already written — use, don't recreate):**
   - `@/lib/api` → `apiRequest(method, path, body?)` (the bundle's `ot`)
   - `@/lib/queryClient` → TanStack `queryClient` with default queryFn that joins queryKey with "/"
     (the bundle's `Eo(...)` useQuery wrapper → plain `useQuery({ queryKey: [...] })`)
   - `@/data/trips` → `trips` (the bundle's `St` array), `getTrip(id)`
   - `@/data/types` → `Trip`, `Settings`, `GasPriceData`, etc.
   - `@/data/cityCoords` → `cityCoords`, `lookupCity(name)` (the bundle's `Ml`)
   - `@/components/ThemeToggle` → navbar theme toggle button (replaces the bundle's
     `[data-theme-toggle]` DOM hack)
   - `src/App.tsx` → routes are wired; page props are fixed (see the file). Do not change routes.
5. **Aliases:** `@/` maps to `src/`. Import pages' shared components from `@/components/...`.
6. **The API** is served by Express on :5000, proxied under Vite dev at `/api`. Endpoint
   surface: /api/trips, /api/trips-csv, /api/checklist, /api/comments, /api/day-notes,
   /api/edit, /api/gas-prices, /api/notes, /api/notif-prefs, /api/ratings, /api/settings.
   Match request/response shapes to what the bundle's call sites expect. If you discover an
   endpoint contract while porting, append it to `docs/api-contract.md` (create if missing)
   as: `METHOD /path` — request body → response JSON, one line each.
7. **TypeScript strict.** No `any` unless unavoidable; `npm run check` must pass.
8. **Do not run the dev server or install packages** — the orchestrator handles that. You may
   run `npx tsc -p tsconfig.app.json --noEmit` to type-check your files.
9. **Verbatim data:** any embedded data arrays/objects in your region (templates, options,
   labels, sample content) must be copied verbatim into `src/data/*.ts` modules, not paraphrased.

## Component name → route map (bundle line numbers in pretty-index.js)

| Bundle fn | Route / role | Target file |
|-----------|--------------|-------------|
| tDe (102656) | App root | src/App.tsx (done) |
| NJ (18346) | Navbar (nav items at 18440) | src/components/Navbar.tsx |
| aJ (17120) | Command palette (Cmd+K, routes at 17052) | src/components/CommandPalette.tsx |
| HQ (15026) | (small, near data — check usage) | as needed |
| Mre (23436) | `/` Explore | src/pages/Explore.tsx |
| Yre (24616) | `/plan` Plan | src/pages/Plan.tsx |
| Jne (29029) | `/trip/:id` TripDetail | src/pages/TripDetail.tsx |
| fae (30138) | `/packing` Packing (data eae… at 29812) | src/pages/Packing.tsx |
| hae (30816) | `/compare` Compare | src/pages/Compare.tsx |
| gae (31372) | `/shared/:slug` SharedNotes | src/pages/SharedNotes.tsx |
| k1e (58408) | `/dashboard` Spending | src/pages/Spending.tsx |
| FOe (100544) | `/notes` Journal | src/pages/Journal.tsx |
| HOe (101305) | `/checklist` Checklist | src/pages/Checklist.tsx |
| VOe (101535) | `/timeline` Timeline | src/pages/Timeline.tsx |
| YOe (102196) | `/edit/:editSlug` SharedEdit | src/pages/SharedEdit.tsx |
| JOe (102618) | 404 | src/pages/NotFound.tsx (trivial) |
| RouteMap (lazy chunk `assets/RouteMap-C1EFKfiB.js`, prettified below) | Leaflet map | src/components/RouteMap.tsx |
| Ml (23875) | city coords | src/data/cityCoords.ts (done) |
| Fre/Bre (23937) | weather (Open-Meteo) | src/lib/weather.ts |

The helpers each page references (minified names) usually live shortly before the page
function in the bundle — chase them by definition line using grep.
