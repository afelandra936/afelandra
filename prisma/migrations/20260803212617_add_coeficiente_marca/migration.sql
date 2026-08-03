-- CreateTable
CREATE TABLE "CoeficienteMarca" (
    "id" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "debito" DECIMAL(6,2) NOT NULL,
    "credito3" DECIMAL(6,2) NOT NULL,
    "credito6" DECIMAL(6,2) NOT NULL,
    "contado" DECIMAL(6,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoeficienteMarca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoeficienteMarca_marca_key" ON "CoeficienteMarca"("marca");
