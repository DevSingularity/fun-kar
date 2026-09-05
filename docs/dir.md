# DealFlow360 — Final Expected Directory Structure (Feature-Based)

> Source: `docs/plan (1).md` (Phases 1–9) + `docs/p1.md` (Phase 1 auth foundation) + `docs/p2.md` (Phase 2 config & risk).
> Rule: **Feature / engine isolation** — every business engine gets its own directory under `server/src/modules/`. Controllers/services/validators are **inside** the feature, never top-level. `quotation`, `risk`, and `approval` are three **separate** engines as required.

---

## 1. Top-Level Repo

```
ODOO/
├── client/                  # React — sales / admin / customer-portal
├── server/                  # Express + Drizzle + PostgreSQL
├── shared/                  # (optional) shared DTO / enum constants
├── docs/
│   ├── plan (1).md          # 9-phase master plan — source of truth
│   ├── p1.md                # Phase 1 detail (auth)
│   ├── p2.md                # Phase 2 detail (catalog + governance + risk)
│   └── dir.md               # ← this file — final expected tree
└── docker-compose.yml
```

---

## 2. Server — `server/src/` (Final, after Phase 9)

```
server/src/
├── app.js                   # helmet, cors, cookieParser, json, requestId, routes mount, errorHandler
├── index.js                 # bootstrap + env validation + db connect + seed
│
├── config/
│   ├── env.js               # central validated env (JWT_SECRET, DATABASE_URL, PORT, API_PREFIX, demo flags)
│   └── database.js          # Drizzle pg/neon client factory + getDb()
│
├── db/
│   ├── index.js
│   ├── migrations/          # drizzle-kit generated
│   └── schema/              # 1 file per domain — mirrors plan.md §1 tables
│       ├── index.js         # barrel re-export
│       ├── enums.js         # role, tier, productType, quoteStatus, approvalLevel, etc.
│       ├── users.js         # users (ADMIN, SALES_REP, SALES_MANAGER, FINANCE, OPERATIONS)
│       ├── customers.js     # customers
│       ├── catalog.js       # product_categories, products, product_variants
│       ├── quotations.js    # quotations, quotation_items
│       ├── governance.js    # customer_tier_discount_limits, category_discount_limits, approval_rules
│       ├── orders.js        # orders, order_items
│       ├── warehouses.js    # warehouses, warehouse_stock, fulfillment_allocations, backorders
│       ├── billing.js       # subscription_plans, billing_schedules, invoices, payments, credit_notes
│       ├── negotiation.js   # portal_tokens, negotiation_requests, negotiation_comments
│       ├── intelligence.js  # upsell_rules
│       ├── dealhealth.js    # deal_alerts
│       ├── audit.js         # audit_logs
│       └── relations.js     # drizzle relations
│
├── common/                  # cross-engine shared kernel (no business logic)
│   ├── response.util.js     # success() / fail() envelope
│   ├── errors.js            # AppError + ValidationError, UnauthenticatedError, ForbiddenError, NotFoundError, ConflictError
│   ├── asyncHandler.js      # async wrapper → next(err)
│   ├── jwt.util.js          # signAccessToken / signRefreshToken / verify / buildTokenPair
│   ├── password.util.js     # bcrypt hash/compare (cost 12)
│   └── pagination.util.js   # parseListQuery() / buildMeta() — used by every list endpoint (p2 §5)
│
├── middlewares/
│   ├── requestId.middleware.js
│   ├── authenticate.middleware.js  # replaces verifyToken.js — Bearer + cookie, checks type==='access'
│   ├── authorize.middleware.js     # authorize(...roles) RBAC factory
│   ├── rateLimiter.middleware.js   # buildLimiter + authLimiter
│   ├── notFound.middleware.js
│   └── errorHandler.middleware.js
│
├── routes/
│   └── index.js             # single mount point — imports every modules/*/ *.routes.js
│
└── modules/                 # ← FEATURE / ENGINE BOUNDARY — one folder = one engine
    │
    ├── auth/                # Phase 1 — Identity (plan.md §3)
    │   ├── auth.routes.js
    │   ├── auth.validator.js
    │   ├── auth.controller.js
    │   ├── auth.service.js
    │   └── auth.repository.js
    │
    ├── categories/          # Phase 2 — Product categories (plan.md §2.1)
    │   ├── categories.routes.js
    │   ├── categories.validator.js
    │   ├── categories.controller.js
    │   ├── categories.service.js
    │   └── categories.repository.js
    │
    ├── products/            # Phase 2 — Products + variants (plan.md §2.1)
    │   ├── products.routes.js
    │   ├── products.validator.js
    │   ├── products.controller.js
    │   ├── products.service.js
    │   └── products.repository.js
    │
    ├── priceLists/          # Phase 2 — Price lists + resolve (plan.md §2.3)
    │   ├── priceLists.routes.js      # CRUD + PUT /:id/items (upsert) + DELETE /:id/items/:itemId
    │   ├── priceLists.validator.js
    │   ├── priceLists.controller.js
    │   ├── priceLists.service.js
    │   └── priceLists.repository.js
    │   # pricing/resolve (GET /pricing/resolve?customerId=&productId=) lives here, mounted at /pricing
    │
    ├── customers/           # Phase 2 — Customers (plan.md §2.2)
    │   ├── customers.routes.js
    │   ├── customers.validator.js
    │   ├── customers.controller.js
    │   ├── customers.service.js
    │   └── customers.repository.js
    │
    ├── governance/          # Phase 2 — Discount governance + approval bands (plan.md §2.4)
    │   ├── governance.routes.js      # tier-discount-limits, category-discount-limits, approval-rules
    │   ├── governance.validator.js
    │   ├── governance.controller.js
    │   ├── governance.service.js
    │   └── governance.repository.js
    │
    ├── risk/                # Phase 2 — evaluateQuoteRisk (plan.md §2.5) — NO HTTP ROUTES
    │   ├── risk.service.js       # evaluateQuoteRisk(quotationId) → {lineViolations, blendedRiskScore, requiredApprovalLevel, approvalChain}
    │   └── risk.repository.js    # batched reads: quotation+customer, items→products, tierLimit, categoryLimits, approvalRules
    │   # Imported by: modules/quotation (submit) + modules/negotiation (re-approval)
    │   # Never mounted in routes/index.js — pure internal service
    │
    ├── quotation/           # Phase 3 — Sales workspace + Quotation engine (plan.md §3)
    │   ├── quotation.routes.js       # GET/POST /quotations, GET /quotations/:id, PUT /quotations/:id, POST /quotations/:id/submit, GET /quotations/:id/risk, pipeline
    │   ├── quotation.validator.js
    │   ├── quotation.controller.js
    │   ├── quotation.service.js      # create, update, submit (validate→margin→risk→approvalChain→status tx), margin calc
    │   └── quotation.repository.js
    │   # owns: quotations, quotation_items
    │
    ├── approval/            # Phase 4 — Approval engine (plan.md §2.5 + §4.2)
    │   ├── approval.routes.js        # GET /approvals, POST /approvals/:id/approve|reject|return, GET /quotations/:id/approvals
    │   ├── approval.validator.js
    │   ├── approval.controller.js
    │   ├── approval.service.js       # approve/reject/return (tx: update approval_request → update quotation → audit_logs)
    │   └── approval.repository.js
    │   # owns: approval_requests, approval_actions
    │   # calls: risk.service.evaluateQuoteRisk (read-only) for explainability
    │
    ├── recommendation/      # Phase 4 — Upsell / Cross-sell (plan.md §4.1)
    │   ├── recommendation.routes.js  # GET /quotations/:id/recommendations, POST /quotations/:id/recommendations/:productId/add
    │   ├── recommendation.validator.js
    │   ├── recommendation.controller.js
    │   ├── recommendation.service.js # deterministic ranking: promoted + coPurchaseScore + marginEligibility
    │   └── recommendation.repository.js
    │   # owns: upsell_rules (reads products, quotation_items for context)
    │
    ├── warehouses/          # Phase 5 — Warehouse config (plan.md §5.1)
    │   ├── warehouses.routes.js      # CRUD /warehouses, stock management
    │   ├── warehouses.validator.js
    │   ├── warehouses.controller.js
    │   ├── warehouses.service.js
    │   └── warehouses.repository.js
    │   # owns: warehouses, warehouse_stock
    │
    ├── fulfillment/         # Phase 5 — Allocation + backorders (plan.md §5.2–5.4)
    │   ├── fulfillment.routes.js     # GET /orders/:id/allocation, POST /orders/:id/allocate, PUT /orders/:id/allocation, POST /orders/:id/backorder/consolidate
    │   ├── fulfillment.validator.js
    │   ├── fulfillment.controller.js
    │   ├── fulfillment.service.js    # allocateOrder(orderId) — score: fewer shipments + lower shipping cost + stock penalty
    │   └── fulfillment.repository.js
    │   # owns: fulfillment_allocations, backorders
    │
    ├── billing/             # Phase 6 — Hybrid billing + subscriptions (plan.md §6)
    │   ├── billing.routes.js         # GET /orders/:id/billing, GET /orders/:id/schedule, POST /subscriptions/:id/change, POST /subscriptions/:id/cancel
    │   ├── billing.validator.js
    │   ├── billing.controller.js
    │   ├── billing.service.js        # schedule generation, proration (planPrice×activeDays/cycleDays), credit notes
    │   └── billing.repository.js
    │   # owns: subscription_plans, billing_schedules, invoices, payments, credit_notes
    │   # keeps one-time + recurring lines in one order, distinguished by billing behavior
    │
    ├── negotiation/         # Phase 7 — Negotiation engine (plan.md §7.2–7.3)
    │   ├── negotiation.routes.js     # internal: POST /quotations/:id/negotiate (rep view), re-triggers risk
    │   ├── negotiation.validator.js
    │   ├── negotiation.controller.js
    │   ├── negotiation.service.js    # requestChange, counter discount, audit, calls risk → approval if needed
    │   └── negotiation.repository.js
    │   # owns: negotiation_requests, negotiation_comments (internal side)
    │
    ├── portal/              # Phase 7 — Separate customer portal (plan.md §7.1, §7.4) — RESTRICTED trust boundary
    │   ├── portal.routes.js          # GET /portal/quotes/:token, POST /portal/quotes/:token/negotiate|comment|confirm
    │   ├── portal.validator.js
    │   ├── portal.controller.js
    │   ├── portal.service.js         # token verification, filtered quote view (no margin/risk/config), negotiation + confirm→order
    │   └── portal.repository.js
    │   # owns: portal_tokens, customer_users (separate auth, per p1 assumption 4)
    │   # NEVER exposes: internal risk, margin, approval config, admin screens
    │
    ├── dealHealth/          # Phase 8 — Deal health & anomaly (plan.md §8.1–8.5)
    │   ├── dealHealth.routes.js      # GET /dashboard/health, GET /dashboard/anomalies, POST /dashboard/nudge
    │   ├── dealHealth.validator.js
    │   ├── dealHealth.controller.js
    │   ├── dealHealth.service.js     # stalled (>N days), at-risk, low-margin, backorders, delivery slippage, discount anomaly (vs rep avg + threshold)
    │   └── dealHealth.repository.js
    │   # owns: deal_alerts (reads quotations, orders, approvals, fulfillment)
    │
    ├── reporting/           # Phase 8 — Reporting (plan.md §8.6)
    │   ├── reporting.routes.js       # GET /reports?period=&rep=&approvalStatus=&product=&category=, CSV export
    │   ├── reporting.validator.js
    │   ├── reporting.controller.js
    │   ├── reporting.service.js      # quotationCount, orderValue, approvalCount, discountAvg, topProducts, salesByRep
    │   └── reporting.repository.js
    │
    └── audit/               # Cross-cutting — audit trail (plan.md §2.5 audit log + §4.2)
        ├── audit.service.js          # log({actorId, entityType, entityId, action, oldValue, newValue})
        └── audit.repository.js       # writes audit_logs — called inside every mutation tx (approval, negotiation, fulfillment, billing)
        # No HTTP routes — imported by every engine's service

# DELETED generic scaffold (not feature-based, not part of DealFlow360):
server/src/routes/resource.route.js
server/src/services/resource.service.js
server/src/validators/resource.validator.js
server/src/db/schema/resourceItems.js
server/src/middlewares/verifyToken.js        → replaced by authenticate.middleware.js
server/src/controllers/                      → dissolved into modules/*/ *.controller.js
server/src/services/                         → dissolved into modules/*/ *.service.js
server/src/validators/                       → dissolved into modules/*/ *.validator.js
server/src/routes/auth.route.js              → moved to modules/auth/auth.routes.js
server/src/features/feature1name             → removed
server/src/features/feature2name             → removed
```

