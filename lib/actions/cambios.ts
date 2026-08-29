"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toNumber } from "@/lib/format";
import { getConfig, getCoeficientesPorMarca } from "@/lib/config";
import { MEDIOS, precioUnitario, resolverCoeficientes } from "@/lib/pricing";
import { revalidatePath } from "next/cache";

function revalidateAfterCambio() {
  for (const path of ["/cambios", "/ventas", "/stock", "/resumen", "/rentabilidad", "/clientes"]) {
    revalidatePath(path);
  }
}

async function generarCodigoNotaUnico(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
  for (let intento = 0; intento < 10; intento++) {
    const codigo = "NC" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const existe = await tx.notaCredito.findUnique({ where: { codigo } });
    if (!existe) return codigo;
  }
  throw new Error("No se pudo generar un código de nota de crédito único, probá de nuevo");
}

export type CambioDTO = {
  id: string;
  fecha: string;
  clienteNombre: string;
  nombreDevuelto: string;
  talleDevuelto: string;
  precioDevuelto: number;
  nombreNuevo: string;
  talleNuevo: string;
  precioNuevo: number;
  diferencia: number;
  medioPago: string;
  tipo: "venta" | "nota_credito" | "sin_diferencia";
  vendedor: string;
  observaciones: string | null;
};

/** Registra un cambio: repone stock de lo devuelto, descuenta stock de lo nuevo, y resuelve
 * la diferencia — como venta común si el cliente debe pagar de más, o como nota de crédito
 * a favor del cliente si el producto nuevo vale menos. */
export async function registrarCambio(data: {
  clienteId: string;
  productoDevueltoId: string;
  productoNuevoId: string;
  medioPago: string;
  vendedor: string;
  fecha: string;
  observaciones?: string;
}): Promise<
  | { error: string }
  | { ok: true; diferencia: number; tipo: "venta" | "nota_credito" | "sin_diferencia"; notaCredito?: { id: string; codigo: string } }
