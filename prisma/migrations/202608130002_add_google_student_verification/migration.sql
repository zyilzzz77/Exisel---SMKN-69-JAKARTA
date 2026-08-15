-- Google identity and administrator-controlled student access.
CREATE TYPE "UserStatus" AS ENUM (
  'INCOMPLETE',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED'
);

CREATE TYPE "AuditAction" AS ENUM (
  'STUDENT_APPROVED',
  'STUDENT_REJECTED',
  'STUDENT_SUSPENDED',
  'STUDENT_UNSUSPENDED'
);

ALTER TABLE "users"
  ADD COLUMN "google_id" VARCHAR(255),
  ADD COLUMN "avatar_url" VARCHAR(2048),
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "rejection_reason" VARCHAR(1000),
  ADD COLUMN "approved_at" TIMESTAMPTZ(3),
  ADD COLUMN "approved_by_id" UUID,
  ADD COLUMN "rejected_at" TIMESTAMPTZ(3),
  ADD COLUMN "rejected_by_id" UUID;

CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

ALTER TABLE "users"
  ADD CONSTRAINT "users_approved_by_id_fkey"
  FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users"
  ADD CONSTRAINT "users_rejected_by_id_fkey"
  FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "admin_id" UUID NOT NULL,
  "target_user_id" UUID NOT NULL,
  "action" "AuditAction" NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_admin_id_created_at_idx"
  ON "audit_logs"("admin_id", "created_at");
CREATE INDEX "audit_logs_target_user_id_created_at_idx"
  ON "audit_logs"("target_user_id", "created_at");

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_target_user_id_fkey"
  FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