---

## 3. Route Mounting (`server/src/routes/index.js`)

```js
router.use('/auth',                authRoutes)              // Phase 1
router.use('/categories',          categoryRoutes)          // Phase 2
router.use('/products',            productRoutes)           // Phase 2
router.use('/price-lists',         priceListRoutes)         // Phase 2
router.use('/pricing',             pricingResolveRouter)    // Phase 2 — GET /pricing/resolve
router.use('/customers',           customerRoutes)          // Phase 2
router.use('/governance',          governanceRoutes)        // Phase 2
// risk — never mounted (internal service only)
router.use('/quotations',          quotationRoutes)         // Phase 3
router.use('/approvals',           approvalRoutes)          // Phase 4
router.use('/quotations/:id/recommendations', recommendationRoutes) // Phase 4
router.use('/warehouses',          warehouseRoutes)         // Phase 5
router.use('/orders',              fulfillmentRoutes)       // Phase 5 — /orders/:id/allocation etc.
router.use('/orders',              billingRoutes)           // Phase 6 — /orders/:id/billing etc.
router.use('/subscriptions',       billingRoutes)           // Phase 6 — /subscriptions/:id/change|cancel
router.use('/portal',              portalRoutes)            // Phase 7 — /portal/quotes/:token/*
router.use('/dashboard',           dealHealthRoutes)        // Phase 8 — /dashboard/health, /dashboard/anomalies
router.use('/reports',             reportingRoutes)         // Phase 8
```

