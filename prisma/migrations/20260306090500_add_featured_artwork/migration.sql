-- AlterTable
ALTER TABLE "users" ADD COLUMN "featured_artwork_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_featured_artwork_id_key" ON "users"("featured_artwork_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_featured_artwork_id_fkey" FOREIGN KEY ("featured_artwork_id") REFERENCES "artworks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
