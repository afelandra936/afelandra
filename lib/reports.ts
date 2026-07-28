import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

export type ChartEntry = { label: string; value: number };

function topN(map: Map<string, number>, n: number): ChartEntry[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}

export async function getVentasCharts() {
  const ventas = await prisma.venta.findMany({
    select: {
      nombre: true,
      proveedor: true,
      vendedor: true,
      cantidad: true,
      precioVenta: true,
      pagos: { select: { medio: true, monto: true } },
    },
  });

  const porProducto = new Map<string, number>();
  const porProveedor = new Map<string, number>();
  const porVendedor = new Map<string, number>();
  const porMedio = new Map<string, number>();

  for (const v of ventas) {
    porProducto.set(v.nombre, (porProducto.get(v.nombre) ?? 0) + v.cantidad);
    if (v.proveedor) porProveedor.set(v.proveedor, (porProveedor.get(v.proveedor) ?? 0) + v.cantidad);
    const total = toNumber(v.precioVenta) * v.cantidad;
    porVendedor.set(v.vendedor, (porVendedor.get(v.vendedor) ?? 0) + total);
    for (const pago of v.pagos) {
      porMedio.set(pago.medio, (porMedio.get(pago.medio) ?? 0) + toNumber(pago.monto));
    }
  }

  return {
    topProductos: topN(porProducto, 6),
    topProveedores: topN(porProveedor, 6),
    medios: topN(porMedio, 8),
    vendedores: topN(porVendedor, 8),
  };
}

export async function getRentabilidad(dias: number | null) {
  const where = dias ? { fecha: { gte: new Date(Date.now() - dias * 24 * 60 * 60 * 1000) } } : {};
  const ventas = await prisma.venta.findMany({
    where,
    select: { nombre: true, proveedor: true, cantidad: true, precioVenta: true, costoUnitario: true },
  });

  let ventasTotales = 0;
  let costoMercaderia = 0;
  const porProducto = new Map<string, number>();
  const porProveedor = new Map<string, number>();

  for (const v of ventas) {
    const precioVenta = toNumber(v.precioVenta);
    const costoUnitario = toNumber(v.costoUnitario);
    const ingreso = precioVenta * v.cantidad;
    const costo = costoUnitario * v.cantidad;
    const ganancia = ingreso - costo;

    ventasTotales += ingreso;
    costoMercaderia += costo;
    porProducto.set(v.nombre, (porProducto.get(v.nombre) ?? 0) + ganancia);
    if (v.proveedor) porProveedor.set(v.proveedor, (porProveedor.get(v.proveedor) ?? 0) + ganancia);
  }

  const ganancia = ventasTotales - costoMercaderia;
  const margen = ventasTotales > 0 ? (ganancia / ventasTotales) * 100 : 0;

  return {
    ventasTotales,
    costoMercaderia,
    ganancia,
    margen,
    porProducto: [...porProducto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value })),
    porProveedor: [...porProveedor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value })),
  };
}
