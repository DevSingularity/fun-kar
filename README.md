# PERN Full-Stack Template

**PostgreSQL · Express · React · Node.js + Drizzle ORM**

Production-grade hackathon-ready template. Zero Firebase, zero Supabase — pure PostgreSQL with a dual-driver setup for local Docker and Neon cloud deployment.

---

## Stack

| Layer    | Tech                                   |
|----------|----------------------------------------|
| Frontend | React 19, Vite, TailwindCSS v4, Zustand |
| Backend  | Express 5, Node.js ESM                |
| ORM      | Drizzle ORM                           |
| Database | PostgreSQL (Docker locally / Neon cloud) |
| Auth     | JWT (access + refresh token rotation) |

---

## Quick Start

### 1. Start local Postgres
```bash
docker compose up -d
```

### 2. Server
```bash
cd server
cp .env.example .env    # fill in JWT_SECRET at minimum
npm install
npm run db:push          # apply schema to local DB
npm run dev
```

### 3. Client
```bash
cd client
cp .env.example .env    # or leave defaults for local
npm install
npm run dev
```

App: http://localhost:5173  
API: http://localhost:5000/api

---

## Customize for your PS

### Rename the user entity
`users.name` in `server/src/db/schema/users.js` — rename to `orgName`, `teamName`, `fullName`, etc.  
Update the label in `RegisterPage.jsx` to match.

### Add domain tables
1. Copy `server/src/db/schema/resourceItems.js` → rename file + table
2. Export it in `db/schema/index.js`
3. Run `npm run db:push`
4. Copy service + controller + route files and rename

### Add dashboard pages
1. Create `client/src/pages/dashboard/YourPage.jsx` (copy `DashboardHomePage`)
2. Add a nav item in `DashboardLayout.jsx`
3. Add a `<Route>` in `AppRoutes.jsx`

### Find all placeholders
```bash
grep -r "TODO" server/src/ client/src/ --include="*.js" --include="*.jsx" -n
```

---

## Auth API

| Method | Endpoint        | Auth?  | Body                          |
|--------|-----------------|--------|-------------------------------|
| POST   | /auth/register  | No     | `{ name, email, password }`   |
| POST   | /auth/login     | No     | `{ email, password }`         |
| POST   | /auth/refresh   | Cookie | —                             |
| POST   | /auth/logout    | Cookie | —                             |
| GET    | /auth/me        | Bearer | —                             |

---

## Deploy to Neon (Production DB)

1. Create a free project at https://neon.tech
2. Copy the connection string (contains `neon.tech`)
3. Set it as `DATABASE_URL` in `server/.env`
4. Run `npm run db:push` — Drizzle applies schema to Neon automatically
5. The app auto-detects Neon and switches to the serverless HTTP driver

---

## Drizzle Cheatsheet

```bash
npm run db:push      # push schema changes to DB (no migration files)
npm run db:generate  # generate SQL migration files
npm run db:migrate   # run pending migrations
npm run db:studio    # open Drizzle Studio (visual DB browser)
```
