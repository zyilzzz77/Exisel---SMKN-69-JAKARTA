-- Add content managed by administrators and extracurricular mentors.
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "extracurricular_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "organizer" VARCHAR(180),
    "description" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "registration_deadline" DATE,
    "location" VARCHAR(180),
    "level" VARCHAR(80),
    "registration_url" VARCHAR(2048),
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "extracurricular_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "competition_name" VARCHAR(180),
    "rank" VARCHAR(100) NOT NULL,
    "level" VARCHAR(80),
    "achieved_at" DATE NOT NULL,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gallery_items" (
    "id" UUID NOT NULL,
    "extracurricular_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "image_url" VARCHAR(2048) NOT NULL,
    "alt_text" VARCHAR(240) NOT NULL,
    "caption" VARCHAR(500),
    "taken_at" DATE,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "gallery_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "competitions_extracurricular_id_event_date_idx"
  ON "competitions"("extracurricular_id", "event_date");
CREATE INDEX "competitions_is_published_event_date_idx"
  ON "competitions"("is_published", "event_date");
CREATE INDEX "achievements_extracurricular_id_achieved_at_idx"
  ON "achievements"("extracurricular_id", "achieved_at");
CREATE INDEX "achievements_is_published_achieved_at_idx"
  ON "achievements"("is_published", "achieved_at");
CREATE INDEX "gallery_items_extracurricular_id_position_idx"
  ON "gallery_items"("extracurricular_id", "position");
CREATE INDEX "gallery_items_is_published_created_at_idx"
  ON "gallery_items"("is_published", "created_at");

ALTER TABLE "competitions"
  ADD CONSTRAINT "competitions_extracurricular_id_fkey"
  FOREIGN KEY ("extracurricular_id") REFERENCES "extracurriculars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competitions"
  ADD CONSTRAINT "competitions_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "achievements"
  ADD CONSTRAINT "achievements_extracurricular_id_fkey"
  FOREIGN KEY ("extracurricular_id") REFERENCES "extracurriculars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "achievements"
  ADD CONSTRAINT "achievements_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gallery_items"
  ADD CONSTRAINT "gallery_items_extracurricular_id_fkey"
  FOREIGN KEY ("extracurricular_id") REFERENCES "extracurriculars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gallery_items"
  ADD CONSTRAINT "gallery_items_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
