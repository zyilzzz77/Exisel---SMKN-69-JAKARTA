-- AlterTable
ALTER TABLE "attendances" ADD COLUMN     "attendance_method" VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "attendance_session_id" UUID,
ADD COLUMN     "checked_in_at" TIMESTAMPTZ(3),
ADD COLUMN     "ip_address" VARCHAR(45),
ADD COLUMN     "qr_token_id" UUID,
ADD COLUMN     "user_agent" TEXT;

-- CreateTable
CREATE TABLE "attendance_qr_tokens" (
    "id" UUID NOT NULL,
    "attendance_session_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "attendance_qr_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_intents" (
    "id" UUID NOT NULL,
    "intent_token_hash" VARCHAR(255) NOT NULL,
    "qr_token_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,

    CONSTRAINT "attendance_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_qr_tokens_token_hash_key" ON "attendance_qr_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "attendance_qr_tokens_attendance_session_id_idx" ON "attendance_qr_tokens"("attendance_session_id");

-- CreateIndex
CREATE INDEX "attendance_qr_tokens_expires_at_idx" ON "attendance_qr_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_intents_intent_token_hash_key" ON "attendance_intents"("intent_token_hash");

-- CreateIndex
CREATE INDEX "attendance_intents_qr_token_hash_idx" ON "attendance_intents"("qr_token_hash");

-- CreateIndex
CREATE INDEX "attendance_intents_expires_at_idx" ON "attendance_intents"("expires_at");

-- CreateIndex
CREATE INDEX "attendances_attendance_session_id_idx" ON "attendances"("attendance_session_id");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_attendance_session_id_fkey" FOREIGN KEY ("attendance_session_id") REFERENCES "attendance_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_qr_token_id_fkey" FOREIGN KEY ("qr_token_id") REFERENCES "attendance_qr_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_qr_tokens" ADD CONSTRAINT "attendance_qr_tokens_attendance_session_id_fkey" FOREIGN KEY ("attendance_session_id") REFERENCES "attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_qr_tokens" ADD CONSTRAINT "attendance_qr_tokens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

