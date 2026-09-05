CREATE TYPE "public"."quotation_origin_type" AS ENUM('INTERNAL', 'CUSTOMER_SELF_SERVICE');--> statement-breakpoint
ALTER TYPE "public"."deal_alert_status" ADD VALUE 'ESCALATED' BEFORE 'RESOLVED';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "manager_id" uuid;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "origin_type" "quotation_origin_type" DEFAULT 'INTERNAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "created_by_customer_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_customer_user_id_customer_users_id_fk" FOREIGN KEY ("created_by_customer_user_id") REFERENCES "public"."customer_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_manager_id_idx" ON "users" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "quotations_origin_type_idx" ON "quotations" USING btree ("origin_type");