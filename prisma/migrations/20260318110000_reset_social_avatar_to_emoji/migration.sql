-- 소셜 프로필 이미지(http URL)를 기본 이모지로 변환
UPDATE "users" SET "avatar_url" = '🐶' WHERE "avatar_url" LIKE 'http%';
