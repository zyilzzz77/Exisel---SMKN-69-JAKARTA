-- Add Pramuka as the eighth active extracurricular.
INSERT INTO "extracurriculars" (
  "id", "name", "description", "capacity", "is_active", "created_at", "updated_at"
)
VALUES (
  '10000000-0000-4000-8000-000000000008',
  'Pramuka',
  'Membentuk karakter, kedisiplinan, kemandirian, kepemimpinan, dan cinta tanah air melalui metode kepanduan.',
  36,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "capacity" = EXCLUDED."capacity",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "schedules" (
  "id", "extracurricular_id", "day", "start_time", "end_time", "location"
)
SELECT
  '20000000-0000-4000-8000-000000000009',
  "id",
  'WEDNESDAY',
  '15:45:00',
  '17:00:00',
  'Lapangan Upacara'
FROM "extracurriculars"
WHERE "name" = 'Pramuka'
ON CONFLICT ("id") DO UPDATE SET
  "extracurricular_id" = EXCLUDED."extracurricular_id",
  "day" = EXCLUDED."day",
  "start_time" = EXCLUDED."start_time",
  "end_time" = EXCLUDED."end_time",
  "location" = EXCLUDED."location";
