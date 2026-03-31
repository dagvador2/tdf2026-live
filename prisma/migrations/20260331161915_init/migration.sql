-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('road', 'team_tt', 'individual_tt', 'mountain');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('upcoming', 'live', 'paused', 'finished');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('registered', 'started', 'tracking', 'finished', 'dnf', 'dns');

-- CreateEnum
CREATE TYPE "CheckpointType" AS ENUM ('start', 'col', 'sprint', 'finish');

-- CreateEnum
CREATE TYPE "GCMode" AS ENUM ('all', 'complete_only', 'categories');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('text', 'photo', 'result', 'highlight');

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "logo_url" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riders" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "nickname" TEXT,
    "slug" TEXT NOT NULL,
    "photo_url" TEXT,
    "team_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "edition_count" INTEGER NOT NULL DEFAULT 1,
    "fun_facts" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "riders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StageType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "distance_km" DOUBLE PRECISION NOT NULL,
    "elevation_m" INTEGER NOT NULL,
    "gpx_url" TEXT,
    "status" "StageStatus" NOT NULL DEFAULT 'upcoming',
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "tt_nth_rider" INTEGER NOT NULL DEFAULT 3,
    "team_top_n" INTEGER NOT NULL DEFAULT 3,
    "gc_mode" "GCMode" NOT NULL DEFAULT 'all',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_entries" (
    "id" TEXT NOT NULL,
    "rider_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'registered',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoints" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CheckpointType" NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_m" INTEGER NOT NULL DEFAULT 50,
    "order" INTEGER NOT NULL,
    "km_from_start" DOUBLE PRECISION NOT NULL,
    "elevation" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_records" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "corrected_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_positions" (
    "id" BIGSERIAL NOT NULL,
    "entry_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_posts" (
    "id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "type" "PostType" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "photo_url" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "riders_slug_key" ON "riders"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "riders_token_key" ON "riders"("token");

-- CreateIndex
CREATE UNIQUE INDEX "stages_number_key" ON "stages"("number");

-- CreateIndex
CREATE UNIQUE INDEX "stage_entries_rider_id_stage_id_key" ON "stage_entries"("rider_id", "stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "time_records_entry_id_checkpoint_id_key" ON "time_records"("entry_id", "checkpoint_id");

-- CreateIndex
CREATE INDEX "gps_positions_entry_id_timestamp_idx" ON "gps_positions"("entry_id", "timestamp");

-- CreateIndex
CREATE INDEX "gps_positions_created_at_idx" ON "gps_positions"("created_at");

-- CreateIndex
CREATE INDEX "live_posts_stage_id_created_at_idx" ON "live_posts"("stage_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "riders" ADD CONSTRAINT "riders_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_entries" ADD CONSTRAINT "stage_entries_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_entries" ADD CONSTRAINT "stage_entries_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_records" ADD CONSTRAINT "time_records_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "stage_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_records" ADD CONSTRAINT "time_records_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_positions" ADD CONSTRAINT "gps_positions_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "stage_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_posts" ADD CONSTRAINT "live_posts_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
