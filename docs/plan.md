# DealFlow360 --- 8-Hour Odoo National Hackathon MVP Plan

> **Objective:** Build a stable, demonstrable MVP of DealFlow360 in 8
> hours using **PERN + Drizzle ORM + PostgreSQL**, then iterate with
> differentiating features.
>
> **Primary rule:** Implement the business rules in application logic.
> Do not fake approval routing, discount governance, warehouse
> splitting, billing/proration, or customer negotiation.

------------------------------------------------------------------------

## 0. Product Goal

DealFlow360 is an intelligent, self-governing B2B sales operations
platform that takes a deal through:

**Login → Configuration → Quotation → Discount/Risk Evaluation →
Approval → Upsell/Cross-sell → Fulfillment → Hybrid Billing → Customer
Negotiation → Re-approval if needed → Confirmation → Payment/Invoice →
Deal Health → Reporting**

The MVP should prove that the system is a **working business engine**,
not merely a collection of CRUD screens.

### Hackathon success criteria

The application must demonstrate:

1.  Internal user authentication and role-based access.
2.  Product, customer, price-list, discount, warehouse, and subscription
    configuration.
3.  Quotation creation with quantities and discounts.
4.  Automatic discount/risk evaluation and approval routing.
5.  Manager/Finance approval and audit trail.
6.  Live upsell/cross-sell recommendations with margin impact.
7.  Multi-warehouse stock allocation with manual override.
8.  Backorder handling.
9.  One-time + recurring subscription lines in one order.
10. Billing schedule and basic proration.
11. Separate customer-facing portal.
12. Customer negotiation and automatic re-approval when terms exceed
    limits.
13. Deal-health/anomaly dashboard.
14. Reporting filters.
15. Seed/demo data and a polished end-to-end demo.

------------------------------------------------------------------------

# Phase 1 --- Foundation + Core Data Model

## Target: Hour 0--1

### Goal

Create the shared foundation that every later feature depends on.

### Must Build

#### 1. Project setup

-   React frontend
-   Node.js + Express backend
-   PostgreSQL database
-   Drizzle ORM
-   Environment configuration
-   API error-handling middleware
-   Basic request validation
-   CORS
-   Consistent API response/error format

Suggested structure:

``` text
/client
  /src
    /components
    /pages
    /layouts
    /hooks
    /lib
    /api

/server
  /src
    /routes
    /controllers
    /services
    /middleware
    /db
    /utils

/shared
```

#### 2. Core database schema

Create only the tables needed for the business flow.

### Identity

-   `users`
    -   id
    -   name
    -   email
    -   password_hash
    -   role
    -   created_at

Roles:

-   `ADMIN`
-   `SALES_REP`
-   `SALES_MANAGER`
-   `FINANCE`
-   `OPERATIONS`
-   `CUSTOMER`

### Sales

-   `customers`
-   `quotations`
-   `quotation_items`
-   `orders`
-   `order_items`

### Product

-   `products`
-   `product_categories`
-   `price_lists`
-   `price_list_items`

### Governance

-   `discount_tiers`
-   `approval_rules`
-   `approval_requests`
-   `approval_actions`
-   `audit_logs`

### Inventory

-   `warehouses`
-   `warehouse_stock`
-   `fulfillment_allocations`
-   `backorders`

### Subscription/Billing

-   `subscription_plans`
-   `billing_schedules`
-   `payments`
-   `invoices`
-   `credit_notes`

### Intelligence

-   `upsell_rules`
-   `deal_alerts`

### Negotiation

-   `portal_tokens` or customer authentication records
-   `negotiation_requests`
-   `negotiation_comments`

Do NOT over-normalize the schema during the hackathon. Keep
relationships clear and implementation-friendly.

------------------------------------------------------------------------

## 3. Authentication

### Must

-   Login
-   Signup
-   Password hashing
-   JWT/session authentication
-   Protected internal routes
-   Role-based authorization middleware

### Bonus

-   Demo account selector on login:

``` text
Sales Rep
Manager
Finance
Operations
Admin
Customer
```

This makes the five-minute demo much faster.

------------------------------------------------------------------------

## 4. Seed Data

Seed realistic data immediately.

Minimum:

-   1 admin
-   1 sales rep
-   1 manager
-   1 finance user
-   1 operations user
-   2--3 customers
-   8--12 products
-   Hardware category
-   Service category
-   Subscription category
-   Bronze/Silver/Gold tiers
-   2 warehouses
-   Stock distributed across warehouses
-   Monthly subscription plan
-   Quarterly subscription plan
-   Upsell relationships

### Bonus

Create one intentionally useful demo scenario:

``` text
Gold Customer
+
Laptop
+
Setup Service
+
Cloud Subscription
+
Service discount > allowed threshold
+
Laptop stock split across two warehouses
```

This single scenario can demonstrate most of the PS.

------------------------------------------------------------------------