---

## 4. Client — `client/src/` (Feature-based, mirrors backend engines)

```
client/src/
├── App.jsx
├── main.jsx
├── index.css
├── app/styles/theme.css
│
├── services/
│   └── api.js                 # axios instance, JWT attach, refresh handling
├── store/
│   ├── auth.store.js          # zustand — user, tokens, demo accounts
│   ├── quotation.store.js
│   └── approval.store.js
├── hooks/
│   └── useAuth.js
├── utils/
│   └── formatDate.js
│
├── components/                # design-system primitives (shared kernel)
│   ├── layout/DashboardLayout.jsx
│   ├── Header.jsx / Sidebar.jsx / Footer.jsx / Breadcrumb.jsx
│   ├── Button.jsx / Input.jsx / Select.jsx / TextArea.jsx / Toggle.jsx / Checkbox.jsx / RadioButton.jsx
│   ├── Card.jsx / Badge.jsx / Chip.jsx / Table.jsx / Modal.jsx / Tabs.jsx / Pagination.jsx / StatCard.jsx
│   └── loaders/GlobalLoader.jsx / loadnet.jsx
│
├── routes/
│   └── AppRoutes.jsx          # role-guarded routes
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx      # + demo account selector (plan.md §3 bonus)
│   │   └── RegisterPage.jsx
│   ├── dashboard/             # Phase 8 — Management layer
│   │   └── DashboardHomePage.jsx  # Active Deals, Pending Approvals, Stalled, At-Risk, Low Margin, Backorders
│   ├── quotations/            # Phase 3 — Hero screen
│   │   ├── QuotationListPage.jsx      # quote number, customer, amount, status, approval status, rep
│   │   ├── QuotationBuilderPage.jsx   # customer→products→quantity→price→discount→tax→lineTotal→margin→risk→upsell→submit
│   │   ├── QuotationDetailPage.jsx
│   │   └── PipelinePage.jsx           # Kanban: Draft → Pending Approval → Approved → Under Negotiation → Confirmed → Fulfillment → Completed
│   ├── approvals/             # Phase 4
│   │   └── ApprovalCenterPage.jsx     # risk, violations, margin impact, chain, Approve/Reject/Return + reason, audit trail
│   ├── fulfillment/           # Phase 5
│   │   └── FulfillmentPage.jsx        # warehouse split table, shipments, shipping cost, Accept / Manual Override, backorder banner
│   ├── billing/               # Phase 6
│   │   └── BillingPage.jsx            # one-time invoice + recurring schedule + proration + credit note
│   ├── portal/                # Phase 7 — Separate layout/route
│   │   └── CustomerPortalPage.jsx     # /portal/:token — quote view, comment, counter-offer, confirm, negotiation timeline
│   ├── admin/
│   │   ├── ProductsPage.jsx
│   │   ├── PricingPage.jsx            # price lists + tier prices
│   │   ├── DiscountsPage.jsx          # tier ceilings + category ceilings + approval bands (visual: Why approval required?)
│   │   ├── WarehousesPage.jsx
│   │   └── SubscriptionsPage.jsx
│   └── landing/
│       └── LandingPage.jsx
│
└── features/                  # (alternative) per-feature API hooks — mirrors server/modules
    ├── auth/
    ├── quotation/
    ├── risk/                  # explainable risk — Why approval required? (allowed vs requested vs overage)
    ├── approval/
    ├── recommendation/
    ├── fulfillment/
    ├── billing/
    ├── negotiation/
    └── dealHealth/
```

