import "server-only";

import { getPrisma } from "@/lib/database/prisma";
import { getJakartaDateKey } from "@/lib/school-date";

export const ATTENDANCE_TRACKING_START_DATE = "2026-08-01";

/**
 * Materializes missed attendance for every scheduled day that has fully ended.
 * The query is idempotent because the attendance table has a unique key for
 * student, extracurricular, and date.
 */
export async function reconcilePastAttendances(
  todayDateKey = getJakartaDateKey(),
) {
  if (todayDateKey <= ATTENDANCE_TRACKING_START_DATE) return 0;

  return getPrisma().$executeRaw`
    INSERT INTO "attendances" (
      "id",
      "user_id",
      "extracurricular_id",
      "attendance_date",
      "status",
      "reason",
      "submitted_at",
      "updated_at"
    )
    SELECT
      gen_random_uuid(),
      enrollment."user_id",
      enrollment."extracurricular_id",
      missed."attendance_date"::date,
      'ABSENT'::"AttendanceStatus",
      NULL,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "enrollments" AS enrollment
    INNER JOIN "users" AS student
      ON student."id" = enrollment."user_id"
    INNER JOIN "extracurriculars" AS extracurricular
      ON extracurricular."id" = enrollment."extracurricular_id"
    CROSS JOIN LATERAL generate_series(
      GREATEST(
        ${ATTENDANCE_TRACKING_START_DATE}::date,
        (enrollment."registered_at" AT TIME ZONE 'Asia/Jakarta')::date
      ),
      (${todayDateKey}::date - INTERVAL '1 day')::date,
      INTERVAL '1 day'
    ) AS missed("attendance_date")
    INNER JOIN "schedules" AS schedule
      ON schedule."extracurricular_id" = enrollment."extracurricular_id"
      AND schedule."day" = CASE EXTRACT(DOW FROM missed."attendance_date")::integer
        WHEN 0 THEN 'SUNDAY'::"DayOfWeek"
        WHEN 1 THEN 'MONDAY'::"DayOfWeek"
        WHEN 2 THEN 'TUESDAY'::"DayOfWeek"
        WHEN 3 THEN 'WEDNESDAY'::"DayOfWeek"
        WHEN 4 THEN 'THURSDAY'::"DayOfWeek"
        WHEN 5 THEN 'FRIDAY'::"DayOfWeek"
        WHEN 6 THEN 'SATURDAY'::"DayOfWeek"
      END
    WHERE enrollment."status" = 'APPROVED'::"EnrollmentStatus"
      AND student."role" = 'STUDENT'::"Role"
      AND student."is_active" = TRUE
      AND extracurricular."is_active" = TRUE
    ON CONFLICT (
      "user_id",
      "extracurricular_id",
      "attendance_date"
    ) DO NOTHING
  `;
}
