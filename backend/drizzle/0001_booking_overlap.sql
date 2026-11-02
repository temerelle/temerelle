-- Drizzle can't express exclusion constraints, so this migration is hand-written.
-- pending and confirmed bookings may not overlap on the same resource; [) lets back-to-back bookings touch.
-- cancelled and completed rows are outside the constraint, so historical completed rows may overlap
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_no_active_overlap"
EXCLUDE USING gist (
  "resource_id" WITH =,
  tstzrange("starts_at", "ends_at", '[)') WITH &&
)
WHERE ("status" IN ('pending', 'confirmed'));
