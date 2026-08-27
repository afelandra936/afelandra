import { prisma } from "@/lib/prisma";
import { getConfig, getCoeficientesPorMarca } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { getVentasCharts } from "@/lib/reports";
import { serialize } from "@/lib/serialize";
import { VentasView } from "./VentasView";

export default async function VentasPage() {
  const session = await getSession();
  const hoy = new Date();

  const [ventas, clientes, config, coeficientesPorMarca, charts, promociones] = await Promise.all([
    prisma.venta.findMany({ orderBy: { fecha: "desc" }, take: 50, include: { pagos: true } }),
    prisma.cliente.findMany({ select: { nombre: true }, orderBy: { nombre: "asc" } }),
    getConfig(),
    getCoeficientesPorMarca(),
    session!.role === "admin" ? getVentasCharts() : Promise.resolve(null),
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

  return (
    <VentasView
      role={session!.role}
      ventas={serialize(ventas)}
      clientesNombres={clientes.map((c) => c.nombre)}
      vendedoresNombres={config.vendedores}
      config={serialize(config)}
      coeficientesPorMarca={serialize(coeficientesPorMarca)}
      charts={charts}
      promociones={serialize(promociones)}
    />
  );
}
