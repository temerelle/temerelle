CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"client_id" uuid,
	"client_name" text NOT NULL,
	"client_phone" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"service_name_snapshot" text NOT NULL,
	"price_minor_snapshot" integer NOT NULL,
	"currency_snapshot" char(3) NOT NULL,
	"duration_minutes_snapshot" integer NOT NULL,
	"cancellation_reason" text,
	"cancelled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_status_check" CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
	CONSTRAINT "bookings_cancelled_by_check" CHECK (cancelled_by IN ('client', 'owner')),
	CONSTRAINT "bookings_interval_check" CHECK ("bookings"."ends_at" > "bookings"."starts_at"),
	CONSTRAINT "bookings_duration_matches_check" CHECK ("bookings"."ends_at" - "bookings"."starts_at" = make_interval(mins => "bookings"."duration_minutes_snapshot")),
	CONSTRAINT "bookings_price_check" CHECK ("bookings"."price_minor_snapshot" >= 0),
	CONSTRAINT "bookings_cancelled_by_status_check" CHECK (("bookings"."status" = 'cancelled') = ("bookings"."cancelled_by" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"timezone" text DEFAULT 'Europe/Kyiv' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_code_format_check" CHECK ("businesses"."code" ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$')
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'other' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_business_id_id_key" UNIQUE("business_id","id"),
	CONSTRAINT "resources_type_check" CHECK (type IN ('person', 'bay', 'room', 'other'))
);
--> statement-breakpoint
CREATE TABLE "schedule_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"date" date NOT NULL,
	"is_day_off" boolean DEFAULT false NOT NULL,
	"start_time" time,
	"end_time" time,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_exceptions_shape_check" CHECK (("schedule_exceptions"."is_day_off" AND "schedule_exceptions"."start_time" IS NULL AND "schedule_exceptions"."end_time" IS NULL)
        OR (NOT "schedule_exceptions"."is_day_off" AND "schedule_exceptions"."start_time" IS NOT NULL AND "schedule_exceptions"."end_time" > "schedule_exceptions"."start_time"))
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" char(3) DEFAULT 'UAH' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_business_id_id_key" UNIQUE("business_id","id"),
	CONSTRAINT "services_duration_check" CHECK ("services"."duration_minutes" BETWEEN 1 AND 1440),
	CONSTRAINT "services_price_check" CHECK ("services"."price_minor" >= 0),
	CONSTRAINT "services_currency_check" CHECK ("services"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_lowercase_check" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
CREATE TABLE "working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	CONSTRAINT "working_hours_day_check" CHECK ("working_hours"."day_of_week" BETWEEN 1 AND 7),
	CONSTRAINT "working_hours_interval_check" CHECK ("working_hours"."end_time" > "working_hours"."start_time")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_resource_fk" FOREIGN KEY ("business_id","resource_id") REFERENCES "public"."resources"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_fk" FOREIGN KEY ("business_id","service_id") REFERENCES "public"."services"("business_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_resource_fk" FOREIGN KEY ("business_id","resource_id") REFERENCES "public"."resources"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_resource_fk" FOREIGN KEY ("business_id","resource_id") REFERENCES "public"."resources"("business_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_business_id_starts_at_idx" ON "bookings" USING btree ("business_id","starts_at");--> statement-breakpoint
CREATE INDEX "bookings_client_id_starts_at_idx" ON "bookings" USING btree ("client_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_code_key" ON "businesses" USING btree ("code");--> statement-breakpoint
CREATE INDEX "businesses_owner_id_idx" ON "businesses" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_one_default_per_business_key" ON "resources" USING btree ("business_id") WHERE "resources"."is_default";--> statement-breakpoint
CREATE INDEX "schedule_exceptions_resource_id_date_idx" ON "schedule_exceptions" USING btree ("resource_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_exceptions_one_day_off_key" ON "schedule_exceptions" USING btree ("resource_id","date") WHERE "schedule_exceptions"."is_day_off";--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "working_hours_resource_id_day_idx" ON "working_hours" USING btree ("resource_id","day_of_week");