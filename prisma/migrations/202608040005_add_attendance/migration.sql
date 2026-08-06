-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'EXCUSED');

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "extracurricular_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "reason" VARCHAR(500),
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendances_reason_check" CHECK (
      ("status" = 'PRESENT' AND "reason" IS NULL)
      OR
      ("status" = 'EXCUSED' AND LENGTH(TRIM("reason")) >= 5)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "attendances_user_id_extracurricular_id_attendance_date_key"
ON "attendances"("user_id", "extracurricular_id", "attendance_date");

CREATE INDEX "attendances_attendance_date_status_idx"
ON "attendances"("attendance_date", "status");

CREATE INDEX "attendances_extracurricular_id_attendance_date_idx"
ON "attendances"("extracurricular_id", "attendance_date");

-- AddForeignKey
ALTER TABLE "attendances"
ADD CONSTRAINT "attendances_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendances"
ADD CONSTRAINT "attendances_extracurricular_id_fkey"
FOREIGN KEY ("extracurricular_id") REFERENCES "extracurriculars"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
