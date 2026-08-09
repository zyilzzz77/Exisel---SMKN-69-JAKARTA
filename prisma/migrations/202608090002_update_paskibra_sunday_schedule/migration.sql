-- Move the regular Paskibra activity to Sunday at the school field.
UPDATE "schedules"
SET
  "day" = 'SUNDAY',
  "location" = 'Lapangan Sekolah'
WHERE "extracurricular_id" = (
  SELECT "id"
  FROM "extracurriculars"
  WHERE "name" = 'Paskibra'
);
