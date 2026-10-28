CREATE TABLE "access_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(255) NOT NULL,
	"organization" varchar(200),
	"message" text,
	"status" varchar(32) DEFAULT 'new',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" varchar(36),
	"actor_role" varchar(16),
	"action" varchar(64) NOT NULL,
	"resource_type" varchar(32),
	"resource_id" varchar(64),
	"patient_user_id" varchar(36),
	"ip" varchar(64),
	"user_agent" varchar(255),
	"meta" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"intake_session_id" integer NOT NULL,
	"patient_user_id" varchar(36) NOT NULL,
	"reason" varchar(24) NOT NULL,
	"due_at" timestamp NOT NULL,
	"status" varchar(16) DEFAULT 'scheduled',
	"sent_at" timestamp,
	"answered_at" timestamp,
	"outcome" varchar(16),
	"followup_intake_id" integer,
	"escalation_note" text,
	"acknowledged_by" varchar(36),
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clinician_online_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"went_online_at" timestamp NOT NULL,
	"went_offline_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "clinician_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"display_name" varchar(160),
	"credential" varchar(16),
	"state_licenses" jsonb,
	"max_acuity" varchar(16) DEFAULT 'urgent',
	"phone" varchar(32),
	"notify_sms" boolean DEFAULT true,
	"stripe_account_id" varchar(80),
	"payouts_enabled" boolean DEFAULT false,
	"online" boolean DEFAULT false,
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "clinician_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "patient_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_user_id" varchar(36) NOT NULL,
	"patient_user_id" varchar(36) NOT NULL,
	"assigned_by" varchar(36),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "patient_assignments_provider_user_id_patient_user_id_unique" UNIQUE("provider_user_id","patient_user_id")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"verified" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"intake_session_id" integer NOT NULL,
	"patient_user_id" varchar(36) NOT NULL,
	"acuity" varchar(16) NOT NULL,
	"patient_state" varchar(2) NOT NULL,
	"chief_complaint" text,
	"status" varchar(16) DEFAULT 'queued',
	"payment_status" varchar(16) DEFAULT 'none',
	"amount_cents" integer,
	"stripe_checkout_id" varchar(80),
	"stripe_payment_intent" varchar(80),
	"payout_cents" integer,
	"payout_status" varchar(16) DEFAULT 'none',
	"stripe_transfer_id" varchar(80),
	"clinician_user_id" varchar(36),
	"queued_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "visits_intake_session_id_unique" UNIQUE("intake_session_id")
);
--> statement-breakpoint
ALTER TABLE "intake_sessions" ADD COLUMN "ai_brief" jsonb;--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD COLUMN "state" varchar(2);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_intake_session_id_intake_sessions_id_fk" FOREIGN KEY ("intake_session_id") REFERENCES "public"."intake_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_patient_user_id_user_id_fk" FOREIGN KEY ("patient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_followup_intake_id_intake_sessions_id_fk" FOREIGN KEY ("followup_intake_id") REFERENCES "public"."intake_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_acknowledged_by_user_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinician_online_log" ADD CONSTRAINT "clinician_online_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinician_profiles" ADD CONSTRAINT "clinician_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_assignments" ADD CONSTRAINT "patient_assignments_provider_user_id_user_id_fk" FOREIGN KEY ("provider_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_assignments" ADD CONSTRAINT "patient_assignments_patient_user_id_user_id_fk" FOREIGN KEY ("patient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_assignments" ADD CONSTRAINT "patient_assignments_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_intake_session_id_intake_sessions_id_fk" FOREIGN KEY ("intake_session_id") REFERENCES "public"."intake_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_user_id_user_id_fk" FOREIGN KEY ("patient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_clinician_user_id_user_id_fk" FOREIGN KEY ("clinician_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_created_idx" ON "audit_events" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_events_patient_idx" ON "audit_events" USING btree ("patient_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "checkins_due_idx" ON "checkins" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "checkins_intake_idx" ON "checkins" USING btree ("intake_session_id");--> statement-breakpoint
CREATE INDEX "checkins_patient_idx" ON "checkins" USING btree ("patient_user_id","status");--> statement-breakpoint
CREATE INDEX "checkins_followup_idx" ON "checkins" USING btree ("followup_intake_id");--> statement-breakpoint
CREATE INDEX "checkins_acknowledged_by_idx" ON "checkins" USING btree ("acknowledged_by");--> statement-breakpoint
CREATE INDEX "clinician_online_log_user_idx" ON "clinician_online_log" USING btree ("user_id","went_offline_at");--> statement-breakpoint
CREATE INDEX "patient_assignments_provider_idx" ON "patient_assignments" USING btree ("provider_user_id");--> statement-breakpoint
CREATE INDEX "patient_assignments_patient_idx" ON "patient_assignments" USING btree ("patient_user_id");--> statement-breakpoint
CREATE INDEX "patient_assignments_assigned_by_idx" ON "patient_assignments" USING btree ("assigned_by");--> statement-breakpoint
CREATE INDEX "two_factor_user_idx" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "visits_queue_idx" ON "visits" USING btree ("status","patient_state","queued_at");--> statement-breakpoint
CREATE INDEX "visits_clinician_idx" ON "visits" USING btree ("clinician_user_id","status");--> statement-breakpoint
CREATE INDEX "visits_patient_idx" ON "visits" USING btree ("patient_user_id");--> statement-breakpoint
CREATE INDEX "visits_checkout_idx" ON "visits" USING btree ("stripe_checkout_id");--> statement-breakpoint
CREATE INDEX "visits_payout_idx" ON "visits" USING btree ("payout_status","clinician_user_id");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "intake_sessions_user_idx" ON "intake_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");