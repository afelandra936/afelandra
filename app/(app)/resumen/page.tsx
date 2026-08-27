import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { toNumber } from "@/lib/format";
import { serialize } from "@/lib/serialize";
import { ResumenView } from "./ResumenView";

export default async function ResumenPage() {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [ventasHoy, ventasMes, gastosMes, config, coeficientesMarca, marcasProductos] = await Promise.all([
    prisma.venta.findMany({ where: { fecha: { gte: inicioHoy } }, include: { pagos: true } }),
    prisma.venta.findMany({ where: { fecha: { gte: inicioMes } } }),
    prisma.gasto.findMany({ where: { fecha: { gte: inicioMes } } }),
    getConfig(),
    prisma.coeficienteMarca.findMany({ orderBy: { marca: "asc" } }),
    prisma.producto.findMany({ distinct: ["marca"], select: { marca: true }, where: { marca: { not: "" } } }),
  ]);

  const facturacionHoy = ventasHoy.reduce((acc, v) => acc + toNumber(v.precioVenta) * v.cantidad, 0);
  const facturacionMes = ventasMes.reduce((acc, v) => acc + toNumber(v.precioVenta) * v.cantidad, 0);
  const costoMercaderiaMes = ventasMes.reduce((acc, v) => acc + toNumber(v.costoUnitario) * v.cantidad, 0);
  const gastosMesTotal = gastosMes.reduce((acc, g) => acc + toNumber(g.monto), 0);
  const gananciaEstimadaMes = facturacionMes - costoMercaderiaMes - gastosMesTotal;
  const ticketPromedioMes = ventasMes.length > 0 ? facturacionMes / ventasMes.length : 0;

  const efectivoPorSucursal = new Map<string, number>();
  for (const v of ventasHoy) {
    for (const pago of v.pagos) {
      if (pago.medio !== "Efectivo") continue;
      const key = v.sucursal || "Sin sucursal";
      efectivoPorSucursal.set(key, (efectivoPorSucursal.get(key) ?? 0) + toNumber(pago.monto));
    }
  }

  return (
    <ResumenView
      metrics={{ facturacionHoy, facturacionMes, gananciaEstimadaMes, ticketPromedioMes }}
      efectivoPorSucursal={[...efectivoPorSucursal.entries()].map(([label, value]) => ({ label, value }))}
      config={serialize(config)}
      coeficientesMarca={serialize(coeficientesMarca)}
      marcasProductos={[...new Set(marcasProductos.map((p) => p.marca.trim()))].sort((a, b) => a.localeCompare(b, "es"))}
    />
  );
}
