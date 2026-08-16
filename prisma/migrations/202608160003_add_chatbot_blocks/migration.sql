-- CreateTable
CREATE TABLE "chatbot_blocks" (
    "key" VARCHAR(128) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "blocked_until" TIMESTAMPTZ(3) NOT NULL,
    "violation_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "chatbot_blocks_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "chatbot_blocks_blocked_until_idx" ON "chatbot_blocks"("blocked_until");
