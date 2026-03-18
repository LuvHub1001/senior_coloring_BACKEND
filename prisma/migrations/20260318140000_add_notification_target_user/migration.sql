-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "target_user_id" TEXT;

-- 기존 데이터에 빈 값 채우기 (없을 수 있으나 안전장치)
UPDATE "notifications" SET "target_user_id" = "user_id" WHERE "target_user_id" IS NULL;

-- NOT NULL 제약 추가
ALTER TABLE "notifications" ALTER COLUMN "target_user_id" SET NOT NULL;