# Phase 2 --- Backend Configuration + Admin Control Plane

## Target: Hour 1--2

### Goal

Make business rules configurable rather than hardcoded.

This is critical because the PS explicitly expects discount governance,
warehouse rules, subscription rules, products, price lists, and backend
setup.

------------------------------------------------------------------------

## 2.1 Product Management

### Must

-   Create product
-   Edit product
-   Category
-   Unit
-   Base price
-   Tax
-   Description
-   Product type:
    -   One-time
    -   Subscription
    -   Service
-   Active/inactive

### Variants

If time permits:

-   Attribute
-   Values
-   Extra price

### MVP shortcut

Implement variants as a simple JSON field or child table rather than
building a sophisticated product-variant UI.

------------------------------------------------------------------------

## 2.2 Customer Management

### Must

-   Customer name
-   Email
-   Customer tier
-   Sales rep
-   Basic contact information

Tiers:

``` text
Bronze
Silver
Gold
```

------------------------------------------------------------------------

## 2.3 Price Lists

### Must

Support:

-   Customer-tier pricing
-   Currency field
-   Product-specific price

Example:

``` text
Gold → Laptop → ₹80,000
Silver → Laptop → ₹82,000
Bronze → Laptop → ₹85,000
```

### Bonus

Show:

``` text
Base Price
Customer Price
Discount
Final Price
```

inside quotation builder.

------------------------------------------------------------------------

## 2.4 Discount Governance

This is one of the **highest-priority PS features**.

### Must

Configure:

``` text
Customer Tier Maximum Discount

Bronze → 5%
Silver → 10%
Gold   → 15%
```

Also configure category ceilings:

``` text
Hardware → 15%
Services → 10%
Subscriptions → 12%
```

### Approval chain

Example:

``` text
0–10%     → No approval
10–20%    → Sales Manager
>20%      → Sales Manager → Finance
```

Do not hardcode these values in the quotation screen.

Store them in PostgreSQL and evaluate them in a backend service.

------------------------------------------------------------------------

## 2.5 Approval Engine

Create a reusable service:

``` text
evaluateQuoteRisk(quotationId)
```

It should return:

``` text
line violations
customer-tier violation
category violation
blended risk score
required approval level
approval chain
```

### Minimum logic

For every quotation line:

``` text
allowedDiscount =
MIN(customerTierLimit, categoryLimit)
```

Then:

``` text
discountOverage =
actualDiscount - allowedDiscount
```

A line exceeding its limit must trigger approval.

### Blended risk

Implement a simple transparent score:

``` text
line risk = max(0, actualDiscount - allowedDiscount)

blended risk =
weighted average of line risks
+
aggregate discount pressure
```

The exact formula can be simple, but it must be **calculated**, not
fake.

### Approval routing

``` text
No violation
    ↓
Direct fulfillment

Manager-level risk
    ↓
Sales Manager
    ↓
Approved

High-risk quote
    ↓
Sales Manager
    ↓
Finance
    ↓
Approved
```

### Audit log

Every:

-   approval
-   rejection
-   return
-   edit
-   discount change

must create an audit record containing:

``` text
user
action
timestamp
reason
quotation
old value
new value
```

### Bonus

Display a visual explanation:

``` text
Why approval is required?

Service discount: 18%
Allowed: 10%
Overage: +8%

Customer tier: Gold
Category ceiling: Service

Risk: HIGH
Required: Manager → Finance
```

This is excellent for judging because the business logic becomes
immediately visible.

------------------------------------------------------------------------

# Phase 3 --- Sales Workspace + Quotation Engine

## Target: Hour 2--3.5

### Goal

Build the main user experience and the heart of the product.

------------------------------------------------------------------------

## 3.1 Sales Workspace

### Must

Top navigation:

``` text
Dashboard
Quotations
Pipeline
Customers
```

Admin/configuration can be separate.

Quotation list should show:

-   Quote number
-   Customer
-   Amount
-   Status
-   Approval status
-   Created date
-   Assigned rep

Statuses:

``` text
DRAFT
PENDING_APPROVAL
APPROVED
REJECTED
SENT
UNDER_NEGOTIATION
CONFIRMED
FULFILLING
COMPLETED
```

------------------------------------------------------------------------

## 3.2 Quotation Builder

### Must

-   Select customer
-   Select product
-   Quantity +/-
-   Price
-   Discount
-   Tax
-   Line total
-   Order subtotal
-   Total discount
-   Tax
-   Grand total

Support:

``` text
Hardware
Service
Subscription
```

in the same quote.

------------------------------------------------------------------------

## 3.3 Live Margin Calculation

For every quote:

``` text
Revenue
- Estimated Cost
= Margin

Margin %
```

Update immediately when:

-   quantity changes
-   discount changes
-   upsell item is added

### Bonus

Add a small margin health indicator:

``` text
Healthy
Watch
Low Margin
```

