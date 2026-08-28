"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getConfig, getCoeficientesPorMarca } from "@/lib/config";
import { precioUnitario, factorPromocion, resolverCoeficientes } from "@/lib/pricing";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";

function revalidateAfterVenta() {
  for (const path of ["/ventas", "/stock", "/resumen", "/rentabilidad", "/clientes", "/vouchers"]) {
    revalidatePath(path);
  }
}

export type PagoInput = { medio: string; monto: number; voucherId?: string; notaCreditoId?: string };

export type ItemCarrito = {
  productoId: string;
  cantidad: number;
  medioPago: string;
  pagos?: PagoInput[]; // si hay más de uno, el pago de este ítem fue dividido
  promocionId?: string;
};

export type RegistrarVentaCarritoInput = {
  fecha: string;
  vendedor: string;
  clienteNombre?: string;
  observaciones?: string;
  sucursal?: string;
  items: ItemCarrito[];
  confirmarPerdida?: boolean;
};

export async function registrarVentaCarrito(
  input: RegistrarVentaCarritoInput
): Promise<{ error?: string; warning?: string } | void> {
  await requireRole("admin", "empleada");

  if (!input.vendedor.trim()) return { error: "El vendedor es obligatorio" };
  if (input.items.length === 0) return { error: "Agregá al menos un producto" };
  for (const item of input.items) {
    if (!(item.cantidad > 0)) return { error: "Cantidad inválida" };
  }

  const config = await getConfig();
  const coeficientesPorMarca = await getCoeficientesPorMarca();

  let clienteId: string | null = null;
  const clienteNombre = input.clienteNombre?.trim() || null;
  if (clienteNombre) {
    const match = await prisma.cliente.findFirst({
      where: { nombre: { equals: clienteNombre, mode: "insensitive" } },
    });
    if (match) clienteId = match.id;
  }

  const hoy = new Date();
  const preparados: {
    data: Prisma.VentaCreateInput;
    productoId: string;
    stockRestante: number;
    pagos: PagoInput[];
  }[] = [];
  const perdidas: string[] = [];

  for (const item of input.items) {
    const producto = await prisma.producto.findUnique({ where: { id: item.productoId } });
    if (!producto) return { error: "Un producto del carrito ya no existe" };
    if (item.cantidad > producto.stock) {
      return {
        error: `No hay suficiente stock de "${producto.nombre}" (talle ${producto.talle || "Único"}): quedan ${producto.stock}`,
      };
    }

    let promocion: { id: string; nombre: string; tipo: string; valorPorcentaje: Prisma.Decimal | null } | null = null;
    if (item.promocionId) {
      const promo = await prisma.promocion.findUnique({ where: { id: item.promocionId } });
      if (!promo) return { error: "Promoción no encontrada" };
      const vigente =
        promo.activa &&
        (!promo.fechaDesde || promo.fechaDesde <= hoy) &&
        (!promo.fechaHasta || promo.fechaHasta >= hoy);
      if (!vigente) return { error: `La promoción de "${producto.nombre}" ya no está vigente` };
      promocion = promo;
    }

    const costoUnitario = Number(producto.costo);
    const factor = factorPromocion(promocion, item.cantidad);
    const coefProducto = resolverCoeficientes(producto.marca, config, coeficientesPorMarca);

    const pagosBase: PagoInput[] =
      item.pagos && item.pagos.length > 0
        ? item.pagos
        : [{ medio: item.medioPago, monto: precioUnitario(costoUnitario, item.medioPago, coefProducto) * item.cantidad }];
    const pagos = pagosBase.map((p) => ({
      medio: p.medio,
      monto: p.monto * factor,
      voucherId: p.voucherId,
      notaCreditoId: p.notaCreditoId,
    }));
    const precioTotal = pagos.reduce((acc, p) => acc + p.monto, 0);
    const precioVentaUnitario = precioTotal / item.cantidad;

    if (precioVentaUnitario < costoUnitario) {
      perdidas.push(`${producto.nombre} (talle ${producto.talle || "Único"})`);
    }

    const proveedorNombre = producto.proveedorId
      ? (await prisma.proveedor.findUnique({ where: { id: producto.proveedorId } }))?.nombre ?? null
      : null;

    const medioPagoFinal = pagos.length > 1 ? "Dividido" : pagos[0].medio;

    preparados.push({
      productoId: producto.id,
      stockRestante: Math.max(0, producto.stock - item.cantidad),
      pagos,
      data: {
        fecha: new Date(`${input.fecha}T12:00:00`),
        producto: { connect: { id: producto.id } },
        nombre: producto.nombre,
        tipo: producto.tipo,
        proveedor: proveedorNombre,
        talle: producto.talle,
        cantidad: item.cantidad,
        medioPago: medioPagoFinal,
        vendedor: input.vendedor.trim(),
        cliente: clienteId ? { connect: { id: clienteId } } : undefined,
        clienteNombre,
        observaciones: input.observaciones?.trim() || null,
        sucursal: input.sucursal?.trim() || null,
        precioVenta: precioVentaUnitario,
        costoUnitario,
        promocion: promocion ? { connect: { id: promocion.id } } : undefined,
        promocionNombre: promocion?.nombre ?? null,
        pagos: {
          create: pagos.map((p) => ({
            medio: p.medio,
            monto: p.monto,
            voucherId: p.voucherId,
            notaCreditoId: p.notaCreditoId,
          })),
        },
      },
    });
  }

  if (perdidas.length > 0 && !input.confirmarPerdida) {
    return {
      warning: `Se venden por debajo del costo: ${perdidas.join(", ")}. ¿Confirmás igual?`,
    };
  }

  // Si algún pago usa un voucher, validar que le quede saldo suficiente (sumando todo lo
  // que este carrito le pide, por si el mismo voucher cubre más de un ítem) y descontarlo.
  const usoPorVoucher = new Map<string, number>();
  for (const p of preparados) {
    for (const pago of p.pagos) {
      if (!pago.voucherId) continue;
      usoPorVoucher.set(pago.voucherId, (usoPorVoucher.get(pago.voucherId) ?? 0) + pago.monto);
    }
  }
  const voucherUpdates: Prisma.PrismaPromise<unknown>[] = [];
  for (const [voucherId, monto] of usoPorVoucher) {
    const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } });
    if (!voucher) return { error: "El voucher usado ya no existe" };
    if (monto > Number(voucher.saldo) + 0.01) {
      return { error: `El voucher "${voucher.codigo}" no tiene saldo suficiente: quedan ${fmtNum(voucher.saldo)}` };
    }
    voucherUpdates.push(
      prisma.voucher.update({ where: { id: voucherId }, data: { saldo: { decrement: monto } } })
    );
  }

  // Mismo control para notas de crédito.
  const usoPorNotaCredito = new Map<string, number>();
  for (const p of preparados) {
    for (const pago of p.pagos) {
      if (!pago.notaCreditoId) continue;
      usoPorNotaCredito.set(pago.notaCreditoId, (usoPorNotaCredito.get(pago.notaCreditoId) ?? 0) + pago.monto);
    }
  }
  const notaCreditoUpdates: Prisma.PrismaPromise<unknown>[] = [];
  for (const [notaCreditoId, monto] of usoPorNotaCredito) {
    const nota = await prisma.notaCredito.findUnique({ where: { id: notaCreditoId } });
    if (!nota) return { error: "La nota de crédito usada ya no existe" };
    if (monto > Number(nota.saldo) + 0.01) {
      return { error: `La nota de crédito no tiene saldo suficiente: quedan ${fmtNum(nota.saldo)}` };
    }
    notaCreditoUpdates.push(
      prisma.notaCredito.update({ where: { id: notaCreditoId }, data: { saldo: { decrement: monto } } })
    );
  }

  await prisma.$transaction([
    ...preparados.map((p) => prisma.venta.create({ data: p.data })),
    ...preparados.map((p) => prisma.producto.update({ where: { id: p.productoId }, data: { stock: p.stockRestante } })),
    ...voucherUpdates,
    ...notaCreditoUpdates,
  ]);

  revalidateAfterVenta();
}

