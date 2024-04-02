/*
  Warnings:

  - You are about to drop the `ai_prompts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ai_sessions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ai_sessions" DROP CONSTRAINT "ai_sessions_doc_id_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_sessions" DROP CONSTRAINT "ai_sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_sessions" DROP CONSTRAINT "ai_sessions_workspace_id_fkey";

-- DropTable
DROP TABLE "ai_prompts";

-- DropTable
DROP TABLE "ai_sessions";

-- CreateTable
CREATE TABLE "ai_prompts_messages" (
    "id" VARCHAR NOT NULL,
    "prompt_id" VARCHAR NOT NULL,
    "idx" INTEGER NOT NULL,
    "role" "AiPromptRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompts_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompts_metadata" (
    "id" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "action" VARCHAR,
    "model" VARCHAR,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompts_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_session_messages" (
    "id" VARCHAR(36) NOT NULL,
    "session_id" VARCHAR(36) NOT NULL,
    "role" "AiPromptRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_session_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_sessions_metadata" (
    "id" VARCHAR NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "workspace_id" VARCHAR NOT NULL,
    "doc_id" VARCHAR NOT NULL,
    "prompt_name" VARCHAR NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_sessions_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompts_messages_id_idx_key" ON "ai_prompts_messages"("id", "idx");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompts_metadata_name_key" ON "ai_prompts_metadata"("name");

-- AddForeignKey
ALTER TABLE "ai_prompts_messages" ADD CONSTRAINT "ai_prompts_messages_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "ai_prompts_metadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_session_messages" ADD CONSTRAINT "ai_session_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ai_sessions_metadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sessions_metadata" ADD CONSTRAINT "ai_sessions_metadata_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sessions_metadata" ADD CONSTRAINT "ai_sessions_metadata_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sessions_metadata" ADD CONSTRAINT "ai_sessions_metadata_doc_id_workspace_id_fkey" FOREIGN KEY ("doc_id", "workspace_id") REFERENCES "snapshots"("guid", "workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_sessions_metadata" ADD CONSTRAINT "ai_sessions_metadata_prompt_name_fkey" FOREIGN KEY ("prompt_name") REFERENCES "ai_prompts_metadata"("name") ON DELETE CASCADE ON UPDATE CASCADE;