Avoid fake AI language; show the actual calculation.

------------------------------------------------------------------------

## 3.4 Automatic Approval Trigger

When the rep clicks:

``` text
Submit Quote
```

backend should:

1.  Validate quote.
2.  Calculate discounts.
3.  Calculate margin.
4.  Calculate risk.
5.  Determine approval chain.
6.  Create approval request if required.
7.  Change quote status.

Example:

``` text
Submit
  ↓
Risk Engine
  ↓
No approval? ─── Yes → APPROVED
  |
  No
  ↓
PENDING_APPROVAL
```

This must happen automatically.

------------------------------------------------------------------------

## 3.5 Pipeline

### Must

Kanban columns:

``` text
Draft
Pending Approval
Approved
Under Negotiation
Confirmed
Fulfillment
Completed
```

### Bonus

Add amount totals per column.

------------------------------------------------------------------------

# Phase 4 --- Upsell/Cross-Sell + Approval UI

## Target: Hour 3.5--4.5

### Goal

Add the "intelligence" layer and make approval decisions explainable.

------------------------------------------------------------------------

## 4.1 Upsell/Cross-Sell Engine

### Must

Show recommendations beside the cart.

Example:

``` text
You are adding:
Laptop

Recommended:
✓ Laptop Bag
✓ Extended Warranty
✓ Setup Service
```

Each suggestion displays:

-   Product
-   Reason
-   Margin delta
-   Promotion tag
-   Add button
-   Dismiss button

### Recommendation logic

Keep it deterministic and fast.

Use:

``` text
upsell_rules
```

Example:

``` text
Laptop → Laptop Bag
Laptop → Warranty
Laptop → Setup Service
Subscription → Support Plan
```

Ranking:

``` text
promoted products
+
co-purchase score
+
margin eligibility
```

Only show products above configured minimum margin.

### Bonus

Show:

``` text
Why this recommendation?

82% of similar laptop quotes include this item.
+₹4,000 estimated margin.
```

If there is no real historical dataset, use seeded co-purchase counts
and label the source honestly as historical purchase data.

------------------------------------------------------------------------

## 4.2 Approval Dashboard

### Must

Manager sees:

-   Quote
-   Customer
-   Total
-   Discount
-   Risk score
-   Violated lines
-   Required approval step

Actions:

``` text
Approve
Reject
Return for Revision
```

Rejection/return requires reason.

### Bonus

Add "approval impact":

``` text
Current margin: 14.2%
After requested discount: 8.7%

Margin impact: -5.5%
```

This makes the approval workflow much stronger than a basic
approve/reject CRUD screen.

------------------------------------------------------------------------

# Phase 5 --- Fulfillment + Multi-Warehouse Allocation

## Target: Hour 4.5--5.5

### Goal

Prove that the platform reacts to real inventory constraints.

------------------------------------------------------------------------

## 5.1 Warehouse Setup

### Must

Each warehouse has:

-   Name
-   Location
-   Stock
-   Shipping cost/weight

Example:

``` text
Main Warehouse
Laptop: 3

East Depot
Laptop: 5
```

------------------------------------------------------------------------

## 5.2 Auto Allocation Engine

Create:

``` text
allocateOrder(orderId)
```

Inputs:

-   requested quantity
-   warehouse stock
-   shipping cost
-   shipment count

Output:

``` text
Warehouse A → 3
Warehouse B → 2
```

### Optimization goal

Prefer:

1.  Enough stock
2.  Fewer shipments
3.  Lower shipping cost

Simple scoring is enough:

``` text
allocation score =
shipping cost
+
shipment penalty
+
stock penalty
```

Do not build a mathematically complex optimizer in the eight-hour MVP.

------------------------------------------------------------------------

## 5.3 Fulfillment UI

Display:

  Warehouse          Quantity   Shipping Cost
  ---------------- ---------- ---------------
  Main Warehouse            3            ₹500
  East Depot                2            ₹300

Show:

``` text
Estimated shipments: 2
Estimated shipping: ₹800
```

Actions:

``` text
Accept Suggested Split
Manual Override
```

------------------------------------------------------------------------

## 5.4 Backorders

If stock is insufficient:

``` text
Requested: 10
Available: 7
Fulfilled: 7
Backorder: 3
```

Create a backorder record.

### Bonus

When stock increases:

``` text
New stock detected

3 units available.

[Consolidate Remaining Backorder]
```

This directly demonstrates the PS requirement.

------------------------------------------------------------------------

# Phase 6 --- Hybrid Billing + Subscription Logic

## Target: Hour 5.5--6.25

### Goal

Demonstrate one order containing both one-time and recurring revenue.

------------------------------------------------------------------------

## 6.1 Hybrid Order

Example:

``` text
Laptop                  ₹80,000   One-time
Setup Service            ₹5,000   One-time
Cloud Subscription       ₹2,000   Monthly
```

