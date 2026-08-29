/*
  Warnings:

  - A unique constraint covering the columns `[codigo]` on the table `NotaCredito` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `codigo` to the `NotaCredito` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NotaCredito" ADD COLUMN     "codigo" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "NotaCredito_codigo_key" ON "NotaCredito"("codigo");

-- CreateIndex
CREATE INDEX "NotaCredito_codigo_idx" ON "NotaCredito"("codigo");
