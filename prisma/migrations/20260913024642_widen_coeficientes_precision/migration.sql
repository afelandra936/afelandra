-- Amplía la precisión de los coeficientes de 2 a 3 decimales, para poder guardar
-- valores exactos como 1.785 o 2.415 (antes se redondeaban a 1.79 / 2.42).

-- AlterTable: Config
ALTER TABLE "Config" ALTER COLUMN "debito" SET DATA TYPE DECIMAL(6,3);
ALTER TABLE "Config" ALTER COLUMN "transferencia" SET DATA TYPE DECIMAL(6,3);
ALTER TABLE "Config" ALTER COLUMN "credito3" SET DATA TYPE DECIMAL(6,3);
ALTER TABLE "Config" ALTER COLUMN "credito6" SET DATA TYPE DECIMAL(6,3);
ALTER TABLE "Config" ALTER COLUMN "contado" SET DATA TYPE DECIMAL(6,3);

-- AlterTable: CoeficienteMarca
ALTER TABLE "CoeficienteMarca" ALTER COLUMN "debito" SET DATA TYPE DECIMAL(6,3);
ALTER TABLE "CoeficienteMarca" ALTER COLUMN "transferencia" SET DATA TYPE DECIMAL(6,3);
ALTER TABLE "CoeficienteMarca" ALTER COLUMN "credito3" SET DATA TYPE DECIMAL(6,3);
ALTER TABLE "CoeficienteMarca" ALTER COLUMN "credito6" SET DATA TYPE DECIMAL(6,3);
ALTER TABLE "CoeficienteMarca" ALTER COLUMN "contado" SET DATA TYPE DECIMAL(6,3);

-- Corrige los valores de AFEindumentaria que habían quedado redondeados a 2
-- decimales por la limitación anterior (1.79 -> 1.785, 2.42 -> 2.415).
UPDATE "CoeficienteMarca"
SET "transferencia" = 1.785, "credito6" = 2.415
WHERE "marca" = 'AFEindumentaria';
