-- CreateEnum
CREATE TYPE "ToggleType" AS ENUM ('LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "themes" ADD COLUMN     "frame_image_url" TEXT,
ADD COLUMN     "toggle_type" "ToggleType" NOT NULL DEFAULT 'LIGHT';

-- CreateIndex
CREATE INDEX "artworks_user_id_status_idx" ON "artworks"("user_id", "status");

-- CreateIndex
CREATE INDEX "artworks_design_id_idx" ON "artworks"("design_id");

-- CreateIndex
CREATE INDEX "designs_category_idx" ON "designs"("category");