The system should keep all lines in one order but distinguish billing
behavior.

------------------------------------------------------------------------

## 6.2 Billing Schedule

For subscription lines store:

-   plan
-   start date
-   end date
-   frequency
-   quantity
-   recurring amount
-   next billing date

Display:

``` text
Today
├── One-time invoice: ₹85,000
│
└── Recurring:
    ₹2,000 / month
    Next billing: Oct 5
```

------------------------------------------------------------------------

## 6.3 Proration

Implement a simple day-based formula:

``` text
prorated amount =
plan price × active days / days in billing cycle
```

Example:

``` text
Monthly plan = ₹3,000
Used = 10 / 30 days

Prorated amount = ₹1,000
```

Support at least one mid-cycle quantity/plan change.

------------------------------------------------------------------------

## 6.4 Cancellation / Credit Note

### MVP

On cancellation:

``` text
remaining period
→ calculate unused amount
→ create credit note
```

### Bonus

Show the calculation explicitly:

``` text
Unused subscription value: ₹1,200
Credit note generated: ₹1,200
```

This is much easier to defend during judging.

------------------------------------------------------------------------

# Phase 7 --- Customer Portal + Negotiation

## Target: Hour 6.25--7

### Goal

Implement one of the most differentiating PS requirements: a **real
separate restricted customer-facing view**.

------------------------------------------------------------------------

## 7.1 Separate Portal

Do NOT simply reuse the internal dashboard and hide buttons.

Create a separate route/layout:

``` text
/customer-portal/:quoteToken
```

or customer authentication.

Customer can see:

-   company
-   quote
-   products
-   quantities
-   prices
-   discounts
-   totals
-   status

Customer cannot see:

-   internal risk calculations
-   internal margin
-   approval configuration
-   internal notes
-   other customers
-   admin screens

------------------------------------------------------------------------

## 7.2 Negotiation

For each line:

``` text
Comment
Request Change
```

Customer can:

-   ask a question
-   request line change
-   counter discount
-   submit negotiation request

Example:

``` text
Customer counter offer:

Laptop discount
Current: 10%
Requested: 15%

Reason:
"Can you improve pricing for bulk purchase?"
```

------------------------------------------------------------------------

## 7.3 Automatic Re-Approval

This is mandatory.

If customer negotiation changes terms:

``` text
Customer changes discount
        ↓
Risk Engine runs again
        ↓
Within limits?
   /           \
 Yes            No
 ↓               ↓
Continue       Approval
                 ↓
            Manager/Finance
```

Do NOT manually create the approval request from the UI.

------------------------------------------------------------------------

## 7.4 Customer Confirmation

Button:

``` text
Confirm Quotation
```

After confirmation:

``` text
Approved terms
     ↓
Order
     ↓
Fulfillment + Billing
```

### Bonus

Add a negotiation timeline:

``` text
Quote sent
↓
Customer requested 15%
↓
Sales rep responded
↓
Manager approved
↓
Customer confirmed
```

This gives the portal a real collaboration feel.

------------------------------------------------------------------------

# Phase 8 --- Deal Health + Anomaly Dashboard + Reporting

## Target: Hour 7--7.5

### Goal

Create the management layer that makes DealFlow360 feel like an
operations platform rather than an order-entry system.

------------------------------------------------------------------------

## 8.1 Deal Health

Dashboard cards:

``` text
Active Deals
Pending Approvals
Stalled Deals
At-Risk Deals
Low Margin Deals
Backorders
```

------------------------------------------------------------------------

## 8.2 Stalled Deals

Configurable threshold:

``` text
Quote inactive > N days
```

Show:

``` text
Acme Corp
₹1,20,000
Inactive for 6 days
```

Action:

``` text
View Deal
Nudge Rep
Escalate
```

------------------------------------------------------------------------

## 8.3 Discount Anomaly

Compare current discount with rep's historical average.

Simple rule:

``` text
current discount > historical average + threshold
```

Example:

``` text
Rep average: 7%
Current: 18%

⚠ Discount anomaly
```

### Bonus

Explain:

``` text
This quote is 11 percentage points above
the rep's historical average.
```

------------------------------------------------------------------------

## 8.4 Delivery Promise Slippage

If promised date is before the estimated fulfillment date:

``` text
⚠ Delivery Promise At Risk
```

Clicking the alert opens the quotation/order.

------------------------------------------------------------------------

## 8.5 Automated Nudge

Implement a simple action:

``` text
Nudge Sales Rep
```

which creates a notification/audit event.

### Bonus

Use a background job later if time permits. Do NOT sacrifice core
workflow for queues/cron.

------------------------------------------------------------------------

## 8.6 Reporting

Filters:

``` text
Period
Sales Rep / Team
Approval Status
Product / Category
```

Metrics:

-   quotation count
-   order value
-   approval count
-   rejected quotes
-   discount average
-   top products
-   sales by rep

