import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  serial,
  integer,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// ─── BetterAuth tables ───────────────────────────────────────────────────────

export const user = pgTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  image: text('image'),
  isAdmin: boolean('is_admin').default(false),
  role: varchar('role', { length: 32 }).default('patient'), // 'patient' | 'provider'
  twoFactorEnabled: boolean('two_factor_enabled').default(false), // better-auth twoFactor plugin
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const session = pgTable('session', {
  id: varchar('id', { length: 36 }).primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  lastActiveAt: timestamp('last_active_at'), // server-side idle logoff (src/server/lib/session.ts)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  index('session_user_idx').on(t.userId),
]);

export const account = pgTable('account', {
  id: varchar('id', { length: 36 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: varchar('password', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  index('account_user_idx').on(t.userId),
]);

export const verification = pgTable('verification', {
  id: varchar('id', { length: 36 }).primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const twoFactor = pgTable('two_factor', {
  id: varchar('id', { length: 36 }).primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  verified: boolean('verified').default(true),
}, (t) => [
  index('two_factor_user_idx').on(t.userId),
]);

// ─── Patient intake sessions ─────────────────────────────────────────────────

export const intakeSessions = pgTable('intake_sessions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 32 }).default('in_progress'), // 'in_progress' | 'complete'
  chiefComplaint: text('chief_complaint'),
  responses: jsonb('responses'), // full Q&A pairs
  aiSummary: text('ai_summary'),
  aiFlags: jsonb('ai_flags'), // array of flag strings
  aiBrief: jsonb('ai_brief'), // full structured ClinicalBrief (disposition, SOAP note, differential, workup)
  appointmentDate: timestamp('appointment_date'),
  providerName: varchar('provider_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (t) => [
  index('intake_sessions_user_idx').on(t.userId, t.createdAt),
]);

// ─── Provider early-access requests ──────────────────────────────────────────

export const accessRequests = pgTable('access_requests', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  organization: varchar('organization', { length: 200 }),
  message: text('message'),
  status: varchar('status', { length: 32 }).default('new'), // 'new' | 'contacted' | 'closed'
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Patient profile ─────────────────────────────────────────────────────────

export const patientProfiles = pgTable('patient_profiles', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  dateOfBirth: varchar('date_of_birth', { length: 16 }),
  gender: varchar('gender', { length: 32 }),
  phone: varchar('phone', { length: 32 }),
  state: varchar('state', { length: 2 }), // US state the patient is physically in — gates dispatch by licensure
  conditions: jsonb('conditions'), // string[]
  medications: jsonb('medications'), // string[]
  allergies: jsonb('allergies'), // string[]
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Dispatch: clinician supply ──────────────────────────────────────────────
// A clinician "goes online" like a driver. Dispatch only ever shows a visit to a
// clinician licensed in the patient's state whose scope covers the acuity.

export const clinicianProfiles = pgTable('clinician_profiles', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  displayName: varchar('display_name', { length: 160 }), // e.g. "Dr. Merrick"
  credential: varchar('credential', { length: 16 }), // MD | DO | NP | PA
  stateLicenses: jsonb('state_licenses'), // string[] of 2-letter states
  maxAcuity: varchar('max_acuity', { length: 16 }).default('urgent'), // highest acuity accepted: urgent | telehealth | routine
  phone: varchar('phone', { length: 32 }),
  notifySms: boolean('notify_sms').default(true), // text me when a visit lands in my states while I'm online
  stripeAccountId: varchar('stripe_account_id', { length: 80 }), // Stripe Connect Express account
  payoutsEnabled: boolean('payouts_enabled').default(false), // set by the account.updated webhook
  online: boolean('online').default(false),
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ─── Dispatch: visit requests (the "ride") ───────────────────────────────────
// Created when a patient asks to be connected after a non-emergency intake.
// Emergency dispositions never enter the queue — that path is 911, full stop.

export const visits = pgTable('visits', {
  id: serial('id').primaryKey(),
  intakeSessionId: integer('intake_session_id') // unique per intake — one request per brief
    .notNull()
    .unique()
    .references(() => intakeSessions.id, { onDelete: 'cascade' }),
  patientUserId: varchar('patient_user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  acuity: varchar('acuity', { length: 16 }).notNull(), // urgent | telehealth | routine | selfcare
  patientState: varchar('patient_state', { length: 2 }).notNull(),
  chiefComplaint: text('chief_complaint'),
  status: varchar('status', { length: 16 }).default('queued'), // pending_payment | queued | accepted | completed | cancelled
  // Payment (Stripe, env-gated). Card is authorized at request time, captured on accept, released on timeout/cancel.
  paymentStatus: varchar('payment_status', { length: 16 }).default('none'), // none | pending | authorized | captured | released | failed
  amountCents: integer('amount_cents'),
  stripeCheckoutId: varchar('stripe_checkout_id', { length: 80 }),
  stripePaymentIntent: varchar('stripe_payment_intent', { length: 80 }),
  // Clinician payout for this visit (set on complete when a payout rate is configured)
  payoutCents: integer('payout_cents'),
  payoutStatus: varchar('payout_status', { length: 16 }).default('none'), // none | owed | transferred | failed
  stripeTransferId: varchar('stripe_transfer_id', { length: 80 }),
  clinicianUserId: varchar('clinician_user_id', { length: 36 }).references(() => user.id, {
    onDelete: 'set null',
  }),
  queuedAt: timestamp('queued_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('visits_queue_idx').on(t.status, t.patientState, t.queuedAt),
  index('visits_clinician_idx').on(t.clinicianUserId, t.status),
  index('visits_patient_idx').on(t.patientUserId),
  index('visits_checkout_idx').on(t.stripeCheckoutId),
  index('visits_payout_idx').on(t.payoutStatus, t.clinicianUserId),
]);

// ─── Companion: scheduled check-ins ──────────────────────────────────────────
// After a visit (or an urgent/telehealth intake with no visit), Ace checks in.
// "Worse" or a higher-acuity follow-up escalates: the patient is pushed to request
// a clinician and the provider dashboard flags it.

export const checkins = pgTable('checkins', {
  id: serial('id').primaryKey(),
  intakeSessionId: integer('intake_session_id')
    .notNull()
    .references(() => intakeSessions.id, { onDelete: 'cascade' }),
  patientUserId: varchar('patient_user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  reason: varchar('reason', { length: 24 }).notNull(), // post_visit | urgent_intake | telehealth_intake
  dueAt: timestamp('due_at').notNull(),
  status: varchar('status', { length: 16 }).default('scheduled'), // scheduled | sent | answered | escalated | expired
  sentAt: timestamp('sent_at'),
  answeredAt: timestamp('answered_at'),
  outcome: varchar('outcome', { length: 16 }), // better | same | worse
  followupIntakeId: integer('followup_intake_id').references(() => intakeSessions.id, { onDelete: 'set null' }),
  escalationNote: text('escalation_note'), // e.g. "Follow-up triaged urgent (was routine)"
  acknowledgedBy: varchar('acknowledged_by', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  acknowledgedAt: timestamp('acknowledged_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('checkins_due_idx').on(t.status, t.dueAt),
  index('checkins_intake_idx').on(t.intakeSessionId),
  index('checkins_patient_idx').on(t.patientUserId, t.status),
  index('checkins_followup_idx').on(t.followupIntakeId),
  index('checkins_acknowledged_by_idx').on(t.acknowledgedBy),
]);

// ─── Dispatch: online sessions (for "visits per online clinician-hour") ──────
export const clinicianOnlineLog = pgTable('clinician_online_log', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  wentOnlineAt: timestamp('went_online_at').notNull(),
  wentOfflineAt: timestamp('went_offline_at'), // null while still online
}, (t) => [
  index('clinician_online_log_user_idx').on(t.userId, t.wentOfflineAt),
]);

// ─── Audit log — append-only record of who touched what ──────────────────────
// Ids and action names only. Never request bodies, never clinical text.
export const auditEvents = pgTable('audit_events', {
  id: serial('id').primaryKey(),
  actorUserId: varchar('actor_user_id', { length: 36 }),
  actorRole: varchar('actor_role', { length: 16 }), // patient | provider | admin | system | anon
  action: varchar('action', { length: 64 }).notNull(), // e.g. intake.complete, visit.accept, brief.view
  resourceType: varchar('resource_type', { length: 32 }),
  resourceId: varchar('resource_id', { length: 64 }),
  patientUserId: varchar('patient_user_id', { length: 36 }), // whose record this touched
  ip: varchar('ip', { length: 64 }),
  userAgent: varchar('user_agent', { length: 255 }),
  meta: jsonb('meta'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('audit_events_created_idx').on(t.createdAt.desc()),
  index('audit_events_actor_idx').on(t.actorUserId, t.createdAt.desc()),
  index('audit_events_patient_idx').on(t.patientUserId, t.createdAt.desc()),
]);

// ─── Provider–patient assignment (minimum necessary) ─────────────────────────
// With PROVIDER_SCOPE=assigned, a provider sees only patients assigned to them
// here, or patients whose dispatched visit they accepted. Admins see all.
export const patientAssignments = pgTable('patient_assignments', {
  id: serial('id').primaryKey(),
  providerUserId: varchar('provider_user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  patientUserId: varchar('patient_user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  assignedBy: varchar('assigned_by', { length: 36 }).references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  unique('patient_assignments_provider_user_id_patient_user_id_unique').on(t.providerUserId, t.patientUserId),
  index('patient_assignments_provider_idx').on(t.providerUserId),
  index('patient_assignments_patient_idx').on(t.patientUserId),
  index('patient_assignments_assigned_by_idx').on(t.assignedBy),
]);
