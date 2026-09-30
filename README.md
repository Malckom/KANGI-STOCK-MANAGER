# KANGI Stock Manager

A point-of-sale, inventory and CRM system for a Kenyan hardware store — React/Vite frontend
with an Express + SQLite backend.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind
- **Backend:** Express (TypeScript, run via `tsx`) + SQLite (`better-sqlite3`)
- **Auth:** Staff PIN login (till) + email/password login, JWT sessions, role-based permissions
  (admin / manager / cashier / clerk)
- **Database file:** `data/kangi.db` — created and seeded automatically on first run

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and set a real `JWT_SECRET` (a random 64-char hex string is fine):
   ```
   cp .env.example .env
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Run the app (serves both the API and the Vite dev frontend on the same port):
   ```
   npm run dev
   ```
4. Open http://localhost:3000

The SQLite database is created automatically at `data/kangi.db` and seeded with a demo
Nairobi hardware-store dataset (19 products, sample customers, sales, purchases) the first
time the server starts.

### Demo staff logins (PIN)

| Role    | Name           | PIN  |
|---------|----------------|------|
| Admin   | James Kangi    | 1234 |
| Manager | Grace Wambui   | 2222 |
| Cashier | Brian Ochieng  | 1111 |
| Clerk   | Faith Wanjiku  | 3333 |

The app auto-signs in as the Admin demo account on first load so it's immediately usable;
use the lock/switch-user screen to try the other roles.

## Deploying to a VPS

1. `npm run build` — builds the frontend into `dist/` and bundles the server into `dist/server.cjs`.
2. Set real environment variables on the server: `JWT_SECRET` (required), `PORT` (optional),
   `NODE_ENV=production`.
3. Run the bundled server: `npm start` (runs `node dist/server.cjs`), kept alive with `pm2` or `systemd`.
4. Back up `data/kangi.db` regularly — it's the single source of truth for all store data.

## Project layout

```
server.ts           Express app: all REST routes
server/db.ts         SQLite schema, seeding, full-database read/replace helpers
server/auth.ts        JWT signing/verification, role permissions, auth middleware
src/services/api.ts    Frontend REST client (attaches JWT to every request)
src/services/authService.ts   Frontend auth client (PIN/email login, session/lock state)
src/services/AuthContext.tsx  React context wiring auth into the app
```
