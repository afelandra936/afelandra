-- CreateTable
CREATE TABLE "RemitoItem" (
    "id" TEXT NOT NULL,
    "remitoId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "talle" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoUnitario" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemitoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RemitoItem_remitoId_idx" ON "RemitoItem"("remitoId");

-- CreateIndex
CREATE INDEX "RemitoItem_productoId_idx" ON "RemitoItem"("productoId");

-- AddForeignKey
ALTER TABLE "RemitoItem" ADD CONSTRAINT "RemitoItem_remitoId_fkey" FOREIGN KEY ("remitoId") REFERENCES "Remito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemitoItem" ADD CONSTRAINT "RemitoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
