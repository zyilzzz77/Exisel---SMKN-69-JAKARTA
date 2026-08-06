-- Store one generated attendance code session per extracurricular and school date.
CREATE TABLE "attendance_sessions" (
    "id" UUID NOT NULL,
    "extracurricular_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "session_date" DATE NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_sessions_extracurricular_id_session_date_key"
  ON "attendance_sessions"("extracurricular_id", "session_date");
CREATE INDEX "attendance_sessions_code_expires_at_idx"
  ON "attendance_sessions"("code", "expires_at");

ALTER TABLE "attendance_sessions"
  ADD CONSTRAINT "attendance_sessions_extracurricular_id_fkey"
  FOREIGN KEY ("extracurricular_id") REFERENCES "extracurriculars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_sessions"
  ADD CONSTRAINT "attendance_sessions_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