### Export

If feasible:

-   CSV first
-   XLS/PDF only after core workflow is stable

The PS requests PDF/XLS export, but **do not sacrifice the business flow
to build a complex exporter**.

------------------------------------------------------------------------

# Phase 9 --- Hardening + Demo Polish

## Target: Hour 7.5--8

### Goal

Stop adding risky features. Make the existing system reliable and
impressive.

------------------------------------------------------------------------

## 9.1 Critical Validation

Run the complete PS quick test:

### Test 1 --- Login

``` text
Rep logs in
```

### Test 2 --- Configuration

``` text
Discount tier
Warehouse
Subscription plan
```

### Test 3 --- Quote

``` text
Create quote
Add product
Apply excessive discount
```

Expected:

``` text
Automatically → Manager approval
```

### Test 4 --- Upsell

``` text
Accept recommendation
```

Expected:

``` text
Quote total updates
Margin updates
```

### Test 5 --- Approval

``` text
Manager approves
```

Expected:

``` text
Audit trail created
```

### Test 6 --- Warehouse

``` text
Stock insufficient in one warehouse
```

Expected:

``` text
Automatic split across warehouses
```

### Test 7 --- Hybrid Billing

``` text
One-time product
+
Recurring subscription
```

Expected:

``` text
One-time invoice
+
Recurring billing schedule
```

### Test 8 --- Negotiation

Customer:

``` text
Requests higher discount
```

Expected:

``` text
Risk engine
→ approval
```

### Test 9 --- Confirmation

Customer confirms.

Expected:

``` text
Order confirmed
→ fulfillment
→ billing/payment state
```

### Test 10 --- Dashboard

Expected:

``` text
Stalled/risk/anomaly data visible
```

------------------------------------------------------------------------

# Feature Priority Matrix

## P0 --- MUST WORK

These are the features to protect at all costs.

  Feature                         Priority
  ------------------------------- ----------
  Authentication                  P0
  Roles/RBAC                      P0
  Customers                       P0
  Products                        P0
  Customer tiers                  P0
  Discount ceilings               P0
  Category discount ceilings      P0
  Automatic approval routing      P0
  Manager approval                P0
  Finance approval                P0
  Audit trail                     P0
  Quotation builder               P0
  Live totals                     P0
  Live margin                     P0
  Upsell/cross-sell               P0
  Warehouse stock                 P0
  Automatic warehouse split       P0
  Manual warehouse override       P0
  Backorder                       P0
  One-time + recurring order      P0
  Billing schedule                P0
  Basic proration                 P0
  Customer portal                 P0
  Customer negotiation            P0
  Re-approval after negotiation   P0
  Order confirmation              P0
  Deal health                     P0
  Discount anomaly                P0
  Reporting filters               P0
  Seed/demo data                  P0

------------------------------------------------------------------------

# P1 --- HIGH-VALUE DIFFERENTIATORS

Build these after the P0 workflow works.

  Feature                          Why
  -------------------------------- ------------------------------------
  Explainable risk score           Makes business logic visible
  Margin impact per change         Strong judging/demo effect
  Recommendation reason            Makes upsell feel intelligent
  Historical co-purchase ranking   Better than static recommendations
  Negotiation timeline             Shows real collaboration
  Backorder consolidation          Directly matches PS
  Delivery slippage alerts         Completes deal-health story
  Automated nudges                 Shows self-governing behavior
  CSV/XLS export                   Better reporting
  Product variants                 Completeness
  Promotion ranking                Better recommendations

------------------------------------------------------------------------

# P2 --- BONUS / ONLY IF EVERYTHING IS STABLE

Do NOT build these before the core flow.

-   Multi-currency
-   Multi-company
-   Advanced analytics
-   Fancy charts
-   Complex recommendation ML
-   Real payment gateway
-   Email/SMS integration
-   WebSockets everywhere
-   Background job infrastructure
-   Advanced PDF generator
-   Sophisticated optimization algorithms
-   AI chatbot

The PS explicitly treats multi-currency/multi-company as bonus. They
should never take priority over approval, fulfillment, billing, and
negotiation.

------------------------------------------------------------------------

# Recommended Backend Service Boundaries

Keep business logic out of React components and thin controllers.

``` text
authService
customerService
productService
quotationService
pricingService
discountRiskService
approvalService
recommendationService
inventoryService
fulfillmentService
subscriptionService
billingService
negotiationService
dealHealthService
reportingService
auditService
```

The most important reusable services are:

``` text
discountRiskService
approvalService
fulfillmentService
billingService
negotiationService
```

These are the actual "brain" of DealFlow360.

------------------------------------------------------------------------

# Core Business Rules

## Discount

``` text
allowedDiscount =
MIN(customerTierLimit, categoryLimit)
```

If:

``` text
actualDiscount > allowedDiscount
```

then the line is a violation.

------------------------------------------------------------------------

