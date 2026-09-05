# DealFlow360 — Intelligent B2B Sales Operations Platform

An intelligent, self-governing Sales Operations platform designed to enforce pricing discipline, react to multi-warehouse inventory reality in real time, reconcile hybrid subscriptions and one-time sales on a single order, and empower both sales reps and customers with live, negotiable digital deal workspaces.

---

## Key Capabilities

- **Multi-Tier Discount Governance & Blended Risk Engine:** Enforces discount ceilings per customer tier (Bronze, Silver, Gold) and product category. Calculates a real-time blended risk score to automatically route quotes to Sales Manager and Finance Manager review chains.
- **Live Upsell & Cross-Sell Recommendations:** Machine-assisted product pairing suggestions based on historical co-purchase patterns with real-time margin impact meters.
- **Multi-Warehouse Fulfillment Splitting & Backordering:** Optimizes shipment routes across regional fulfillment centers (Austin, Rotterdam, Singapore, Frankfurt) with automated backorder consolidation.
- **Hybrid Billing & Subscriptions:** Seamlessly mixes one-time hardware/services with recurring SaaS subscriptions on a single order, complete with mid-cycle proration and credit note reconciliation.
- **Customer Negotiation Portal:** A dedicated, secure customer workspace (`/v1/customer/:id`) for line-level change requests, counter-discount proposals, and one-click confirmations that automatically re-trigger governance when policy limits are breached.
- **Deal Health & Anomaly Radar:** Proactively surfaces stalled deals ($> 7$ days inactive), discount anomaly spikes, and delivery slippage with 1-click rep nudging.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, TailwindCSS v4, React Router v7, Zustand, Lucide Icons |
| **Backend** | Node.js (ESM), Express 5, Drizzle ORM |
| **Database** | PostgreSQL with dual-driver support (Local Docker & Neon Serverless) |
| **Authentication** | JWT (Access + Refresh token rotation) with hierarchical RBAC & Customer Portal Auth |

---

## Role-Based Access Control (RBAC) & Demo Credentials

All test accounts are configured with password: `Password123!`

| Role | Email | Scope & Responsibilities |
| :--- | :--- | :--- |
| **Admin** | `admin@dealflow.io` | Global catalog, price lists, discount tiers, warehouses, system-wide analytics |
| **Sales Rep (Team 1)** | `rep@dealflow.io` *(Marcus Vance)* | Builds quotes, applies discounts, reviews upsells, responds to negotiations |
| **Sales Rep (Team 2)** | `rep2@dealflow.io` *(Elena Rostova)* | Manages enterprise deals, tracks backorder fulfillment |
| **Sales Manager (Team 1)**| `manager@dealflow.io` *(Sarah Jenkins)* | Reviews Tier 1 discounts, monitors team pipeline and at-risk deals |
| **Sales Manager (Team 2)**| `manager2@dealflow.io` *(David Miller)* | Approves escalated quotes, tracks team revenue targets |
| **Finance Manager** | `finance@dealflow.io` *(Claire Sterling)* | 2nd-level approval for high-risk discounts, billing proration, reconciliation |
| **Operations Manager** | `ops@dealflow.io` *(Logan Pierce)* | Warehouse inventory allocation, shipment splitting, backorder consolidation |
| **Customer (Portal)** | `customer@apexlogistics.com` *(Apex Logistics)* | Online quote review, line-level comments, counter-discount negotiation |

---

## Quick Start

### 1. Database Setup
```bash
# Start PostgreSQL container
docker compose up -d
```

### 2. Backend Server
```bash
cd server
cp .env.example .env
npm install
npm run seed     # Seeds master catalog, pricing matrices, warehouses, and simulation deals
npm run dev      # Starts API server on http://localhost:5000
```

### 3. Frontend Client
```bash
cd client
npm install
npm run dev      # Starts client app on http://localhost:5173
```

---

## Core API Modules

- `/api/auth` — Authentication, session refresh, and user profile
- `/api/quotations` — Quotation builder, cart calculations, lifecycle states
- `/api/governance` — Tier limits, category ceilings, approval rules
- `/api/risk` — Blended discount risk scoring engine
- `/api/approvals` — Staged multi-level review workflows & audit logs
- `/api/fulfillment` — Multi-warehouse inventory, auto-splitting, and backorders
- `/api/billing` — Invoices, subscriptions, schedules, proration, reconciliation
- `/api/portal/quotes` — Customer portal access, negotiation threads, counter offers
- `/api/deal-health` — Anomaly detection, stalled deal alerts, escalation triggers
