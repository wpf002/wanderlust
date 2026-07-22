# API contract (derived from bundle call sites in pretty-index.js)

Trip object (used by /api/trips, /api/trips/:slug, /api/edit/:editSlug):
`{ id, slug, templateId, templateName, settings: {…}, notes, travelMonth, departureDate, isCompleted, createdAt }` — `settings` is a parsed JSON object, `isCompleted` boolean. `editSlug` is included only on /api/edit responses.

Checklist item: `{ id, templateId, text, completed: bool, sortOrder, dueDate, createdAt }`

## Settings
- `GET /api/settings` — → `[{ key, value }]` (all rows; convenience/verification)
- `GET /api/settings/:key` — → `{ key, value }` (200 with `value: null` when unset; frontend reads `.value`) (bundle 18349, 58425, 102674)
- `POST /api/settings/:key` — body `{ value: string }` → `{ key, value }` (bundle 18424, 58503, 58514, 102691)

## Trips (saved custom trips)
- `POST /api/trips/save` — body `{ templateId, templateName, settings, isEditable }` → `{ slug, editSlug? }` (`editSlug` only when `isEditable`) (bundle 25176)
- `GET /api/trips` — → `[Trip]` (bundle 58454, 101543)
- `GET /api/trips/:slug` — → `Trip`, or 404 `{ error }` (shared view link; bundle 31381)
- `DELETE /api/trips/:slug` — → `{ success: true }` (bundle 58446, 101573)
- `PATCH /api/trips/:slug/month` — body `{ month: string|null }` → `Trip` (bundle 101547)
- `PATCH /api/trips/:slug/departure` — body `{ date: string|null }` → `Trip` (bundle 101556)
- `PATCH /api/trips/:slug/complete` — body `{ completed: bool }` → `Trip` (bundle 101565)
- `GET /api/trips-csv` — → text/csv attachment of all saved trips (bundle 58581, plain `<a href>`)

## Checklist
- `GET /api/checklist/all` — → `[ChecklistItem]` (all templates)
- `GET /api/checklist/:templateId` — → `[ChecklistItem]` (keys like `route66` or `packing_route66_summer`; bundle 30149, 100888, 101049)
- `POST /api/checklist` — body `{ templateId, text, completed?, sortOrder?, dueDate?, createdAt? }` → `ChecklistItem` (bundle 30159, 101068, 101080)
- `PATCH /api/checklist/:id` — body `{ completed?, text?, dueDate?, sortOrder? }` → `ChecklistItem` (bundle 30184, 101055)
- `DELETE /api/checklist/:id` — → `{ success: true }` (bundle 101063)

## Comments (on shared trips, keyed by view slug)
- `GET /api/comments/:slug` — → `[{ id, slug, authorName, commentText, createdAt }]` (bundle 31218)
- `POST /api/comments/:slug` — body `{ authorName, commentText }` → created comment (bundle 31222)

## Day notes (per template id, per day number)
- `GET /api/day-notes/:tripId` — → `[{ id, tripId, dayNumber, noteText, updatedAt }]` (bundle 29048)
- `POST /api/day-notes/:tripId/:dayNumber` — body `{ noteText }` → upserted day note (bundle 29052)

## Journal notes (one per template id)
- `GET /api/notes` — → `[{ id, templateId, noteText, updatedAt }]` (bundle 100553)
- `POST /api/notes/:templateId` — body `{ noteText }` → upserted note (frontend reads `.noteText`, `.updatedAt`; bundle 100579)

## Notification preferences
- `GET /api/notif-prefs` — → flat boolean map `{ [prefKey]: bool }` (bundle 58427: `typeof ce == "object"`)
- `POST /api/notif-prefs` — body: full boolean map → saved map (bundle 58441)

## Ratings (one per template id)
- `GET /api/ratings` — → `[{ id, templateId, stars, review, createdAt }]` (bundle 23444; frontend keys by `templateId`, reads `.stars`, `.review`)
- `POST /api/ratings/:templateId` — body `{ stars: 1–5, review }` → upserted rating (bundle 101450)

## Shared editable trips (keyed by editSlug)
- `GET /api/edit/:editSlug` — → `Trip` incl. `editSlug` and `notes`, 404 when unknown (frontend checks `res.ok`; reads `.templateId`, `.templateName`, `.settings`, `.notes`; bundle 102206)
- `POST /api/edit/:editSlug/notes` — body `{ notes: string }` → updated `Trip` (bundle 102216)

## Gas prices
- `GET /api/gas-prices` — → `{ date: "YYYY-MM-DD", route66Avg, northernParksAvg, isLive: false }` (bundle 102649; no upstream API — values come from settings keys `gas_route66_avg` / `gas_northern_parks_avg`, default 3.85)