> {
  await requireRole("admin", "empleada");

  if (!data.clienteId) return { error: "Elegí un cliente" };
  if (!data.vendedor.trim()) return { error: "El vendedor es obligatorio" };
  if (!MEDIOS.includes(data.medioPago as (typeof MEDIOS)[number])) return { error: "Medio de pago inválido" };
  if (data.productoDevueltoId === data.productoNuevoId) {
    return { error: "El producto devuelto y el nuevo no pueden ser el mismo" };
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: data.clienteId } });
  if (!cliente) return { error: "Cliente no encontrado" };

  const [devuelto, nuevo] = await Promise.all([
    prisma.producto.findUnique({ where: { id: data.productoDevueltoId } }),
    prisma.producto.findUnique({ where: { id: data.productoNuevoId } }),
  ]);
  if (!devuelto) return { error: "El producto devuelto ya no existe" };
  if (!nuevo) return { error: "El producto nuevo ya no existe" };
  if (nuevo.stock <= 0) {
    return { error: `No hay stock de "${nuevo.nombre}" (talle ${nuevo.talle || "Único"})` };
  }

  const config = await getConfig();
  const coeficientesPorMarca = await getCoeficientesPorMarca();
  const coefDevuelto = resolverCoeficientes(devuelto.marca, config, coeficientesPorMarca);
  const coefNuevo = resolverCoeficientes(nuevo.marca, config, coeficientesPorMarca);
  const precioDevuelto = precioUnitario(devuelto.costo, data.medioPago, coefDevuelto);
  const precioNuevo = precioUnitario(nuevo.costo, data.medioPago, coefNuevo);
  const diferencia = precioNuevo - precioDevuelto;

  const fecha = new Date(`${data.fecha}T12:00:00`);
  const vendedor = data.vendedor.trim();
  const observaciones = data.observaciones?.trim() || null;

  const datosBase = {
    fecha,
    cliente: { connect: { id: cliente.id } },
    productoDevuelto: { connect: { id: devuelto.id } },
    nombreDevuelto: devuelto.nombre,
    talleDevuelto: devuelto.talle,
    precioDevuelto,
    productoNuevo: { connect: { id: nuevo.id } },
    nombreNuevo: nuevo.nombre,
    talleNuevo: nuevo.talle,
    precioNuevo,
    diferencia,
    medioPago: data.medioPago,
    vendedor,
    observaciones,
  };

  const resultado = await prisma.$transaction(async (tx) => {
    await tx.producto.update({ where: { id: devuelto.id }, data: { stock: { increment: 1 } } });
    await tx.producto.update({ where: { id: nuevo.id }, data: { stock: { decrement: 1 } } });

    if (Math.abs(diferencia) < 0.01) {
      await tx.cambio.create({ data: datosBase });
      return { tipo: "sin_diferencia" as const };
    }

    if (diferencia > 0) {
      const proveedorNombre = nuevo.proveedorId
        ? (await tx.proveedor.findUnique({ where: { id: nuevo.proveedorId } }))?.nombre ?? null
        : null;
      const venta = await tx.venta.create({
        data: {
          fecha,
          producto: { connect: { id: nuevo.id } },
          nombre: nuevo.nombre,
          tipo: nuevo.tipo,
          proveedor: proveedorNombre,
          talle: nuevo.talle,
          cantidad: 1,
          medioPago: data.medioPago,
          vendedor,
          cliente: { connect: { id: cliente.id } },
          clienteNombre: cliente.nombre,
          observaciones: observaciones ? `Diferencia por cambio — ${observaciones}` : "Diferencia por cambio",
          precioVenta: diferencia,
          costoUnitario: Number(nuevo.costo),
          pagos: { create: [{ medio: data.medioPago, monto: diferencia }] },
        },
      });
      await tx.cambio.create({ data: { ...datosBase, venta: { connect: { id: venta.id } } } });
      return { tipo: "venta" as const };
    }

    const montoNota = Math.abs(diferencia);
    const codigo = await generarCodigoNotaUnico(tx);
    const notaCredito = await tx.notaCredito.create({
      data: {
        codigo,
        fecha,
        cliente: { connect: { id: cliente.id } },
        montoInicial: montoNota,
        saldo: montoNota,
        medioPago: data.medioPago,
        vendedor,
        observaciones,
      },
    });
    await tx.cambio.create({ data: { ...datosBase, notaCredito: { connect: { id: notaCredito.id } } } });
    return { tipo: "nota_credito" as const, notaCredito: { id: notaCredito.id, codigo: notaCredito.codigo } };
  });

  revalidateAfterCambio();
  return { ok: true, diferencia, tipo: resultado.tipo, notaCredito: "notaCredito" in resultado ? resultado.notaCredito : undefined };
}

/** Elimina un cambio cargado por error: revierte el stock (repone lo que se había
 * descontado, descuenta lo que se había repuesto) y borra la venta o nota de crédito
 * que hubiera generado — salvo que esa nota de crédito ya se haya usado como pago en
 * otra venta, en cuyo caso rechaza el borrado para no dejar un pago fantasma. */
