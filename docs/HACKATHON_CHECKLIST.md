# 8-Hour Hackathon Checklist

## Hour 0–1: Setup + Schema (most important)
- [ ] `cp server/.env.example server/.env` and fill in values
- [ ] `docker compose up -d` → start local Postgres
- [ ] `cd server && npm install && npm run db:push`
- [ ] `cd client && npm install`
- [ ] Verify auth: register, login, /auth/me — must work before anything else

## Hour 1–3: Backend for your PS
- [ ] Copy `server/src/db/schema/resourceItems.js` → rename for your domain
- [ ] Add new schema to `db/schema/index.js`
- [ ] Run `npm run db:push`
- [ ] Copy `services/resource.service.js` → rename, edit queries
- [ ] Copy `controllers/resource.controller.js` → rename
- [ ] Add route in `routes/index.js`

## Hour 3–5: Frontend for your PS
- [ ] Add nav items to `DashboardLayout.jsx`
- [ ] Create page component(s) in `pages/dashboard/`
- [ ] Wire to API via `api.js`
- [ ] Add routes in `AppRoutes.jsx`

## Hour 5–7: Core PS features + polish
- [ ] Implement the key PS-specific logic
- [ ] Add toasts, loading spinners, empty states
- [ ] Full flow test: register → login → CRUD

## Hour 7–8: Deploy
- [ ] Set `DATABASE_URL` to Neon cloud URL
- [ ] `npm run db:push` on Neon
- [ ] Deploy server (Railway / Render / Fly.io)
- [ ] Deploy client (Vercel), set `VITE_API_BASE_URL`
- [ ] Smoke test

## Find all TODOs
```bash
grep -r "TODO" server/src/ client/src/ --include="*.js" --include="*.jsx" -n
```
