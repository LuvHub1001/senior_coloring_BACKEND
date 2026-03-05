/*
  Warnings:

  - The primary key for the `designs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `designs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `design_id` on the `artworks` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "artworks" DROP CONSTRAINT "artworks_design_id_fkey";

-- AlterTable
ALTER TABLE "artworks" DROP COLUMN "design_id",
ADD COLUMN     "design_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "designs" DROP CONSTRAINT "designs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "designs_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "designs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
