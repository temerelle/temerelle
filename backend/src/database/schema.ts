import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  smallint,
  char,
  date,
  time,
  uniqueIndex,
  index,
  unique,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Postgres doesn't index foreign keys: every frequent lookup column gets an index named <table>_<column>_idx.
// The booking overlap rule (EXCLUDE USING gist) is not expressible in Drizzle: see drizzle/*_booking_overlap.sql

// CHECK for status-like text columns, so a typo fails loudly. NULL passes, so nullable columns stay optional
function oneOf(name: string, column: string, values: readonly string[]) {
  return check(name, sql.raw(`${column} IN (${values.map((v) => `'${v}'`).join(', ')})`));
}

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const RESOURCE_TYPES = ['person', 'bay', 'room', 'other'] as const;
export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'] as const;
export const CANCELLED_BY = ['client', 'owner'] as const;

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Stored lower-cased by the app; the CHECK keeps it that way, so the unique index is case-insensitive
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    phone: text('phone'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('users_email_key').on(table.email),
    check('users_email_lowercase_check', sql`${table.email} = lower(${table.email})`),
  ],
);

// Refresh sessions. Only the token's SHA-256 is stored; rotation revokes the old row and inserts a new one
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    // Set when revoked by rotation (not by logout): presenting it again later means the token was stolen
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [index('password_reset_tokens_user_id_idx').on(table.userId)],
);

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // An owner with businesses can't be deleted by accident; account deletion handles them first
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    // Public search code: lower-case latin, digits and dashes
    code: text('code').notNull(),
    description: text('description').notNull().default(''),
    // IANA name, validated by the app (a CHECK can't look up pg_timezone_names)
    timezone: text('timezone').notNull().default('Europe/Kyiv'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('businesses_code_key').on(table.code),
    index('businesses_owner_id_idx').on(table.ownerId),
    check('businesses_code_format_check', sql`${table.code} ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$'`),
  ],
);

// The capacity being booked: a person, a wash bay, a room. MVP: exactly one default resource per business,
// created with the business. Never deleted once it has bookings (RESTRICT below), only deactivated
export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    type: text('type', { enum: RESOURCE_TYPES }).notNull().default('other'),
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // Target of the composite foreign keys that keep schedules and bookings inside one business
    unique('resources_business_id_id_key').on(table.businessId, table.id),
    uniqueIndex('resources_one_default_per_business_key')
      .on(table.businessId)
      .where(sql`${table.isDefault}`),
    oneOf('resources_type_check', 'type', RESOURCE_TYPES),
  ],
);

export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    // Minor units (kopiyky), never floats
    priceMinor: integer('price_minor').notNull(),
    currency: char('currency', { length: 3 }).notNull().default('UAH'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('services_business_id_id_key').on(table.businessId, table.id),
    check('services_duration_check', sql`${table.durationMinutes} BETWEEN 1 AND 1440`),
    check('services_price_check', sql`${table.priceMinor} >= 0`),
    check('services_currency_check', sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

// Weekly schedule of a resource, several intervals a day. Overlapping intervals are rejected by the app
// (the schedule is replaced as a whole on PUT)
export const workingHours = pgTable(
  'working_hours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id').notNull(),
    resourceId: uuid('resource_id').notNull(),
    // ISO weekday: 1 = Monday … 7 = Sunday
    dayOfWeek: smallint('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'working_hours_resource_fk',
      columns: [table.businessId, table.resourceId],
      foreignColumns: [resources.businessId, resources.id],
    }).onDelete('cascade'),
    index('working_hours_resource_id_day_idx').on(table.resourceId, table.dayOfWeek),
    check('working_hours_day_check', sql`${table.dayOfWeek} BETWEEN 1 AND 7`),
    check('working_hours_interval_check', sql`${table.endTime} > ${table.startTime}`),
  ],
);

