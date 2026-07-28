import { prisma } from "@/lib/prisma";

/** La configuración vive en una única fila (id=1). La crea con defaults si no existe. */
export async function getConfig() {
  const existing = await prisma.config.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.config.create({ data: { id: 1 } });
}
