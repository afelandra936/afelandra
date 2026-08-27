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

  const marcasProductos = [...new Set(productos.map((p) => p.marca.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  return (
    <StockView
      role={session!.role}
      productos={serialize(productos)}
      tiposCalzado={config.tiposCalzado}
      tiposAccesorio={config.tiposAccesorio}
      tallesCalzado={config.talles}
      tallesIndumentaria={config.tallesIndumentaria}
      tallesJeans={config.tallesJeans}
      proveedoresNombres={proveedores.map((p) => p.nombre)}
      marcasProductos={marcasProductos}
      sinMovimientoIds={sinMovimiento.map((p) => p.id)}
    />
  );
}
