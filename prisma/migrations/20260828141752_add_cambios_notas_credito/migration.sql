-- AlterTable
ALTER TABLE "PagoVenta" ADD COLUMN     "notaCreditoId" TEXT;

-- CreateTable
CREATE TABLE "Cambio" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT NOT NULL,
    "productoDevueltoId" TEXT NOT NULL,
    "nombreDevuelto" TEXT NOT NULL,
    "talleDevuelto" TEXT NOT NULL,
    "precioDevuelto" DECIMAL(12,2) NOT NULL,
    "productoNuevoId" TEXT NOT NULL,
    "nombreNuevo" TEXT NOT NULL,
    "talleNuevo" TEXT NOT NULL,
    "precioNuevo" DECIMAL(12,2) NOT NULL,
    "diferencia" DECIMAL(12,2) NOT NULL,
    "ventaId" TEXT,
    "notaCreditoId" TEXT,
    "vendedor" TEXT NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaCredito" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "montoInicial" DECIMAL(12,2) NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL,
    "vendedor" TEXT NOT NULL,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaCredito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cambio_ventaId_key" ON "Cambio"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "Cambio_notaCreditoId_key" ON "Cambio"("notaCreditoId");

-- CreateIndex
CREATE INDEX "Cambio_clienteId_idx" ON "Cambio"("clienteId");

-- CreateIndex
CREATE INDEX "Cambio_fecha_idx" ON "Cambio"("fecha");

-- CreateIndex
CREATE INDEX "NotaCredito_clienteId_idx" ON "NotaCredito"("clienteId");

-- CreateIndex
CREATE INDEX "NotaCredito_fecha_idx" ON "NotaCredito"("fecha");

-- CreateIndex
CREATE INDEX "PagoVenta_notaCreditoId_idx" ON "PagoVenta"("notaCreditoId");

-- AddForeignKey
ALTER TABLE "PagoVenta" ADD CONSTRAINT "PagoVenta_notaCreditoId_fkey" FOREIGN KEY ("notaCreditoId") REFERENCES "NotaCredito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cambio" ADD CONSTRAINT "Cambio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cambio" ADD CONSTRAINT "Cambio_productoDevueltoId_fkey" FOREIGN KEY ("productoDevueltoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cambio" ADD CONSTRAINT "Cambio_productoNuevoId_fkey" FOREIGN KEY ("productoNuevoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cambio" ADD CONSTRAINT "Cambio_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cambio" ADD CONSTRAINT "Cambio_notaCreditoId_fkey" FOREIGN KEY ("notaCreditoId") REFERENCES "NotaCredito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaCredito" ADD CONSTRAINT "NotaCredito_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
