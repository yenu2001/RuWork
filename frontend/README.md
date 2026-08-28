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

Phase 10 adds server-side revocation. Access tokens carry a `tv` revocation claim that the backend compares against the account's stored version on every authenticated request, so a password change or a sign-out invalidates issued tokens rather than relying on the browser discarding them. Signing out calls the API's logout endpoint first and clears local state regardless of the result. If the API rejects a stored token with `401`, the shared Axios client clears the session and the app returns the user to sign-in instead of leaving a workspace that can no longer load data.

## Deployment

The production build in `dist/` is a single-page application. The host must rewrite unknown paths to `index.html` so deep links such as `/reset-password?token=…`, `/jobs/:id`, and the role workspaces resolve. Set `VITE_API_BASE_URL` at build time to the public API base URL for that environment, and add that site origin to the backend's `CLIENT_URL`/`CORS_ORIGINS` allowlist.

## Commands

- `npm run dev` — start Vite with the local API proxy.
- `npm run lint` — run ESLint.
- `npm test` — run the focused Vitest suite once.
- `npm run build` — produce the production bundle in `dist/`.
- `npm run preview` — preview the production bundle.

Payment processing is permanently out of scope: RuWork records agreed prices but never collects, holds, or transfers money.
