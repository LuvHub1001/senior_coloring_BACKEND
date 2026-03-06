-- AlterTable
ALTER TABLE "users" ADD COLUMN     "selected_theme_id" INTEGER;

-- CreateTable
CREATE TABLE "themes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "required_artworks" INTEGER NOT NULL DEFAULT 0,
    "gradient_start" TEXT NOT NULL,
    "gradient_end" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "themes_name_key" ON "themes"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_selected_theme_id_fkey" FOREIGN KEY ("selected_theme_id") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
