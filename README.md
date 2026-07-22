# Wanderlust — Vacation Planner

Plan your perfect vacation. Pre-built itineraries for iconic trips — Route 66, the
Western Coast of Italy, the national parks, the Pacific Coast Highway, and more — plus
a custom trip planner that matches your preferences to the best-fit itinerary.

This is a standalone, **AI/LLM-independent** app: every itinerary, cost estimate, and
recommendation is computed from local data — no external AI services are called.

## Features

- **Explore** — browse 7 curated itineraries with live cost estimates that react to your
  travelers, budget tier, car MPG, and flight-cost settings.
- **Trip detail** — day-by-day itinerary, interactive Leaflet route map, per-city 7-day
  weather (Open-Meteo), hotels, attractions, cost breakdown, currency conversion, notes,
  and print/CSV export.
- **Plan** — a two-step wizard that matches your destination, dates, and interests to the
  best-fit itineraries.
- **Compare** — put 2–4 trips side by side (cost, length, stops, difficulty).
- **Spending** — a dashboard of your saved trips with charts and an annual budget goal.
- **Journal** — a markdown notebook per trip template.
- **Checklist / Timeline / Packing** — pre-trip task lists, a 2026 planning calendar, and a
  season-aware packing-list generator.
- Light/dark themes, a ⌘K command palette, and full persistence.

## Tech stack

- **Frontend:** Vite + React 18 + TypeScript, Tailwind CSS, wouter (routing),
  TanStack Query, Leaflet (maps), Recharts (charts), `@uiw/react-md-editor`.
- **Backend:** Express + better-sqlite3 REST API (see `docs/api-contract.md`).

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` starts both the API (port 5001) and the Vite dev server (port 5173) together;
open http://localhost:5173. The Vite dev server proxies `/api` to the backend.

> The API listens on **5001** because macOS Control Center occupies 5000. Override with
> `PORT=… npm run dev:server` if needed.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Run API + client together (dev) |
| `npm run build` | Type-check and build the client to `dist/client` |
| `npm run start` | Serve the built client from the Express server (production) |
| `npm run check` | Type-check the whole project |

## Data

The 7 itinerary templates, city coordinates, and packing templates live in `src/data/`,
extracted verbatim from the original design. City weather uses the free Open-Meteo API and
currency conversion uses open.er-api.com; both degrade gracefully when offline.
