/*
  Warnings:

  - Added the required column `medioPago` to the `Cambio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medioPago` to the `NotaCredito` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cambio" ADD COLUMN     "medioPago" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "NotaCredito" ADD COLUMN     "medioPago" TEXT NOT NULL;
