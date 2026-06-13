-- CreateTable
CREATE TABLE "questionnaires" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "knowledge_score" INTEGER,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_answers" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "block" INTEGER NOT NULL,
    "question_key" TEXT NOT NULL,
    "answer_text" VARCHAR(500),
    "answer_choice" TEXT,
    "is_correct" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_blocks" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_facts" (
    "id" TEXT NOT NULL,
    "sponsor_block_id" TEXT NOT NULL,
    "question_key" TEXT NOT NULL,
    "answer_text" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_facts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "questionnaires_user_id_key" ON "questionnaires"("user_id");

-- CreateIndex
CREATE INDEX "questionnaires_completed_at_idx" ON "questionnaires"("completed_at");

-- CreateIndex
CREATE INDEX "questionnaire_answers_block_idx" ON "questionnaire_answers"("block");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_answers_questionnaire_id_question_key_key" ON "questionnaire_answers"("questionnaire_id", "question_key");

-- CreateIndex
CREATE INDEX "sponsor_blocks_target_user_id_idx" ON "sponsor_blocks"("target_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sponsor_blocks_questionnaire_id_target_user_id_key" ON "sponsor_blocks"("questionnaire_id", "target_user_id");

-- CreateIndex
CREATE INDEX "sponsor_facts_sponsor_block_id_idx" ON "sponsor_facts"("sponsor_block_id");

-- CreateIndex
CREATE UNIQUE INDEX "sponsor_facts_sponsor_block_id_question_key_key" ON "sponsor_facts"("sponsor_block_id", "question_key");

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_answers" ADD CONSTRAINT "questionnaire_answers_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_blocks" ADD CONSTRAINT "sponsor_blocks_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_blocks" ADD CONSTRAINT "sponsor_blocks_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_facts" ADD CONSTRAINT "sponsor_facts_sponsor_block_id_fkey" FOREIGN KEY ("sponsor_block_id") REFERENCES "sponsor_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
