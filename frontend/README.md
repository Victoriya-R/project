# DCIM Enterprise Frontend

## Architecture

- `src/pages` — route-level screens for Dashboard, Equipment, UPS, Switch Cabinets, Zones, Connections, Cables, Reports and Auth.
- `src/modules` — domain-focused visual modules such as rack visualization, zone navigator, connection wizard and port grid.
- `src/components` — reusable building blocks (`DataTable`, `FilterBar`, `Modal`, `StatusBadge`, `InfoCard`, `FormField`, `EmptyState`).
- `src/services/api` — Axios client, endpoint wrappers and mock fallbacks for endpoints that are unavailable or not yet implemented.
- `src/store` — Zustand auth state with token persistence.
- `src/utils` and `src/types` — helpers and entity interfaces aligned to backend semantics.

## Backend alignment notes

- Existing endpoints from the Express backend are used when available.
- The UPS list endpoint is derived from `/equipment` + `/equipment/ups/:id` because the backend currently exposes detail but not a list endpoint.
- All missing or unavailable endpoints fall back to clearly marked mock data via `MockBanner` in the UI.

## Run

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` if the backend is not running on `http://localhost:3000`.


## Local launch notes

- Start backend from the repository root with `npm run backend`.
- Start frontend with `npm --prefix frontend run dev` or from the `frontend/` folder with `npm run dev`.
- Browser login requires backend CORS to allow `http://localhost:5173`; the Express app now sets this via `FRONTEND_ORIGIN` or defaults to the Vite origin.
- If backend is down or unreachable, the login screen intentionally falls back to a demo session.
