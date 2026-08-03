import { prisma } from "@/lib/prisma";
import type { CoeficientesPorMarca } from "@/lib/pricing";

/** La configuración vive en una única fila (id=1). La crea con defaults si no existe. */
export async function getConfig() {
  const existing = await prisma.config.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.config.create({ data: { id: 1 } });
}

/** Coeficientes propios por marca, para las que no tienen fila se usan los generales. */
export async function getCoeficientesPorMarca(): Promise<CoeficientesPorMarca> {
  const filas = await prisma.coeficienteMarca.findMany();
  const resultado: CoeficientesPorMarca = {};
  for (const f of filas) {
    resultado[f.marca] = { debito: f.debito, credito3: f.credito3, credito6: f.credito6, contado: f.contado };
  }
  return resultado;
}