function fmtNum(value: unknown): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value));
}

export async function eliminarVenta(id: string) {
  await requireRole("admin");

  const venta = await prisma.venta.findUnique({ where: { id }, include: { pagos: true } });
  if (!venta) return;

  const cambioAsociado = await prisma.cambio.findUnique({ where: { ventaId: id } });
  if (cambioAsociado) {
    throw new Error("No se puede eliminar: esta venta es la diferencia de un cambio registrado");
  }

  // Si algún pago de esta venta usó un voucher, devolverle ese saldo al borrar la venta.
  const usoPorVoucher = new Map<string, number>();
  for (const pago of venta.pagos) {
    if (!pago.voucherId) continue;
    usoPorVoucher.set(pago.voucherId, (usoPorVoucher.get(pago.voucherId) ?? 0) + Number(pago.monto));
  }
  const voucherRefunds = [...usoPorVoucher.entries()].map(([voucherId, monto]) =>
    prisma.voucher.update({ where: { id: voucherId }, data: { saldo: { increment: monto } } })
  );

  // Igual con notas de crédito.
  const usoPorNotaCredito = new Map<string, number>();
  for (const pago of venta.pagos) {
    if (!pago.notaCreditoId) continue;
    usoPorNotaCredito.set(pago.notaCreditoId, (usoPorNotaCredito.get(pago.notaCreditoId) ?? 0) + Number(pago.monto));
  }
  const notaCreditoRefunds = [...usoPorNotaCredito.entries()].map(([notaCreditoId, monto]) =>
    prisma.notaCredito.update({ where: { id: notaCreditoId }, data: { saldo: { increment: monto } } })
  );

  await prisma.$transaction([
    prisma.producto.update({
      where: { id: venta.productoId },
      data: { stock: { increment: venta.cantidad } },
    }),
    prisma.venta.delete({ where: { id } }),
    ...voucherRefunds,
    ...notaCreditoRefunds,
  ]);

  revalidateAfterVenta();
}
