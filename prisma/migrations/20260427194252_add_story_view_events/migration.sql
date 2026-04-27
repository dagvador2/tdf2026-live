-- CreateTable
CREATE TABLE "story_view_events" (
    "id" TEXT NOT NULL,
    "story_id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "kind" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_view_events_story_id_kind_idx" ON "story_view_events"("story_id", "kind");

-- CreateIndex
CREATE INDEX "story_view_events_created_at_idx" ON "story_view_events"("created_at");

-- CreateIndex
CREATE INDEX "story_view_events_user_id_idx" ON "story_view_events"("user_id");

-- AddForeignKey
ALTER TABLE "story_view_events" ADD CONSTRAINT "story_view_events_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "tour_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_view_events" ADD CONSTRAINT "story_view_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
