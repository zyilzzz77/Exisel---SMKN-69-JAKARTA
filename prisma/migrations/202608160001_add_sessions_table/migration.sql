-- Add the sessions table that was missing from the migration history.
-- The Session model existed in schema.prisma since f997044 but no migration
-- ever created the underlying table, causing P2021 on every login.
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "device_name" VARCHAR(255),
    "created_by" VARCHAR(50) DEFAULT 'login',

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX "sessions_user_id_revoked_at_expires_at_idx"
  ON "sessions"("user_id", "revoked_at", "expires_at");

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;