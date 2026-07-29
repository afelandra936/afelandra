-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "promocionId" TEXT,
ADD COLUMN     "promocionNombre" TEXT;

-- CreateTable
CREATE TABLE "Promocion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valorPorcentaje" DECIMAL(5,2),
    "fechaDesde" TIMESTAMP(3),
    "fechaHasta" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promocion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Venta_promocionId_idx" ON "Venta"("promocionId");

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "Promocion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
