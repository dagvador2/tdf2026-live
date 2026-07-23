-- AlterTable
ALTER TABLE "stages" ADD COLUMN "team_score_mode" TEXT NOT NULL DEFAULT 'sum_top_n';
