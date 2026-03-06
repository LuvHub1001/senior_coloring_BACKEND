/*
  Warnings:

  - You are about to drop the column `gradient_end` on the `themes` table. All the data in the column will be lost.
  - You are about to drop the column `gradient_start` on the `themes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "themes" DROP COLUMN "gradient_end",
DROP COLUMN "gradient_start",
ADD COLUMN     "image_url" TEXT;
