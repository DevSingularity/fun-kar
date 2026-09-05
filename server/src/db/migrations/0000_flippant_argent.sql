CREATE TYPE "public"."approval_action_type" AS ENUM('APPROVED', 'REJECTED', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."approval_level" AS ENUM('NONE', 'MANAGER', 'MANAGER_FINANCE');--> statement-breakpoint
CREATE TYPE "public"."approval_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETURNED');--> statement-breakpoint
CREATE TYPE "public"."backorder_status" AS ENUM('OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."billing_frequency" AS ENUM('MONTHLY', 'QUARTERLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."billing_line_type" AS ENUM('ONE_TIME', 'RECURRING');--> statement-breakpoint
CREATE TYPE "public"."billing_schedule_status" AS ENUM('SCHEDULED', 'INVOICED', 'PAID', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."credit_note_status" AS ENUM('ISSUED', 'APPLIED', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."customer_tier" AS ENUM('BRONZE', 'SILVER', 'GOLD');--> statement-breakpoint
CREATE TYPE "public"."deal_alert_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."deal_alert_status" AS ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."deal_alert_type" AS ENUM('STALLED', 'DISCOUNT_ANOMALY', 'DELIVERY_SLIPPAGE', 'LOW_MARGIN');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('ONE_TIME', 'RECURRING');--> statement-breakpoint
CREATE TYPE "public"."negotiation_author_type" AS ENUM('CUSTOMER', 'INTERNAL');--> statement-breakpoint
CREATE TYPE "public"."negotiation_request_status" AS ENUM('OPEN', 'RESOLVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."negotiation_request_type" AS ENUM('COMMENT', 'CHANGE_REQUEST', 'COUNTER_DISCOUNT');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING_FULFILLMENT', 'PARTIALLY_FULFILLED', 'FULFILLED', 'BACKORDERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('ONE_TIME', 'SERVICE', 'SUBSCRIPTION');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SENT', 'UNDER_NEGOTIATION', 'CONFIRMED', 'FULFILLING', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."subscription_line_status" AS ENUM('ACTIVE', 'CANCELLED', 'PAUSED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS');--> statement-breakpoint
CREATE TABLE "customer_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_list_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"customer_tier" "customer_tier" NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_list_items_unit_price_nonneg" CHECK ("price_list_items"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"attribute_name" varchar(100) NOT NULL,
	"attribute_value" varchar(100) NOT NULL,
	"extra_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sku" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"sku" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"unit" varchar(30) DEFAULT 'unit' NOT NULL,
	"base_price" numeric(12, 2) NOT NULL,
	"estimated_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"product_type" "product_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_base_price_nonneg" CHECK ("products"."base_price" >= 0),
	CONSTRAINT "products_estimated_cost_nonneg" CHECK ("products"."estimated_cost" >= 0),
	CONSTRAINT "products_tax_rate_range" CHECK ("products"."tax_rate" >= 0 AND "products"."tax_rate" <= 100)
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30),
	"tier" "customer_tier" DEFAULT 'BRONZE' NOT NULL,
	"assigned_rep_id" uuid,
	"price_list_id" uuid,
	"billing_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upsell_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger_product_id" uuid NOT NULL,
	"recommended_product_id" uuid NOT NULL,
	"min_margin_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"co_purchase_score" numeric(6, 2) DEFAULT '0' NOT NULL,
	"is_promoted" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upsell_rules_not_self_referential" CHECK ("upsell_rules"."trigger_product_id" <> "upsell_rules"."recommended_product_id")
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"allowed_discount_pct" numeric(5, 2) NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"estimated_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_upsell" boolean DEFAULT false NOT NULL,
	"source_upsell_rule_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_items_quantity_positive" CHECK ("quotation_items"."quantity" > 0),
	CONSTRAINT "quotation_items_discount_pct_range" CHECK ("quotation_items"."discount_pct" >= 0 AND "quotation_items"."discount_pct" <= 100)
);
--> statement-breakpoint
CREATE TABLE "quotation_portal_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_number" varchar(30) NOT NULL,
	"customer_id" uuid NOT NULL,
	"sales_rep_id" uuid NOT NULL,
	"status" "quotation_status" DEFAULT 'DRAFT' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"estimated_margin_pct" numeric(5, 2),
	"blended_risk_score" numeric(6, 2),
	"required_approval_level" "approval_level" DEFAULT 'NONE' NOT NULL,
	"promised_delivery_date" date,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_request_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"level" "approval_level" NOT NULL,
	"action" "approval_action_type" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"blended_risk_score" numeric(6, 2) NOT NULL,
	"required_level" "approval_level" NOT NULL,
	"status" "approval_request_status" DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_overage_pct" numeric(5, 2) NOT NULL,
	"max_overage_pct" numeric(5, 2),
	"required_level" "approval_level" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_rules_min_overage_nonneg" CHECK ("approval_rules"."min_overage_pct" >= 0),
	CONSTRAINT "approval_rules_max_gt_min" CHECK ("approval_rules"."max_overage_pct" IS NULL OR "approval_rules"."max_overage_pct" > "approval_rules"."min_overage_pct")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(60) NOT NULL,
	"reason" text,
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category_discount_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"max_discount_pct" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_discount_limits_pct_range" CHECK ("category_discount_limits"."max_discount_pct" >= 0 AND "category_discount_limits"."max_discount_pct" <= 100)
);
--> statement-breakpoint
CREATE TABLE "customer_tier_discount_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" "customer_tier" NOT NULL,
	"max_discount_pct" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_tier_discount_limits_pct_range" CHECK ("customer_tier_discount_limits"."max_discount_pct" >= 0 AND "customer_tier_discount_limits"."max_discount_pct" <= 100)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"quotation_item_id" uuid,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"billing_line_type" "billing_line_type" DEFAULT 'ONE_TIME' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(30) NOT NULL,
	"quotation_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'PENDING_FULFILLMENT' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"promised_delivery_date" date,
	"estimated_delivery_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "backorders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity_requested" integer NOT NULL,
	"quantity_fulfilled" integer DEFAULT 0 NOT NULL,
	"quantity_backordered" integer NOT NULL,
	"status" "backorder_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "backorders_qty_nonneg" CHECK ("backorders"."quantity_fulfilled" >= 0 AND "backorders"."quantity_backordered" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fulfillment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"quantity_allocated" integer NOT NULL,
	"shipping_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_manual_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fulfillment_allocations_qty_positive" CHECK ("fulfillment_allocations"."quantity_allocated" > 0)
);
--> statement-breakpoint
CREATE TABLE "warehouse_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"reorder_threshold" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouse_stock_qty_nonneg" CHECK ("warehouse_stock"."quantity_on_hand" >= 0)
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"location" varchar(255),
	"shipping_cost_weight" numeric(8, 2) DEFAULT '1' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_line_id" uuid NOT NULL,
	"billing_period_start" date NOT NULL,
	"billing_period_end" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"is_prorated" boolean DEFAULT false NOT NULL,
	"status" "billing_schedule_status" DEFAULT 'SCHEDULED' NOT NULL,
	"invoice_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_schedules_period_valid" CHECK ("billing_schedules"."billing_period_end" >= "billing_schedules"."billing_period_start")
);
--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_line_id" uuid NOT NULL,
	"invoice_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"status" "credit_note_status" DEFAULT 'ISSUED' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_notes_amount_positive" CHECK ("credit_notes"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"order_item_id" uuid,
	"billing_schedule_id" uuid,
	"description" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(30) NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_type" "invoice_type" NOT NULL,
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"due_date" date,
	"issued_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_amount_paid_nonneg" CHECK ("invoices"."amount_paid" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"method" varchar(30) NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"transaction_reference" varchar(100),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "subscription_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"subscription_plan_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"recurring_amount" numeric(12, 2) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"next_billing_date" date NOT NULL,
	"status" "subscription_line_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	CONSTRAINT "subscription_lines_quantity_positive" CHECK ("subscription_lines"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"frequency" "billing_frequency" NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"proration_enabled" boolean DEFAULT true NOT NULL,
	"cancellation_notice_days" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_price_nonneg" CHECK ("subscription_plans"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "deal_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid,
	"order_id" uuid,
	"alert_type" "deal_alert_type" NOT NULL,
	"severity" "deal_alert_severity" DEFAULT 'MEDIUM' NOT NULL,
	"message" text NOT NULL,
	"status" "deal_alert_status" DEFAULT 'OPEN' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negotiation_request_id" uuid,
	"quotation_id" uuid NOT NULL,
	"quotation_item_id" uuid,
	"author_type" "negotiation_author_type" NOT NULL,
	"author_user_id" uuid,
	"author_customer_user_id" uuid,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"quotation_item_id" uuid,
	"customer_user_id" uuid NOT NULL,
	"request_type" "negotiation_request_type" NOT NULL,
	"message" text NOT NULL,
	"requested_discount_pct" numeric(5, 2),
	"status" "negotiation_request_status" DEFAULT 'OPEN' NOT NULL,
	"resolved_by" uuid,
	"resolution_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "customer_users" ADD CONSTRAINT "customer_users_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_tokens" ADD CONSTRAINT "portal_tokens_customer_user_id_customer_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."customer_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_rep_id_users_id_fk" FOREIGN KEY ("assigned_rep_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_rules" ADD CONSTRAINT "upsell_rules_trigger_product_id_products_id_fk" FOREIGN KEY ("trigger_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_rules" ADD CONSTRAINT "upsell_rules_recommended_product_id_products_id_fk" FOREIGN KEY ("recommended_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_source_upsell_rule_id_upsell_rules_id_fk" FOREIGN KEY ("source_upsell_rule_id") REFERENCES "public"."upsell_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_portal_tokens" ADD CONSTRAINT "quotation_portal_tokens_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_sales_rep_id_users_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_approval_request_id_approval_requests_id_fk" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_discount_limits" ADD CONSTRAINT "category_discount_limits_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backorders" ADD CONSTRAINT "backorders_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_allocations" ADD CONSTRAINT "fulfillment_allocations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_allocations" ADD CONSTRAINT "fulfillment_allocations_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_allocations" ADD CONSTRAINT "fulfillment_allocations_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock" ADD CONSTRAINT "warehouse_stock_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_schedules" ADD CONSTRAINT "billing_schedules_subscription_line_id_subscription_lines_id_fk" FOREIGN KEY ("subscription_line_id") REFERENCES "public"."subscription_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_schedules" ADD CONSTRAINT "billing_schedules_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_subscription_line_id_subscription_lines_id_fk" FOREIGN KEY ("subscription_line_id") REFERENCES "public"."subscription_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_billing_schedule_id_billing_schedules_id_fk" FOREIGN KEY ("billing_schedule_id") REFERENCES "public"."billing_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_lines" ADD CONSTRAINT "subscription_lines_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_lines" ADD CONSTRAINT "subscription_lines_subscription_plan_id_subscription_plans_id_fk" FOREIGN KEY ("subscription_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_alerts" ADD CONSTRAINT "deal_alerts_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_alerts" ADD CONSTRAINT "deal_alerts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_alerts" ADD CONSTRAINT "deal_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_comments" ADD CONSTRAINT "negotiation_comments_negotiation_request_id_negotiation_requests_id_fk" FOREIGN KEY ("negotiation_request_id") REFERENCES "public"."negotiation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_comments" ADD CONSTRAINT "negotiation_comments_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_comments" ADD CONSTRAINT "negotiation_comments_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_comments" ADD CONSTRAINT "negotiation_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_comments" ADD CONSTRAINT "negotiation_comments_author_customer_user_id_customer_users_id_fk" FOREIGN KEY ("author_customer_user_id") REFERENCES "public"."customer_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_requests" ADD CONSTRAINT "negotiation_requests_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_requests" ADD CONSTRAINT "negotiation_requests_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_requests" ADD CONSTRAINT "negotiation_requests_customer_user_id_customer_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."customer_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_requests" ADD CONSTRAINT "negotiation_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_users_email_lower_unique" ON "customer_users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "customer_users_customer_id_idx" ON "customer_users" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portal_tokens_token_hash_unique" ON "portal_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "portal_tokens_customer_user_id_idx" ON "portal_tokens" USING btree ("customer_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "price_list_items_list_product_tier_unique" ON "price_list_items" USING btree ("price_list_id","product_id","customer_tier");--> statement-breakpoint
CREATE INDEX "price_list_items_product_id_idx" ON "price_list_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_lists_name_unique" ON "price_lists" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_name_unique" ON "product_categories" USING btree ("name");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_product_attr_unique" ON "product_variants" USING btree ("product_id","attribute_name","attribute_value");--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_unique" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_is_active_idx" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "products_product_type_idx" ON "products" USING btree ("product_type");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_lower_unique" ON "customers" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "customers_assigned_rep_id_idx" ON "customers" USING btree ("assigned_rep_id");--> statement-breakpoint
CREATE INDEX "customers_tier_idx" ON "customers" USING btree ("tier");--> statement-breakpoint
CREATE UNIQUE INDEX "upsell_rules_trigger_recommended_unique" ON "upsell_rules" USING btree ("trigger_product_id","recommended_product_id");--> statement-breakpoint
CREATE INDEX "upsell_rules_trigger_product_id_idx" ON "upsell_rules" USING btree ("trigger_product_id");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_items_product_id_idx" ON "quotation_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_portal_tokens_token_hash_unique" ON "quotation_portal_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "quotation_portal_tokens_quotation_id_idx" ON "quotation_portal_tokens" USING btree ("quotation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_quote_number_unique" ON "quotations" USING btree ("quote_number");--> statement-breakpoint
CREATE INDEX "quotations_customer_id_idx" ON "quotations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "quotations_sales_rep_id_idx" ON "quotations" USING btree ("sales_rep_id");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotations_last_activity_at_idx" ON "quotations" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "approval_actions_approval_request_id_idx" ON "approval_actions" USING btree ("approval_request_id");--> statement-breakpoint
CREATE INDEX "approval_actions_actor_id_idx" ON "approval_actions" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "approval_requests_quotation_id_idx" ON "approval_requests" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "approval_requests_status_idx" ON "approval_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "approval_requests_one_pending_per_quotation" ON "approval_requests" USING btree ("quotation_id") WHERE "approval_requests"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "approval_rules_min_overage_idx" ON "approval_rules" USING btree ("min_overage_pct");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "category_discount_limits_category_unique" ON "category_discount_limits" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_tier_discount_limits_tier_unique" ON "customer_tier_discount_limits" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_items_quotation_item_id_idx" ON "order_items" USING btree ("quotation_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_number_unique" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_quotation_id_unique" ON "orders" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "orders_customer_id_idx" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "backorders_order_item_id_idx" ON "backorders" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "backorders_status_idx" ON "backorders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fulfillment_allocations_order_id_idx" ON "fulfillment_allocations" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "fulfillment_allocations_order_item_id_idx" ON "fulfillment_allocations" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "fulfillment_allocations_warehouse_id_idx" ON "fulfillment_allocations" USING btree ("warehouse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_stock_warehouse_product_unique" ON "warehouse_stock" USING btree ("warehouse_id","product_id");--> statement-breakpoint
CREATE INDEX "warehouse_stock_product_id_idx" ON "warehouse_stock" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_name_unique" ON "warehouses" USING btree ("name");--> statement-breakpoint
CREATE INDEX "billing_schedules_subscription_line_id_idx" ON "billing_schedules" USING btree ("subscription_line_id");--> statement-breakpoint
CREATE INDEX "billing_schedules_status_idx" ON "billing_schedules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_schedules_period_start_idx" ON "billing_schedules" USING btree ("billing_period_start");--> statement-breakpoint
CREATE INDEX "credit_notes_subscription_line_id_idx" ON "credit_notes" USING btree ("subscription_line_id");--> statement-breakpoint
CREATE INDEX "credit_notes_invoice_id_idx" ON "credit_notes" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_lines_invoice_id_idx" ON "invoice_lines" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_lines_order_item_id_idx" ON "invoice_lines" USING btree ("order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_invoice_number_unique" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_order_id_idx" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "invoices_customer_id_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_lines_order_item_id_unique" ON "subscription_lines" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "subscription_lines_plan_id_idx" ON "subscription_lines" USING btree ("subscription_plan_id");--> statement-breakpoint
CREATE INDEX "subscription_lines_status_idx" ON "subscription_lines" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscription_lines_next_billing_date_idx" ON "subscription_lines" USING btree ("next_billing_date");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_plans_name_unique" ON "subscription_plans" USING btree ("name");--> statement-breakpoint
CREATE INDEX "deal_alerts_quotation_id_idx" ON "deal_alerts" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "deal_alerts_order_id_idx" ON "deal_alerts" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "deal_alerts_status_idx" ON "deal_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deal_alerts_type_idx" ON "deal_alerts" USING btree ("alert_type");--> statement-breakpoint
CREATE INDEX "negotiation_comments_quotation_id_idx" ON "negotiation_comments" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "negotiation_comments_negotiation_request_id_idx" ON "negotiation_comments" USING btree ("negotiation_request_id");--> statement-breakpoint
CREATE INDEX "negotiation_requests_quotation_id_idx" ON "negotiation_requests" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "negotiation_requests_status_idx" ON "negotiation_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "negotiation_requests_customer_user_id_idx" ON "negotiation_requests" USING btree ("customer_user_id");