---

## 5. Phase → Module Traceability

| Phase | Plan.md § | Engine / Module | Tables touched | Reusable service |
|-------|-----------|-----------------|----------------|------------------|
| 1 | §3 Auth | `auth` | `users`, `audit_logs` | `authService` + `authenticate`/`authorize` |
| 2 | §2.1–2.4 | `categories`, `products`, `customers`, `priceLists`, `governance` | `product_categories`, `products`, `product_variants`, `customers`, `price_lists`, `price_list_items`, `customer_tier_discount_limits`, `category_discount_limits`, `approval_rules` | `pricingService` (`resolvePrice`) |
| 2 | §2.5 | `risk` | reads all above + `quotations`, `quotation_items` | `evaluateQuoteRisk(quotationId)` — pure read, no side effects |
| 3 | §3 | `quotation` | `quotations`, `quotation_items` | `quotationService` + live margin (`revenue-cost=margin%`) |
| 4 | §4.1 | `recommendation` | `upsell_rules` | `recommendationService` — promoted + coPurchaseScore + margin |
| 4 | §4.2 | `approval` | `approval_requests`, `approval_actions` | `approvalService` — approve/reject/return (tx) + explainable risk |
| 5 | §5 | `warehouses`, `fulfillment` | `warehouses`, `warehouse_stock`, `fulfillment_allocations`, `backorders` | `allocateOrder(orderId)` — fewer shipments + lower cost |
| 6 | §6 | `billing` | `subscription_plans`, `billing_schedules`, `invoices`, `payments`, `credit_notes` | `billingService` — schedule + proration (`price×activeDays/cycleDays`) + credit |
| 7 | §7 | `portal`, `negotiation` | `portal_tokens`, `negotiation_requests`, `negotiation_comments` | `negotiationService` — triggers `risk` → `approval` on commercial change |
| 8 | §8 | `dealHealth`, `reporting` | `deal_alerts` (reads all) | `dealHealthService` (stalled, anomaly, slippage, nudge) + `reportingService` |
| 9 | §9 | hardening | — | validation, tx, audit, demo polish |

