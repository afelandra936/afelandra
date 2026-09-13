-- Separa "Débito / Transferencia" en dos campos independientes.
-- Se agregan como nullable, se rellenan con el valor de "debito" (así ninguna
-- marca cambia de comportamiento salvo que se edite explícitamente), y recién
-- después se marcan NOT NULL.

-- AlterTable: Config
ALTER TABLE "Config" ADD COLUMN "transferencia" DECIMAL(6,2);
UPDATE "Config" SET "transferencia" = "debito";
ALTER TABLE "Config" ALTER COLUMN "transferencia" SET NOT NULL;
ALTER TABLE "Config" ALTER COLUMN "transferencia" SET DEFAULT 2.20;

-- AlterTable: CoeficienteMarca
ALTER TABLE "CoeficienteMarca" ADD COLUMN "transferencia" DECIMAL(6,2);
UPDATE "CoeficienteMarca" SET "transferencia" = "debito";
ALTER TABLE "CoeficienteMarca" ALTER COLUMN "transferencia" SET NOT NULL;

-- Corrección puntual pedida por el usuario: coeficientes exactos de AFEindumentaria,
-- ahora que Débito y Transferencia son independientes.
UPDATE "CoeficienteMarca"
SET "debito" = 1.89, "transferencia" = 1.785, "credito3" = 2.10, "credito6" = 2.415, "contado" = 11.11
WHERE "marca" = 'AFEindumentaria';
