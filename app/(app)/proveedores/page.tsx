import { prisma } from "@/lib/prisma";
import { calcularDeuda, montoConIva } from "@/lib/suppliers";
import { serialize } from "@/lib/serialize";
import { ProveedoresView } from "./ProveedoresView";

export default async function ProveedoresPage() {
  const proveedores = await prisma.proveedor.findMany({
    include: {
      remitos: { orderBy: { fecha: "desc" } },
      pagos: { orderBy: { fecha: "desc" } },
    },
    orderBy: { nombre: "asc" },
  });

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
    />
  );
}
