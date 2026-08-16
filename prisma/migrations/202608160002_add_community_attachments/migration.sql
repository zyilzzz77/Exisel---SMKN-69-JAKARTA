-- AlterTable: tambahkan lampiran (gambar, PDF, video) pada pesan community
ALTER TABLE "community_messages"
  ADD COLUMN "attachment_path" VARCHAR(500),
  ADD COLUMN "attachment_name" VARCHAR(255),
  ADD COLUMN "attachment_size" INTEGER,
  ADD COLUMN "attachment_mime" VARCHAR(120);
