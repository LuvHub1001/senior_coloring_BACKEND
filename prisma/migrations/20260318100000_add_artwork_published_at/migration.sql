-- AlterTable
ALTER TABLE "artworks" ADD COLUMN "published_at" TIMESTAMP(3);

-- 기존 공개 작품의 published_at을 updated_at으로 초기화
UPDATE "artworks" SET "published_at" = "updated_at" WHERE "is_public" = true;

-- DropIndex (기존 createdAt 기반 인덱스 교체)
DROP INDEX IF EXISTS "artworks_status_is_public_created_at_idx";

-- CreateIndex
CREATE INDEX "artworks_status_is_public_published_at_idx" ON "artworks"("status", "is_public", "published_at");
