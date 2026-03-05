-- AlterTable: email을 옵셔널로 변경
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
