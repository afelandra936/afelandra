import { prisma } from "@/lib/prisma";
import { calcularDeuda, montoConIva } from "@/lib/suppliers";
import { serialize } from "@/lib/serialize";
import { getConfig } from "@/lib/config";
import { ProveedoresView } from "./ProveedoresView";

export default async function ProveedoresPage() {
  const [proveedores, config, productos] = await Promise.all([
    prisma.proveedor.findMany({
      include: {
        remitos: { include: { items: true }, orderBy: { fecha: "desc" } },
        pagos: { orderBy: { fecha: "desc" } },
      },
      orderBy: { nombre: "asc" },
    }),
    getConfig(),
    prisma.producto.findMany({ select: { marca: true } }),
  ]);

  const marcasProductos = [...new Set(productos.map((p) => p.marca.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es")
  );

  const conTotales = proveedores.map((p) => ({
    ...p,
    facturado: p.remitos.reduce((acc, r) => acc + montoConIva(r), 0) + Number(p.deudaInicial),
    debe: calcularDeuda(p.remitos, p.pagos, p.deudaInicial),
  }));

  const chartFacturado = [...conTotales]
    .sort((a, b) => b.facturado - a.facturado)
    .map((p) => ({ label: p.nombre, value: p.facturado }));
  const chartDeuda = [...conTotales]
    .sort((a, b) => b.debe - a.debe)
    .map((p) => ({ label: p.nombre, value: p.debe }));

  return (
    <ProveedoresView
      proveedores={serialize(conTotales)}
      chartFacturado={chartFacturado}
      chartDeuda={chartDeuda}
      tiposCalzado={config.tiposCalzado}
      tiposAccesorio={config.tiposAccesorio}
      marcasProductos={marcasProductos}
    />
  );
}
