-- Seed the seven extracurriculars displayed by EXISEL.
INSERT INTO "extracurriculars" (
  "id", "name", "description", "capacity", "is_active", "created_at", "updated_at"
)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'PMR', 'Belajar pertolongan pertama, kesehatan remaja, dan aksi kemanusiaan di sekolah.', 32, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000002', 'English Club', 'Asah kemampuan speaking, public presentation, dan kreativitas berbahasa Inggris.', 28, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000003', 'Nihon', 'Jelajahi bahasa, budaya, dan karya kreatif Jepang bersama teman satu minat.', 28, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000004', 'Basket', 'Tingkatkan teknik bermain, kebugaran, kerja sama, dan mental bertanding.', 24, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000005', 'ITC', 'Eksplorasi coding, desain digital, perangkat, dan teknologi bersama tim ITC.', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000006', 'Paskibra', 'Bangun disiplin, kepemimpinan, kekompakan, dan ketangkasan baris-berbaris.', 36, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000007', 'Futsal', 'Kembangkan teknik, strategi, stamina, dan sportivitas di dalam lapangan.', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "capacity" = EXCLUDED."capacity",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "schedules" ("id", "extracurricular_id", "day", "start_time", "end_time", "location")
SELECT '20000000-0000-4000-8000-000000000001', "id", 'MONDAY', '15:45:00', '17:00:00', 'Ruang UKS'
FROM "extracurriculars" WHERE "name" = 'PMR'
ON CONFLICT ("id") DO UPDATE SET "extracurricular_id" = EXCLUDED."extracurricular_id", "day" = EXCLUDED."day", "start_time" = EXCLUDED."start_time", "end_time" = EXCLUDED."end_time", "location" = EXCLUDED."location";

INSERT INTO "schedules" ("id", "extracurricular_id", "day", "start_time", "end_time", "location")
SELECT '20000000-0000-4000-8000-000000000002', "id", 'TUESDAY', '15:45:00', '17:00:00', 'Ruang UKS'
FROM "extracurriculars" WHERE "name" = 'PMR'
ON CONFLICT ("id") DO UPDATE SET "extracurricular_id" = EXCLUDED."extracurricular_id", "day" = EXCLUDED."day", "start_time" = EXCLUDED."start_time", "end_time" = EXCLUDED."end_time", "location" = EXCLUDED."location";

INSERT INTO "schedules" ("id", "extracurricular_id", "day", "start_time", "end_time", "location")
SELECT '20000000-0000-4000-8000-000000000003', "id", 'THURSDAY', '15:45:00', '17:00:00', 'Lab Bahasa'
FROM "extracurriculars" WHERE "name" = 'English Club'
ON CONFLICT ("id") DO UPDATE SET "extracurricular_id" = EXCLUDED."extracurricular_id", "day" = EXCLUDED."day", "start_time" = EXCLUDED."start_time", "end_time" = EXCLUDED."end_time", "location" = EXCLUDED."location";

INSERT INTO "schedules" ("id", "extracurricular_id", "day", "start_time", "end_time", "location")
SELECT '20000000-0000-4000-8000-000000000004', "id", 'TUESDAY', '15:45:00', '17:00:00', 'Ruang Bahasa Jepang'
FROM "extracurriculars" WHERE "name" = 'Nihon'
ON CONFLICT ("id") DO UPDATE SET "extracurricular_id" = EXCLUDED."extracurricular_id", "day" = EXCLUDED."day", "start_time" = EXCLUDED."start_time", "end_time" = EXCLUDED."end_time", "location" = EXCLUDED."location";

INSERT INTO "schedules" ("id", "extracurricular_id", "day", "start_time", "end_time", "location")
SELECT '20000000-0000-4000-8000-000000000005', "id", 'MONDAY', '15:45:00', '17:00:00', 'Lapangan Basket'
FROM "extracurriculars" WHERE "name" = 'Basket'
ON CONFLICT ("id") DO UPDATE SET "extracurricular_id" = EXCLUDED."extracurricular_id", "day" = EXCLUDED."day", "start_time" = EXCLUDED."start_time", "end_time" = EXCLUDED."end_time", "location" = EXCLUDED."location";

INSERT INTO "schedules" ("id", "extracurricular_id", "day", "start_time", "end_time", "location")
SELECT '20000000-0000-4000-8000-000000000006', "id", 'FRIDAY', '15:45:00', '17:00:00', 'Lab Komputer 2'
FROM "extracurriculars" WHERE "name" = 'ITC'
ON CONFLICT ("id") DO UPDATE SET "extracurricular_id" = EXCLUDED."extracurricular_id", "day" = EXCLUDED."day", "start_time" = EXCLUDED."start_time", "end_time" = EXCLUDED."end_time", "location" = EXCLUDED."location";

INSERT INTO "schedules" ("id", "extracurricular_id", "day", "start_time", "end_time", "location")
SELECT '20000000-0000-4000-8000-000000000007', "id", 'TUESDAY', '15:45:00', '17:00:00', 'Lapangan Upacara'
FROM "extracurriculars" WHERE "name" = 'Paskibra'
ON CONFLICT ("id") DO UPDATE SET "extracurricular_id" = EXCLUDED."extracurricular_id", "day" = EXCLUDED."day", "start_time" = EXCLUDED."start_time", "end_time" = EXCLUDED."end_time", "location" = EXCLUDED."location";

INSERT INTO "schedules" ("id", "extracurricular_id", "day", "start_time", "end_time", "location")
SELECT '20000000-0000-4000-8000-000000000008', "id", 'FRIDAY', '15:45:00', '17:00:00', 'Lapangan Futsal'
FROM "extracurriculars" WHERE "name" = 'Futsal'
ON CONFLICT ("id") DO UPDATE SET "extracurricular_id" = EXCLUDED."extracurricular_id", "day" = EXCLUDED."day", "start_time" = EXCLUDED."start_time", "end_time" = EXCLUDED."end_time", "location" = EXCLUDED."location";
