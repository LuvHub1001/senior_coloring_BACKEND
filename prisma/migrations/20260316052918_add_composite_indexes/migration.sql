-- CreateIndex
CREATE INDEX "artworks_user_id_updated_at_idx" ON "artworks"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "designs_category_created_at_idx" ON "designs"("category", "created_at");
