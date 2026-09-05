# Architecture — PERN Template

## Folder structure

```
pern-template/
├── client/                  React 19 + Vite + TailwindCSS v4
│   └── src/
│       ├── components/      Reusable UI library (30+ components)
│       │   ├── layout/      DashboardLayout (sidebar + outlet)
│       │   └── loaders/     GlobalLoader, spinner
│       ├── pages/auth/      LoginPage, RegisterPage (JWT, no Firebase)
│       ├── pages/dashboard/ DashboardHomePage (template for more pages)
│       ├── pages/landing/   LandingPage
│       ├── routes/          AppRoutes (PrivateRoute guard)
│       ├── services/api.js  Axios + JWT interceptors
│       └── store/auth.store Zustand + localStorage persist
│
├── server/                  Express 5 + Drizzle ORM + PostgreSQL
│   └── src/
│       ├── config/database  Auto-selects pg Pool (local) or Neon (cloud)
│       ├── db/schema/       Drizzle table definitions (users + template)
│       ├── db/migrations/   drizzle-kit generated SQL
│       ├── controllers/     auth + resource (template)
│       ├── services/        auth + resource (template)
│       ├── routes/          auth + resource + health
│       ├── middlewares/     verifyToken, error, notFound
│       └── validators/      auth + resource
│
├── docker-compose.yml       Local Postgres on port 5432
└── docs/                    This file, API contracts, checklist
```

## Auth flow (JWT)

- Access token  (15 min) — sent as `Authorization: Bearer <token>`  
- Refresh token (7 days)  — stored as HttpOnly cookie + hashed in DB  
- On each refresh → refresh token is rotated (old hash invalidated)  
- On logout → `refreshTokenHash` is set to null in DB  

## Database driver selection

`connectDatabase()` reads `DATABASE_URL`:
- Contains `neon.tech` → Neon serverless HTTP driver  
- Anything else → standard `pg` Pool (local Docker)  
