-- CreateEnum
CREATE TYPE "BingoCategory" AS ENUM ('GENERIC', 'GROUP_SPECIFIC', 'SELF_REFERENTIAL');

-- CreateEnum
CREATE TYPE "BingoAchievementType" AS ENUM ('SINGLE_LINE', 'DOUBLE_LINE', 'FULL_HOUSE');

-- CreateTable
CREATE TABLE "bingo_events" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bingo_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bingo_cell_templates" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" "BingoCategory" NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "target_user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bingo_cell_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bingo_grids" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_bingo_at" TIMESTAMP(3),
    "full_house_at" TIMESTAMP(3),

    CONSTRAINT "bingo_grids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bingo_grid_cells" (
    "id" TEXT NOT NULL,
    "grid_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "category" "BingoCategory" NOT NULL,
    "validated_at" TIMESTAMP(3),
    "validation_note" VARCHAR(280),

    CONSTRAINT "bingo_grid_cells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bingo_achievements" (
    "id" TEXT NOT NULL,
    "grid_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "BingoAchievementType" NOT NULL,
    "line" TEXT NOT NULL,
    "achieved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bingo_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bingo_events_slug_key" ON "bingo_events"("slug");

-- CreateIndex
CREATE INDEX "bingo_events_is_active_idx" ON "bingo_events"("is_active");

-- CreateIndex
CREATE INDEX "bingo_cell_templates_event_id_category_is_active_idx" ON "bingo_cell_templates"("event_id", "category", "is_active");

-- CreateIndex
CREATE INDEX "bingo_cell_templates_target_user_id_idx" ON "bingo_cell_templates"("target_user_id");

-- CreateIndex
CREATE INDEX "bingo_grids_first_bingo_at_idx" ON "bingo_grids"("first_bingo_at");

-- CreateIndex
CREATE UNIQUE INDEX "bingo_grids_event_id_user_id_key" ON "bingo_grids"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "bingo_grid_cells_grid_id_validated_at_idx" ON "bingo_grid_cells"("grid_id", "validated_at");

-- CreateIndex
CREATE UNIQUE INDEX "bingo_grid_cells_grid_id_position_key" ON "bingo_grid_cells"("grid_id", "position");

-- CreateIndex
CREATE INDEX "bingo_achievements_user_id_achieved_at_idx" ON "bingo_achievements"("user_id", "achieved_at");

-- CreateIndex
CREATE INDEX "bingo_achievements_type_achieved_at_idx" ON "bingo_achievements"("type", "achieved_at");

-- CreateIndex
CREATE UNIQUE INDEX "bingo_achievements_grid_id_type_line_key" ON "bingo_achievements"("grid_id", "type", "line");

-- AddForeignKey
ALTER TABLE "bingo_cell_templates" ADD CONSTRAINT "bingo_cell_templates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "bingo_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bingo_cell_templates" ADD CONSTRAINT "bingo_cell_templates_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bingo_grids" ADD CONSTRAINT "bingo_grids_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "bingo_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bingo_grids" ADD CONSTRAINT "bingo_grids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bingo_grid_cells" ADD CONSTRAINT "bingo_grid_cells_grid_id_fkey" FOREIGN KEY ("grid_id") REFERENCES "bingo_grids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bingo_grid_cells" ADD CONSTRAINT "bingo_grid_cells_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "bingo_cell_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bingo_achievements" ADD CONSTRAINT "bingo_achievements_grid_id_fkey" FOREIGN KEY ("grid_id") REFERENCES "bingo_grids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bingo_achievements" ADD CONSTRAINT "bingo_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
