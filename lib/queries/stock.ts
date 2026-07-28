import "server-only";
import { prisma } from "@/lib/prisma";

/** IDs de producto con stock > 0 que no tuvieron ninguna venta en los últimos `dias` días. */
export async function productosSinMovimiento(dias = 30) {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const [conStock, ventasRecientes] = await Promise.all([
    prisma.producto.findMany({ where: { stock: { gt: 0 } } }),
    prisma.venta.findMany({
      where: { fecha: { gte: desde } },
      select: { productoId: true },
      distinct: ["productoId"],
    }),
  ]);

  const vendidosIds = new Set(ventasRecientes.map((v) => v.productoId));
  return conStock.filter((p) => !vendidosIds.has(p.id));
}
