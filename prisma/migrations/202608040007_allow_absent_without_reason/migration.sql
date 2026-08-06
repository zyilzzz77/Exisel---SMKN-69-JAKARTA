-- Extend the attendance invariant for automatically generated absences.
ALTER TABLE "attendances"
DROP CONSTRAINT "attendances_reason_check";

ALTER TABLE "attendances"
ADD CONSTRAINT "attendances_reason_check" CHECK (
  ("status" IN ('PRESENT', 'ABSENT') AND "reason" IS NULL)
  OR
  ("status" = 'EXCUSED' AND LENGTH(TRIM("reason")) >= 5)
);