## Approval

``` text
No violation
→ no approval

Moderate risk
→ Sales Manager

High risk
→ Sales Manager → Finance
```

The exact thresholds must come from configuration.

------------------------------------------------------------------------

## Blended Risk

Every line contributes to the quotation's overall risk.

Conceptually:

``` text
Quote Risk =
Σ weighted line overages
+
aggregate discount pressure
```

Therefore:

> A quote cannot avoid approval simply because every individual
> violation is small.

------------------------------------------------------------------------

## Upsell

``` text
eligible product
AND
minimum margin satisfied
AND
relationship exists
```

Then rank by:

``` text
co-purchase score
+
promotion boost
+
margin score
```

------------------------------------------------------------------------

## Warehouse Allocation

Prefer:

``` text
fewer shipments
+
lower shipping cost
+
available stock
```

If stock is insufficient:

``` text
partial fulfillment
+
backorder
```

------------------------------------------------------------------------

## Subscription Proration

``` text
prorated amount =
full cycle price × active days / cycle days
```

------------------------------------------------------------------------

## Negotiation

Any customer change affecting commercial terms must trigger:

``` text
risk evaluation
```

not merely update the quote.

------------------------------------------------------------------------

# Database Relationship Overview

``` text
User
 ├── Sales Rep
 ├── Manager
 ├── Finance
 ├── Operations
 └── Admin

Customer
 └── Quotations
       └── Quotation Items
             └── Products

Quotation
 ├── Approval Requests
 │     └── Approval Actions
 │
 ├── Negotiation Requests
 │
 └── Order
       ├── Order Items
       ├── Fulfillment Allocations
       │     └── Warehouse Stock
       │
       ├── Invoice
       │
       ├── Payment
       │
       └── Billing Schedules
              └── Subscription Plan

Product
 ├── Category
 ├── Price List Items
 └── Upsell Rules

Everything
 └── Audit Logs
```

------------------------------------------------------------------------

# API Priority

Build APIs in this order.

## Authentication

``` text
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
```

## Configuration

``` text
GET/POST /api/products
GET/POST /api/customers
GET/POST /api/categories
GET/POST /api/price-lists
GET/POST /api/discount-rules
GET/POST /api/approval-rules
GET/POST /api/warehouses
GET/POST /api/subscription-plans
```

## Quotations

``` text
GET  /api/quotations
POST /api/quotations
GET  /api/quotations/:id
PUT  /api/quotations/:id
POST /api/quotations/:id/submit
```

## Risk / Approval

``` text
GET  /api/quotations/:id/risk
GET  /api/approvals
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
POST /api/approvals/:id/return
```

## Recommendations

``` text
GET  /api/quotations/:id/recommendations
POST /api/quotations/:id/recommendations/:productId/add
```

## Fulfillment

``` text
GET  /api/orders/:id/allocation
POST /api/orders/:id/allocate
PUT  /api/orders/:id/allocation
POST /api/orders/:id/backorder/consolidate
```

## Billing

``` text
GET  /api/orders/:id/billing
GET  /api/orders/:id/schedule
POST /api/subscriptions/:id/change
POST /api/subscriptions/:id/cancel
```

## Customer Portal

``` text
GET  /api/portal/quotes/:token
POST /api/portal/quotes/:token/negotiate
POST /api/portal/quotes/:token/comment
POST /api/portal/quotes/:token/confirm
```

## Dashboard

``` text
GET /api/dashboard/health
GET /api/dashboard/anomalies
GET /api/reports
```

------------------------------------------------------------------------

# Frontend Route Priority

``` text
/login

/app
/app/dashboard

/app/quotations
/app/quotations/new
/app/quotations/:id

/app/approvals
/app/pipeline

/app/fulfillment/:orderId
/app/billing/:orderId

/app/customers
/app/products

/admin
/admin/products
/admin/pricing
/admin/discounts
/admin/warehouses
/admin/subscriptions

/portal/:token
```

------------------------------------------------------------------------

# UX Strategy for the 8-Hour MVP

Do not build 30 disconnected pages.

Build a small number of strong screens.

## Screen 1 --- Login

Fast role-based demo access.

## Screen 2 --- Sales Dashboard

Show:

-   active deals
-   approvals
-   stalled deals
-   anomalies

## Screen 3 --- Quotation Builder

This is the **hero screen**.

It should contain:

``` text
Customer
↓
Products / Cart
↓
Discount
↓
Margin
↓
Risk
↓
Upsell panel
↓
Submit
```

## Screen 4 --- Approval Center

Show:

``` text
Risk
Violations
Margin impact
Approval chain
Audit trail
```

## Screen 5 --- Fulfillment

Show:

``` text
Stock
Recommended split
Shipment count
Cost
Backorder
```

## Screen 6 --- Billing

Show:

``` text
One-time
Recurring
Schedule
Proration
Credit
```