export async function eliminarCambio(id: string): Promise<{ error: string } | void> {
  await requireRole("admin");

  const cambio = await prisma.cambio.findUnique({ where: { id } });
  if (!cambio) return { error: "El cambio no existe" };

  if (cambio.notaCreditoId) {
    const nota = await prisma.notaCredito.findUnique({ where: { id: cambio.notaCreditoId } });
    if (nota && Number(nota.saldo) < Number(nota.montoInicial)) {
      return { error: "No se puede eliminar: la nota de crédito que generó este cambio ya se usó como pago en otra venta" };
    }
  }

  await prisma.$transaction(async (tx) => {
    // Borrar el Cambio primero: libera las FK hacia la Venta/NotaCredito que pudiera tener.
    await tx.cambio.delete({ where: { id } });

    if (cambio.ventaId) {
      await tx.pagoVenta.deleteMany({ where: { ventaId: cambio.ventaId } });
      await tx.venta.delete({ where: { id: cambio.ventaId } });
    }
    if (cambio.notaCreditoId) {
      await tx.notaCredito.delete({ where: { id: cambio.notaCreditoId } });
    }

    const [devuelto, nuevo] = await Promise.all([
      tx.producto.findUnique({ where: { id: cambio.productoDevueltoId } }),
      tx.producto.findUnique({ where: { id: cambio.productoNuevoId } }),
    ]);
    if (devuelto) {
      await tx.producto.update({ where: { id: devuelto.id }, data: { stock: Math.max(0, devuelto.stock - 1) } });
    }
    if (nuevo) {
      await tx.producto.update({ where: { id: nuevo.id }, data: { stock: { increment: 1 } } });
    }
  });

  revalidateAfterCambio();
}

export async function listarCambios(): Promise<CambioDTO[]> {
  await requireRole("admin", "empleada");
  const cambios = await prisma.cambio.findMany({
    include: { cliente: { select: { nombre: true } } },
    orderBy: { fecha: "desc" },
  });
  return cambios.map((c) => ({
    id: c.id,
    fecha: c.fecha.toISOString(),
    clienteNombre: c.cliente.nombre,
    nombreDevuelto: c.nombreDevuelto,
    talleDevuelto: c.talleDevuelto,
    precioDevuelto: toNumber(c.precioDevuelto as never),
    nombreNuevo: c.nombreNuevo,
    talleNuevo: c.talleNuevo,
    precioNuevo: toNumber(c.precioNuevo as never),
    diferencia: toNumber(c.diferencia as never),
    medioPago: c.medioPago,
    tipo: c.ventaId ? "venta" : c.notaCreditoId ? "nota_credito" : "sin_diferencia",
    vendedor: c.vendedor,
    observaciones: c.observaciones,
  }));
}

export type NotaCreditoDTO = {
  id: string;
  codigo: string;
  clienteId: string;
  clienteNombre: string;
  montoInicial: number;
  saldo: number;
  medioPago: string;
  fecha: string;
};

function notaADTO(n: {
  id: string;
  codigo: string;
  clienteId: string;
  cliente: { nombre: string };
  montoInicial: unknown;
  saldo: unknown;
  medioPago: string;
  fecha: Date;
}): NotaCreditoDTO {
  return {
    id: n.id,
    codigo: n.codigo,
    clienteId: n.clienteId,
    clienteNombre: n.cliente.nombre,
    montoInicial: toNumber(n.montoInicial as never),
    saldo: toNumber(n.saldo as never),
    medioPago: n.medioPago,
    fecha: n.fecha.toISOString(),
  };
}

/** Nota de crédito activa (con saldo) de un cliente por nombre, para aplicarla en una venta. */
export async function buscarNotaCreditoPorCliente(nombreCliente: string): Promise<NotaCreditoDTO | null> {
  await requireRole("admin", "empleada");
  const nombre = nombreCliente.trim();
  if (!nombre) return null;

  const cliente = await prisma.cliente.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
  if (!cliente) return null;

  const nota = await prisma.notaCredito.findFirst({
    where: { clienteId: cliente.id, saldo: { gt: 0 } },
    include: { cliente: { select: { nombre: true } } },
    orderBy: { fecha: "asc" },
  });
  return nota ? notaADTO(nota) : null;
}

export async function listarNotasCredito(): Promise<NotaCreditoDTO[]> {
  await requireRole("admin", "empleada");
  const notas = await prisma.notaCredito.findMany({
    include: { cliente: { select: { nombre: true } } },
    orderBy: { fecha: "desc" },
  });
  return notas.map(notaADTO);
}
