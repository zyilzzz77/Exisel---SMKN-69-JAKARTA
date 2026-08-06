-- New student registrations are accepted automatically.
ALTER TABLE "enrollments"
ALTER COLUMN "status" SET DEFAULT 'APPROVED';

-- Align registrations created under the previous approval workflow.
UPDATE "enrollments"
SET "status" = 'APPROVED', "updated_at" = CURRENT_TIMESTAMP
WHERE "status" = 'PENDING';
