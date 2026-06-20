-- AlterTable
ALTER TABLE "riders" ADD COLUMN "traccar_device_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "riders_traccar_device_id_key" ON "riders"("traccar_device_id");