---

## 6. Feature Isolation Rules (from p1.md §18 / p2.md §2)

1. **One engine = one directory under `modules/`.** Never cross-import repositories. If `approval` needs risk data it imports `risk.service.evaluateQuoteRisk`, not `risk.repository`.
2. **Service is the seam.** `quotation.service.submit()` is the only place that writes `blendedRiskScore` + creates `approval_requests` inside its own transaction — `risk.service` stays side-effect-free.
3. **RBAC at route layer.** `authenticate` on every route (except `POST /auth/login|register|refresh` + `GET /portal/quotes/:token`), `authorize('ADMIN', ...)` per §roles in p2 assumption 1.
4. **Consistent envelope.** Every controller uses `common/response.util.js` → `{success, data}` / `{success, error:{code,message,details}}`.
5. **Pagination + sorting** via `common/pagination.util.js` on every list endpoint (capped `pageSize=100`).
6. **Transactions** for every multi-statement mutation (`quote submit`, `approval`, `order confirm`, `allocation`, `subscription change`, `negotiation`).
7. **Explainability is a requirement, not bonus.** `GET /quotations/:id/risk` + approval center + recommendation reason + billing breakdown all show the calculation, not a fake label.

---

## 7. Visual — Engine Flow (maps to plan.md Central Loop)

```
CONFIGURE (governance, warehouses, priceLists, catalog)
   ↓
QUOTE (quotation builder)
   ↓
CALCULATE (pricing resolve + margin)
   ↓
GOVERN (risk: allowedDiscount = MIN(tierLimit, categoryLimit) → overage → lineRisk → blendedRiskScore)
   ↓
APPROVE (approval chain: NONE → MANAGER → MANAGER_FINANCE, audit)
   ↓
RECOMMEND (upsell ranked by co-purchase + promotion + margin)
   ↓
FULFILL (allocateOrder → split → backorder)
   ↓
BILL (one-time invoice + recurring schedule + proration + credit)
   ↓
NEGOTIATE (customer portal counter-offer)
   ↓
RE-EVALUATE (risk re-run → auto re-approval)
   ↓
CONFIRM (→ order → fulfillment + billing)
   ↓
MONITOR (deal health: stalled, anomaly, slippage, nudge + reporting)
```

Each arrow is a **module boundary** — the directory tree above makes that boundary explicit and import-safe.
