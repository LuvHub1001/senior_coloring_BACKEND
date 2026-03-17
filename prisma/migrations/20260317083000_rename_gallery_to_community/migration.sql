-- RenameTable
ALTER TABLE "gallery_likes" RENAME TO "community_likes";

-- RenameIndex
ALTER INDEX "gallery_likes_pkey" RENAME TO "community_likes_pkey";
ALTER INDEX "gallery_likes_user_id_artwork_id_key" RENAME TO "community_likes_user_id_artwork_id_key";
ALTER INDEX "gallery_likes_artwork_id_idx" RENAME TO "community_likes_artwork_id_idx";
ALTER INDEX "gallery_likes_created_at_idx" RENAME TO "community_likes_created_at_idx";

-- RenameForeignKey
ALTER TABLE "community_likes" RENAME CONSTRAINT "gallery_likes_user_id_fkey" TO "community_likes_user_id_fkey";
ALTER TABLE "community_likes" RENAME CONSTRAINT "gallery_likes_artwork_id_fkey" TO "community_likes_artwork_id_fkey";
