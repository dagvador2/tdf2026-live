-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('m', 'f');

-- AlterTable
ALTER TABLE "riders" ADD COLUMN "gender" "Gender" NOT NULL DEFAULT 'm';
