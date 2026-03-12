-- AlterTable
ALTER TABLE "artworks" ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "gallery_likes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "artwork_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gallery_likes_artwork_id_idx" ON "gallery_likes"("artwork_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_likes_user_id_artwork_id_key" ON "gallery_likes"("user_id", "artwork_id");

-- CreateIndex
CREATE INDEX "artworks_status_like_count_idx" ON "artworks"("status", "like_count");

-- AddForeignKey
ALTER TABLE "gallery_likes" ADD CONSTRAINT "gallery_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_likes" ADD CONSTRAINT "gallery_likes_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
