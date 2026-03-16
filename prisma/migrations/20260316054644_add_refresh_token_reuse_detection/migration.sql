-- AlterTable: family 컬럼 추가 (기존 행에 UUID 기본값 할당)
ALTER TABLE "refresh_tokens" ADD COLUMN "family" TEXT;
UPDATE "refresh_tokens" SET "family" = gen_random_uuid()::text WHERE "family" IS NULL;
ALTER TABLE "refresh_tokens" ALTER COLUMN "family" SET NOT NULL;
ALTER TABLE "refresh_tokens" ALTER COLUMN "family" SET DEFAULT gen_random_uuid()::text;

-- AlterTable: usedAt 컬럼 추가 (nullable)
ALTER TABLE "refresh_tokens" ADD COLUMN "used_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");
