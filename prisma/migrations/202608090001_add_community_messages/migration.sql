-- CreateTable
CREATE TABLE "community_messages" (
    "id" UUID NOT NULL,
    "extracurricular_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "community_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_messages_extracurricular_id_created_at_idx"
  ON "community_messages"("extracurricular_id", "created_at");

-- AddForeignKey
ALTER TABLE "community_messages"
  ADD CONSTRAINT "community_messages_extracurricular_id_fkey"
  FOREIGN KEY ("extracurricular_id") REFERENCES "extracurriculars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "community_messages"
  ADD CONSTRAINT "community_messages_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
