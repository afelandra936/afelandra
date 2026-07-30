import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { serialize } from "@/lib/serialize";
import { PresupuestosView } from "./PresupuestosView";

export default async function PresupuestosPage() {
  const hoy = new Date();

  const [config, promociones] = await Promise.all([
    getConfig(),
    prisma.promocion.findMany({
      where: {
        activa: true,
        AND: [
          { OR: [{ fechaDesde: null }, { fechaDesde: { lte: hoy } }] },
          { OR: [{ fechaHasta: null }, { fechaHasta: { gte: hoy } }] },
        ],
      },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return <PresupuestosView config={serialize(config)} promociones={serialize(promociones)} />;
}
