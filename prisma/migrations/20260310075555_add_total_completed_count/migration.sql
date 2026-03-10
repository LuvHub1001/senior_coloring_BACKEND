-- AlterTable
ALTER TABLE "users" ADD COLUMN     "total_completed_count" INTEGER NOT NULL DEFAULT 0;

-- 기존 유저의 누적 완성 작품 수 초기화
UPDATE "users" u
SET "total_completed_count" = (
  SELECT COUNT(*)
  FROM "artworks" a
  WHERE a."user_id" = u."id" AND a."status" = 'COMPLETED'
);
