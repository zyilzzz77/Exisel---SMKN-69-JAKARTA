-- DropForeignKey
ALTER TABLE "attendance_qr_tokens" DROP CONSTRAINT "attendance_qr_tokens_attendance_session_id_fkey";

-- DropForeignKey
ALTER TABLE "attendance_qr_tokens" DROP CONSTRAINT "attendance_qr_tokens_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "attendances" DROP CONSTRAINT "attendances_qr_token_id_fkey";

-- DropIndex
DROP INDEX "attendance_intents_qr_token_hash_idx";

-- AlterTable
ALTER TABLE "attendance_intents" DROP COLUMN "qr_token_hash",
ADD COLUMN     "attendance_session_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "attendances" DROP COLUMN "qr_token_id";

-- DropTable
DROP TABLE "attendance_qr_tokens";

-- CreateIndex
CREATE INDEX "attendance_intents_attendance_session_id_idx" ON "attendance_intents"("attendance_session_id");

