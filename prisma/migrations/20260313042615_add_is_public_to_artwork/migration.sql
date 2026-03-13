-- DropIndex
DROP INDEX "artworks_status_like_count_idx";

-- AlterTable
ALTER TABLE "artworks" ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "artworks_status_is_public_like_count_idx" ON "artworks"("status", "is_public", "like_count");

-- CreateIndex
CREATE INDEX "artworks_status_is_public_created_at_idx" ON "artworks"("status", "is_public", "created_at");
