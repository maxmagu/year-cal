# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install (requires Node 20; npm registry override needed on this machine)
nvm use 20
npm install --registry https://registry.npmjs.org

# Development (runs backend + frontend concurrently)
npm run dev

# Build (frontend Vite build + backend tsc)
npm run build

# Production start (serves frontend/dist via Express)
npm start

# Backend only
npm run dev -w backend

# Frontend only
npm run dev -w frontend
```

There are no tests.

## Environment

Copy `backend/.env.example` to `backend/.env` and fill in `APPLE_ID` and `APP_SPECIFIC_PASSWORD` (an app-specific password from appleid.apple.com — not the iCloud login password).

## Architecture

YearCal is a full-year calendar viewer backed by iCloud CalDAV. It is an npm workspace monorepo with two packages:

- **`backend/`** — Express 4 + TypeScript. Proxies all CalDAV I/O, exposes a REST API on port 3000. Run with `tsx watch` in dev, compiled to `backend/dist/` for production. The root `app.js` requires `backend/dist/index.js`.
- **`frontend/`** — React 18 + TypeScript + Vite. SPA that talks to `/api/*` (proxied to port 3000 in dev via `vite.config.ts`; served statically from Express in production).

### Backend data flow

```
Express → caldav/client.ts (DAVClient singleton, lazy login)
        → routes/calendars.ts  GET /api/calendars
        → routes/events.ts     GET/POST/PUT/DELETE /api/events
        → caldav/icalUtils.ts  parse (ical.js) / generate (ical-generator)
```

`CalendarEvent.url` and `.etag` are opaque CalDAV strings that must be round-tripped on writes. A 412 response means an ETag conflict (concurrent modification).

**All-day date handling** — iCal DTEND for all-day events is exclusive (one day past the last day). `icalUtils.ts` adjusts on both parse and generate. The frontend parses date-only strings (`YYYY-MM-DD`) as local midnight (`new Date(date + 'T00:00:00')`) to avoid UTC-offset day shifts.

### Frontend state (App.tsx)

All top-level state lives in `App.tsx`:
- `year` + `calendars` + `allEvents` — fetched on mount and on year navigation
- Year navigation always fetches **all** calendar URLs (not just selected) so toggling visibility never requires a network round-trip
- `eventsByDay: Map<string, EventDataItem[]>` — O(1) lookup by `YYYY-MM-DD` key, built by expanding each event across its date span
- `backgroundCalendarUrls` — hardcoded to calendars named `"Hotels & Stays"`; these render behind other events in cells

### Views

| Component | Description |
|---|---|
| `YearView` | 4×3 grid of `MonthGrid` tables |
| `TransposedView` | Months as rows, days as columns |
| `MonthGrid` | 6×7 table, delegates each cell to `DayCell` |
| `DayCell` | Single day square; renders colored event bars |
| `DayOverview` | Hover tooltip (desktop only) showing events for a day |
| `DayView` | Modal listing all events for a clicked day (multi-event days) |
| `EventModal` | Create/edit/delete form |

Click handling in `App.handleDayClick`: empty day → new event modal; single event (desktop) → edit modal; multiple events → DayView list.

`layout.ts` provides a greedy column-packing algorithm (`layoutEvents`) used by `DayView` to position overlapping timed events without overlap.

### TypeScript config notes

- Backend: `module: Node16` + `moduleResolution: node16` (required by tsx)
- Frontend: `verbatimModuleSyntax: true` — import type annotations must use `import type`

## Deployment (VPS)

```bash
ssh root@89.167.61.160 "cd /var/www/yearcal && git pull && cd frontend && npm run build"
```

Backend runs on port 3000 and serves `frontend/dist` as static files with SPA fallback. No separate frontend server in production.
