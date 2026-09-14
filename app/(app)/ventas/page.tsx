import { prisma } from "@/lib/prisma";
import { getConfig, getCoeficientesPorMarca } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { getVentasCharts } from "@/lib/reports";
import { serialize } from "@/lib/serialize";
import { VentasView } from "./VentasView";

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const session = await getSession();
  const hoy = new Date();
  const { desde, hasta } = await searchParams;
  const hayFiltro = Boolean(desde || hasta);

  const [ventas, clientes, config, coeficientesPorMarca, charts, promociones] = await Promise.all([
    prisma.venta.findMany({
      where: hayFiltro
        ? {
            fecha: {
              ...(desde ? { gte: new Date(`${desde}T00:00:00`) } : {}),
              ...(hasta ? { lte: new Date(`${hasta}T23:59:59.999`) } : {}),
            },
          }
        : {},
      orderBy: { createdAt: "desc" },
      take: hayFiltro ? 1000 : 50,
      include: { pagos: true, producto: { select: { observaciones: true } } },
    }),
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

  const ventasConObs = ventas.map((v) => ({ ...v, productoObservaciones: v.producto.observaciones }));

  return (
    <VentasView
      role={session!.role}
      ventas={serialize(ventasConObs)}
      clientesNombres={clientes.map((c) => c.nombre)}
      vendedoresNombres={config.vendedores}
      config={serialize(config)}
      coeficientesPorMarca={serialize(coeficientesPorMarca)}
      charts={charts}
      promociones={serialize(promociones)}
      desde={desde ?? ""}
      hasta={hasta ?? ""}
    />
  );
}