// Date overrides of a resource's weekly schedule. If a date has any rows, they replace the weekly schedule
// for that whole date: either one day-off row, or one or more working intervals (no partial merging)
export const scheduleExceptions = pgTable(
  'schedule_exceptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id').notNull(),
    resourceId: uuid('resource_id').notNull(),
    date: date('date').notNull(),
    isDayOff: boolean('is_day_off').notNull().default(false),
    startTime: time('start_time'),
    endTime: time('end_time'),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      name: 'schedule_exceptions_resource_fk',
      columns: [table.businessId, table.resourceId],
      foreignColumns: [resources.businessId, resources.id],
    }).onDelete('cascade'),
    index('schedule_exceptions_resource_id_date_idx').on(table.resourceId, table.date),
    uniqueIndex('schedule_exceptions_one_day_off_key')
      .on(table.resourceId, table.date)
      .where(sql`${table.isDayOff}`),
    check(
      'schedule_exceptions_shape_check',
      sql`(${table.isDayOff} AND ${table.startTime} IS NULL AND ${table.endTime} IS NULL)
        OR (NOT ${table.isDayOff} AND ${table.startTime} IS NOT NULL AND ${table.endTime} > ${table.startTime})`,
    ),
  ],
);

// pending and confirmed reserve [starts_at, ends_at) on the resource (exclusion constraint in the migration).
// cancelled and completed don't, so historical completed rows may overlap
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'restrict' }),
    resourceId: uuid('resource_id').notNull(),
    serviceId: uuid('service_id').notNull(),
    // null = created by the owner for an unregistered client, or the client deleted the account
    clientId: uuid('client_id').references(() => users.id, { onDelete: 'set null' }),
    clientName: text('client_name').notNull(),
    clientPhone: text('client_phone'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: text('status', { enum: BOOKING_STATUSES }).notNull(),
    // Copied at booking time, so later service edits don't change history
    serviceNameSnapshot: text('service_name_snapshot').notNull(),
    priceMinorSnapshot: integer('price_minor_snapshot').notNull(),
    currencySnapshot: char('currency_snapshot', { length: 3 }).notNull(),
    durationMinutesSnapshot: integer('duration_minutes_snapshot').notNull(),
    cancellationReason: text('cancellation_reason'),
    cancelledBy: text('cancelled_by', { enum: CANCELLED_BY }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // Resource and service must belong to the booking's business, enforced by the database
    foreignKey({
      name: 'bookings_resource_fk',
      columns: [table.businessId, table.resourceId],
      foreignColumns: [resources.businessId, resources.id],
    }).onDelete('restrict'),
    foreignKey({
      name: 'bookings_service_fk',
      columns: [table.businessId, table.serviceId],
      foreignColumns: [services.businessId, services.id],
    }).onDelete('restrict'),
    index('bookings_business_id_starts_at_idx').on(table.businessId, table.startsAt),
    index('bookings_client_id_starts_at_idx').on(table.clientId, table.startsAt),
    oneOf('bookings_status_check', 'status', BOOKING_STATUSES),
    oneOf('bookings_cancelled_by_check', 'cancelled_by', CANCELLED_BY),
    check('bookings_interval_check', sql`${table.endsAt} > ${table.startsAt}`),
    check(
      'bookings_duration_matches_check',
      sql`${table.endsAt} - ${table.startsAt} = make_interval(mins => ${table.durationMinutesSnapshot})`,
    ),
    check('bookings_price_check', sql`${table.priceMinorSnapshot} >= 0`),
    check(
      'bookings_cancelled_by_status_check',
      sql`(${table.status} = 'cancelled') = (${table.cancelledBy} IS NOT NULL)`,
    ),
  ],
);

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('push_subscriptions_user_id_idx').on(table.userId)],
);

// Fixed-window counters for auth rate limits (no Redis). Key: '<action>:<ip or email>'
export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').primaryKey(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull(),
  },
  (table) => [index('rate_limits_window_start_idx').on(table.windowStart)],
);