## Screen 7 --- Customer Portal

Show:

``` text
Quote
Comments
Counter-offer
Confirm
```

## Screen 8 --- Admin

Use simple tables/forms for configuration.

------------------------------------------------------------------------

# The Two Demo Flows to Optimize For

The PS requires a five-minute live demo covering at least two complete
end-to-end flows.

## Demo Flow A --- Discount → Approval → Fulfillment → Billing

``` text
Login as Sales Rep
        ↓
Create Gold customer quote
        ↓
Add Laptop
        ↓
Add Setup Service
        ↓
Apply 18% service discount
        ↓
Risk Engine
        ↓
Service limit = 10%
        ↓
Quote automatically requires approval
        ↓
Manager logs in
        ↓
Sees +8% service overage
        ↓
Approves
        ↓
Warehouse allocation
        ↓
Laptop split across warehouses
        ↓
Confirm order
        ↓
One-time invoice
+
Monthly subscription schedule
```

This single flow proves:

-   quotation
-   pricing
-   discount governance
-   risk
-   approval
-   audit
-   fulfillment
-   multi-warehouse
-   billing

------------------------------------------------------------------------

# Demo Flow B --- Customer Negotiation → Re-Approval

``` text
Open customer portal
        ↓
Customer views quote
        ↓
Requests 15% discount
        ↓
Quote terms change
        ↓
Risk Engine runs again
        ↓
Approval required
        ↓
Manager/Finance approval
        ↓
Customer sees updated terms
        ↓
Confirm quotation
        ↓
Order proceeds
```

This proves:

-   separate customer portal
-   negotiation
-   line-level interaction
-   commercial governance
-   automatic re-approval
-   order confirmation

------------------------------------------------------------------------

# What Makes DealFlow360 Stand Out

Do NOT try to win by having the most screens.

Win by making the **business engine visible**.

## 1. Explainable decisions

Whenever the system makes a decision, show why.

``` text
WHY APPROVAL?

Customer: Gold
Allowed: 15%

Service category limit: 10%
Requested: 18%

Overage: +8%
Risk: HIGH

Required:
Manager → Finance
```

------------------------------------------------------------------------

## 2. Live commercial impact

Whenever something changes:

``` text
Discount
↓
Margin
↓
Risk
↓
Approval
```

Show these updates immediately.

------------------------------------------------------------------------

## 3. Closed-loop negotiation

Most simple sales systems:

``` text
Quote → Customer → Email → Sales Rep
```

DealFlow360:

``` text
Quote
 ↓
Customer counter-offer
 ↓
Risk engine
 ↓
Approval
 ↓
Updated quote
 ↓
Customer confirmation
```

This is one of the strongest product stories.

------------------------------------------------------------------------

## 4. Operational awareness

Don't stop at order confirmation.

Show:

``` text
Can we actually fulfill it?
From where?
At what shipment cost?
What is backordered?
When will it bill?
```

------------------------------------------------------------------------

## 5. Auditability

Every sensitive commercial action should leave evidence.

``` text
Who?
What?
When?
Why?
Before?
After?
```

This makes the product feel production-oriented.

------------------------------------------------------------------------

# Architecture Diagram for Final Deliverable

Use this structure for the required one-page architecture diagram:

``` text
                         ┌──────────────────────┐
                         │      React UI        │
                         │ Sales / Admin /      │
                         │ Customer Portal      │
                         └──────────┬───────────┘
                                    │ REST API
                                    ↓
                         ┌──────────────────────┐
                         │   Express Backend    │
                         ├──────────────────────┤
                         │ Auth / RBAC           │
                         │ Quotation Engine      │
                         │ Pricing Engine        │
                         │ Risk Engine           │
                         │ Approval Engine       │
                         │ Recommendation Engine │
                         │ Fulfillment Engine    │
                         │ Billing Engine        │
                         │ Negotiation Engine    │
                         │ Deal Health Engine    │
                         └──────────┬───────────┘
                                    │ Drizzle ORM
                                    ↓
                         ┌──────────────────────┐
                         │     PostgreSQL       │
                         ├──────────────────────┤
                         │ Users                │
                         │ Customers            │
                         │ Products             │
                         │ Quotations           │
                         │ Approvals            │
                         │ Warehouses           │
                         │ Orders               │
                         │ Billing              │
                         │ Negotiations         │
                         │ Audit Logs           │
                         └──────────────────────┘
```

------------------------------------------------------------------------

# 8-Hour Execution Rules

## Rule 1 --- Backend before polish

A beautiful UI with fake business logic will lose to a simpler UI with
working workflow.

## Rule 2 --- One source of truth

Business calculations happen on the backend.

Do NOT trust frontend-calculated:

-   discounts
-   risk
-   approval
-   stock
-   billing amounts

Frontend can preview values, but backend is authoritative.

## Rule 3 --- Every important mutation is transactional

Where possible, use PostgreSQL transactions for:

