-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'gadgets',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");
