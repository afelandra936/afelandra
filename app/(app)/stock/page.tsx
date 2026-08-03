import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { productosSinMovimiento } from "@/lib/queries/stock";
import { serialize } from "@/lib/serialize";
import { StockView } from "./StockView";

export default async function StockPage() {
  const [productos, config, session, sinMovimiento, proveedores] = await Promise.all([
    prisma.producto.findMany({
      include: { proveedor: { select: { id: true, nombre: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getConfig(),
    getSession(),
    productosSinMovimiento(30),
    prisma.proveedor.findMany({ select: { nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <StockView
      role={session!.role}
      productos={serialize(productos)}
      tiposCalzado={config.tiposCalzado}
      tiposAccesorio={config.tiposAccesorio}
      tallesCalzado={config.talles}
      tallesIndumentaria={config.tallesIndumentaria}
      proveedoresNombres={proveedores.map((p) => p.nombre)}
      sinMovimientoIds={sinMovimiento.map((p) => p.id)}
    />
  );
}
