-- CreateEnum
CREATE TYPE "PastisSource" AS ENUM ('self', 'admin');

-- CreateTable
CREATE TABLE "pastis_logs" (
    "id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "stage_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "source" "PastisSource" NOT NULL DEFAULT 'self',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pastis_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pastis_logs_rider_id_idx" ON "pastis_logs"("rider_id");

-- CreateIndex
CREATE INDEX "pastis_logs_stage_id_idx" ON "pastis_logs"("stage_id");

-- CreateIndex
CREATE INDEX "pastis_logs_created_at_idx" ON "pastis_logs"("created_at");

-- AddForeignKey
ALTER TABLE "pastis_logs" ADD CONSTRAINT "pastis_logs_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pastis_logs" ADD CONSTRAINT "pastis_logs_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
