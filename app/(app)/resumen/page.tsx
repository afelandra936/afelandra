import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { toNumber } from "@/lib/format";
import { serialize } from "@/lib/serialize";
import { MEDIOS } from "@/lib/pricing";
import { listarAuditoria } from "@/lib/actions/auditoria";
import { ResumenView } from "./ResumenView";

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<{ caja?: string }>;
}) {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const { caja } = await searchParams;
  const fechaCaja = caja || inicioHoy.toISOString().slice(0, 10);
  const inicioCaja = new Date(`${fechaCaja}T00:00:00`);
  const finCaja = new Date(`${fechaCaja}T23:59:59.999`);

  const [
    ventasHoy,
    ventasMes,
    gastosMes,
    config,
    coeficientesMarca,
    marcasProductos,
    vouchersHoy,
    ventasCaja,
    vouchersCaja,
    movimientosCaja,
    auditoria,
  ] = await Promise.all([
    prisma.venta.findMany({ where: { fecha: { gte: inicioHoy } }, include: { pagos: true } }),
    prisma.venta.findMany({ where: { fecha: { gte: inicioMes } } }),
    prisma.gasto.findMany({ where: { fecha: { gte: inicioMes } } }),
    getConfig(),
    prisma.coeficienteMarca.findMany({ orderBy: { marca: "asc" } }),
    prisma.producto.findMany({ distinct: ["marca"], select: { marca: true }, where: { marca: { not: "" } } }),
    prisma.voucher.findMany({ where: { fecha: { gte: inicioHoy } } }),
    prisma.venta.findMany({ where: { fecha: { gte: inicioCaja, lte: finCaja } }, include: { pagos: true } }),
    prisma.voucher.findMany({ where: { fecha: { gte: inicioCaja, lte: finCaja } } }),
    prisma.movimientoCaja.findMany({ where: { fecha: { gte: inicioCaja, lte: finCaja } }, orderBy: { createdAt: "desc" } }),
    listarAuditoria(),
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

  // Cierre de caja del día elegido: total por medio de pago, sumando también la parte
  // que le corresponde a cada medio en las ventas que se pagaron divididas entre varios.
  // Los pagos con voucher NO suman acá (esa plata ya entró el día que se vendió el
  // voucher); en cambio, vender un voucher ese día sí es plata nueva, así que se suma
  // por el medio con el que se cobró el voucher. Los movimientos manuales de caja
  // (ingreso/retiro de efectivo que no es una venta) ajustan el Efectivo final.
  const cierreCajaDia = new Map<string, number>(MEDIOS.map((m) => [m, 0]));
  let voucherRedimidoCaja = 0;
  for (const v of ventasCaja) {
    for (const pago of v.pagos) {
      if (pago.medio === "Voucher") {
        voucherRedimidoCaja += toNumber(pago.monto);
        continue;
      }
      cierreCajaDia.set(pago.medio, (cierreCajaDia.get(pago.medio) ?? 0) + toNumber(pago.monto));
    }
  }
  for (const v of vouchersCaja) {
    cierreCajaDia.set(v.medioPago, (cierreCajaDia.get(v.medioPago) ?? 0) + toNumber(v.montoInicial));
  }
  let ajusteManual = 0;
  for (const m of movimientosCaja) {
    ajusteManual += m.tipo === "ingreso" ? toNumber(m.monto) : -toNumber(m.monto);
  }
  cierreCajaDia.set("Efectivo", (cierreCajaDia.get("Efectivo") ?? 0) + ajusteManual);
  const cierreCajaTotal = [...cierreCajaDia.values()].reduce((acc, v) => acc + v, 0);

  return (
    <ResumenView
      metrics={{ facturacionHoy, facturacionMes, gananciaEstimadaMes, ticketPromedioMes }}
      efectivoPorSucursal={[...efectivoPorSucursal.entries()].map(([label, value]) => ({ label, value }))}
      config={serialize(config)}
      coeficientesMarca={serialize(coeficientesMarca)}
      marcasProductos={[...new Set(marcasProductos.map((p) => p.marca.trim()))].sort((a, b) => a.localeCompare(b, "es"))}
      cierreCaja={{
        porMedio: MEDIOS.map((m) => ({ medio: m, monto: cierreCajaDia.get(m) ?? 0 })),
        total: cierreCajaTotal,
        voucherRedimidoHoy: voucherRedimidoCaja,
      }}
      fechaCaja={fechaCaja}
      movimientosCaja={serialize(
        movimientosCaja.map((m) => ({ id: m.id, fecha: m.fecha.toISOString(), tipo: m.tipo, monto: m.monto, motivo: m.motivo }))
      )}
      auditoria={auditoria}
    />
  );
}
