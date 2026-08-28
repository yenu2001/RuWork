# RuWork frontend

Phase 3 provides the public and authentication foundation for RuWork using Vite, React, Tailwind CSS, React Router, and Axios.

## Local setup

1. Copy `.env.example` to `.env` if `.env` is missing.
2. Start the existing backend on port `5000`.
3. Run `npm install`.
4. Run `npm run dev` and open `http://localhost:5173`.

The default `VITE_API_BASE_URL=/api` uses the Vite development proxy to reach `http://localhost:5000`. For a deployment, set `VITE_API_BASE_URL` to the public API base URL supported by that environment. `VITE_` values are public browser configuration and must never contain secrets.

## Authentication storage

RuWork stores the Phase 2 bearer access token and its decoded display claims in `sessionStorage` under `ruwork.auth`. Session storage supports restoration after a reload in the same browser tab and clears when that tab/session closes. It reduces persistence compared with `localStorage`, but it is still readable by JavaScript and therefore remains exposed if an XSS vulnerability exists. The frontend never stores passwords, never puts tokens in URLs, and does not invent a refresh token because the backend does not provide one.

JWT payload decoding is used only to restore display identity and choose frontend routes; it does not verify the JWT signature. The backend remains authoritative for authentication, eligibility, authorization, and account status.

## Commands

- `npm run dev` — start Vite with the local API proxy.
- `npm run lint` — run ESLint.
- `npm test` — run the focused Vitest suite once.
- `npm run build` — produce the production bundle in `dist/`.
- `npm run preview` — preview the production bundle.

Full dashboards, jobs, applications, reviews, messages, notifications, and payment processing are intentionally outside Phase 3.
