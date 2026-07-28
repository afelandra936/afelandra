import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { getVentasCharts } from "@/lib/reports";
import { serialize } from "@/lib/serialize";
import { VentasView } from "./VentasView";

export default async function VentasPage() {
  const session = await getSession();

  const [productos, ventas, clientes, config, charts] = await Promise.all([
    prisma.producto.findMany({ orderBy: [{ nombre: "asc" }, { talle: "asc" }] }),
    prisma.venta.findMany({ orderBy: { fecha: "desc" }, take: 50, include: { pagos: true } }),
    prisma.cliente.findMany({ select: { nombre: true }, orderBy: { nombre: "asc" } }),
    getConfig(),
    session!.role === "admin" ? getVentasCharts() : Promise.resolve(null),
  ]);

  return (
    <VentasView
      role={session!.role}
      productos={serialize(productos)}
      ventas={serialize(ventas)}
      clientesNombres={clientes.map((c) => c.nombre)}
      config={serialize(config)}
      charts={charts}
    />
  );
}