``` text
quote submission
approval
order confirmation
inventory allocation
subscription change
customer negotiation
```

For example:

``` text
Approve quote
    ↓
Update approval
    ↓
Update quote
    ↓
Create audit log
```

These should succeed/fail together.

## Rule 4 --- Never hardcode business rules in UI

Bad:

``` js
if (discount > 15) {
  showManagerApproval();
}
```

Better:

``` text
Frontend
   ↓
POST /quotations/:id/submit
   ↓
Backend risk engine
   ↓
Database-configured rules
```

## Rule 5 --- Don't build infrastructure you don't need

For an eight-hour MVP:

``` text
PERN
+
Drizzle
+
PostgreSQL
+
REST
```

is enough.

Do not spend hours adding:

-   microservices
-   Kafka
-   Redis
-   Kubernetes
-   complex event buses

unless the core system is already stable.

------------------------------------------------------------------------

# Final 30-Minute Checklist

Before the demo, verify:

### Authentication

-   [ ] Sales Rep login works
-   [ ] Manager login works
-   [ ] Finance login works
-   [ ] Customer portal is restricted

### Quotation

-   [ ] Create quote
-   [ ] Add multiple products
-   [ ] Change quantity
-   [ ] Apply discount
-   [ ] Totals update
-   [ ] Margin updates

### Governance

-   [ ] Tier limits work
-   [ ] Category limits work
-   [ ] Risk score works
-   [ ] Approval routing works
-   [ ] Manager approval works
-   [ ] Finance approval works
-   [ ] Audit trail works

### Intelligence

-   [ ] Upsell appears
-   [ ] Margin delta appears
-   [ ] Add recommendation works

### Fulfillment

-   [ ] Warehouse stock works
-   [ ] Auto split works
-   [ ] Manual override works
-   [ ] Backorder works

### Billing

-   [ ] One-time line works
-   [ ] Recurring line works
-   [ ] Billing schedule works
-   [ ] Proration works

### Portal

-   [ ] Customer can open quote
-   [ ] Customer can comment
-   [ ] Customer can counter discount
-   [ ] Re-approval automatically triggers
-   [ ] Customer can confirm

### Management

-   [ ] Stalled deals
-   [ ] Discount anomalies
-   [ ] Delivery risk
-   [ ] Filters
-   [ ] Report data

### Demo

-   [ ] Seed data loaded
-   [ ] No broken routes
-   [ ] No console-breaking errors
-   [ ] Demo accounts ready
-   [ ] Two complete flows tested
-   [ ] Architecture diagram ready
-   [ ] "What we would build next" slide ready

------------------------------------------------------------------------

# If Time Runs Out

Use this emergency priority order:

``` text
1. Authentication
2. Product + Customer
3. Quotation
4. Discount rules
5. Approval engine
6. Audit log
7. Upsell
8. Warehouse allocation
9. Hybrid billing
10. Customer portal
11. Negotiation + re-approval
12. Deal health
13. Reporting
14. UI polish
15. Bonus features
```

If forced to choose between a feature and UI polish:

> **Choose the feature.**

If forced to choose between two bonus features:

> **Choose explainability and business-rule visibility.**

------------------------------------------------------------------------

# Definition of a Stable MVP

The MVP is considered stable when this statement is true:

> **A Sales Rep can create a quote, the backend can objectively
> determine whether it violates configured commercial rules, the correct
> approvers are automatically selected, the approved order can be
> fulfilled against real warehouse stock, one-time and recurring
> products can be billed together, and a customer can independently
> negotiate the quote and trigger re-approval when commercial terms
> change.**

Everything after that is iteration and differentiation.

------------------------------------------------------------------------

# Post-MVP Ideas / "What We Build Next"

Mention these in the final hackathon note:

1.  ML-based upsell recommendations from real historical order data.
2.  Predictive deal-win probability.
3.  More advanced anomaly detection.
4.  Automated email/WhatsApp customer notifications.
5.  Real payment gateway integration.
6.  Recurring payment collection.
7.  Advanced inventory forecasting and replenishment.
8.  Multi-currency and multi-company support.
9.  Background jobs for automated nudges and escalations.
10. Event-driven architecture for large-scale sales operations.
11. Advanced analytics and forecasting.
12. Customer-specific pricing optimization.

------------------------------------------------------------------------

## Final Product Philosophy

**DealFlow360 should behave like a deal operating system, not a
quotation form.**

The central loop is:

``` text
CONFIGURE
    ↓
QUOTE
    ↓
CALCULATE
    ↓
GOVERN
    ↓
APPROVE
    ↓
RECOMMEND
    ↓
FULFILL
    ↓
BILL
    ↓
NEGOTIATE
    ↓
RE-EVALUATE
    ↓
CONFIRM
    ↓
MONITOR
```

Every stage should react to the previous stage's data.

That connected workflow is the core differentiator.
