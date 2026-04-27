-- CreateTable
CREATE TABLE "tour_stories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "hero_image_url" TEXT,
    "hero_image_attribution" TEXT,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reading_time_min" INTEGER NOT NULL,
    "published_at" TIMESTAMP(3),
    "scheduled_for" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tour_stories_slug_key" ON "tour_stories"("slug");

-- CreateIndex
CREATE INDEX "tour_stories_published_at_idx" ON "tour_stories"("published_at");

-- CreateIndex
CREATE INDEX "tour_stories_category_idx" ON "tour_stories"("category");
