-- AlterTable
ALTER TABLE "PagoVenta" ADD COLUMN     "voucherId" TEXT;

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "montoInicial" DECIMAL(12,2) NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL,
    "medioPago" TEXT NOT NULL,
    "vendedor" TEXT NOT NULL,
    "clienteNombre" TEXT,
    "observaciones" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_codigo_key" ON "Voucher"("codigo");

-- CreateIndex
CREATE INDEX "Voucher_codigo_idx" ON "Voucher"("codigo");

-- CreateIndex
CREATE INDEX "Voucher_fecha_idx" ON "Voucher"("fecha");

-- CreateIndex
CREATE INDEX "PagoVenta_voucherId_idx" ON "PagoVenta"("voucherId");

-- AddForeignKey
ALTER TABLE "PagoVenta" ADD CONSTRAINT "PagoVenta_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
