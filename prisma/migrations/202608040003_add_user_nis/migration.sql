-- Store NIS as a student identifier independently from the password hash.
ALTER TABLE "users" ADD COLUMN "nis" VARCHAR(20);

ALTER TABLE "users"
ADD CONSTRAINT "users_nis_format_check"
CHECK ("nis" IS NULL OR "nis" ~ '^[0-9]{5,20}$');

CREATE UNIQUE INDEX "users_nis_key" ON "users"("nis");
