-- CreateTable
CREATE TABLE "artwork_reports" (
    "id" TEXT NOT NULL,
    "artwork_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artwork_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artwork_reports_artwork_id_idx" ON "artwork_reports"("artwork_id");

-- CreateIndex
CREATE UNIQUE INDEX "artwork_reports_artwork_id_reporter_id_key" ON "artwork_reports"("artwork_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "artwork_reports" ADD CONSTRAINT "artwork_reports_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artwork_reports" ADD CONSTRAINT "artwork_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
