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

const MEDIOS_COMISION = new Set(["Efectivo", "Transferencia"]);

export type ComisionVendedor = { vendedor: string; totalComision: number; totalGeneral: number };

/** Vendido por cada vendedor, separando lo cobrado en efectivo/transferencia (base de comisión) del resto. */
export async function getComisionesVendedores(dias: number | null): Promise<ComisionVendedor[]> {
  const where = dias ? { fecha: { gte: new Date(Date.now() - dias * 24 * 60 * 60 * 1000) } } : {};
  const ventas = await prisma.venta.findMany({
    where,
    select: { vendedor: true, cantidad: true, precioVenta: true, pagos: { select: { medio: true, monto: true } } },
  });

  const porVendedor = new Map<string, ComisionVendedor>();
  for (const v of ventas) {
    const entry = porVendedor.get(v.vendedor) ?? { vendedor: v.vendedor, totalComision: 0, totalGeneral: 0 };
    entry.totalGeneral += toNumber(v.precioVenta) * v.cantidad;
    for (const pago of v.pagos) {
      if (MEDIOS_COMISION.has(pago.medio)) entry.totalComision += toNumber(pago.monto);
    }
    porVendedor.set(v.vendedor, entry);
  }

  return [...porVendedor.values()].sort((a, b) => b.totalComision - a.totalComision);
}

export type VentaPorDia = { fecha: string; porMedio: Record<string, number>; total: number };

/** Total vendido por día, desglosado por medio de pago (incluye la parte de cada medio en ventas divididas). */
export async function getVentasPorDia(dias: number | null): Promise<VentaPorDia[]> {
  const where = dias ? { fecha: { gte: new Date(Date.now() - dias * 24 * 60 * 60 * 1000) } } : {};
  const ventas = await prisma.venta.findMany({
    where,
    select: { fecha: true, pagos: { select: { medio: true, monto: true } } },
  });

  const porDia = new Map<string, Record<string, number>>();
  for (const v of ventas) {
    const key = v.fecha.toISOString().slice(0, 10);
    const entry = porDia.get(key) ?? {};
    for (const pago of v.pagos) {
      entry[pago.medio] = (entry[pago.medio] ?? 0) + toNumber(pago.monto);
    }
    porDia.set(key, entry);
  }

  return [...porDia.entries()]
    .map(([fecha, porMedio]) => ({
      fecha,
      porMedio,
      total: Object.values(porMedio).reduce((acc, v) => acc + v, 0),
    }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}
