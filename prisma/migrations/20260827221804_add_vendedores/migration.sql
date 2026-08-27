-- AlterTable
ALTER TABLE "Config" ADD COLUMN     "vendedores" TEXT[] DEFAULT ARRAY[]::TEXT[];
