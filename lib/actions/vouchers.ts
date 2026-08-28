"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toNumber } from "@/lib/format";
import { MEDIOS } from "@/lib/pricing";
import { revalidatePath } from "next/cache";

function revalidateAfterVoucher() {
  for (const path of ["/vouchers", "/ventas", "/resumen", "/rentabilidad"]) {
    revalidatePath(path);
  }
}

async function generarCodigoUnico(): Promise<string> {
  for (let intento = 0; intento < 10; intento++) {
    const codigo = "V" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const existe = await prisma.voucher.findUnique({ where: { codigo } });
    if (!existe) return codigo;
  }
  throw new Error("No se pudo generar un código de voucher único, probá de nuevo");
}

export type VoucherDTO = {
  id: string;
  codigo: string;
  montoInicial: number;
  saldo: number;
  medioPago: string;
  vendedor: string;
  clienteNombre: string | null;
  observaciones: string | null;
  fecha: string;
};

function aDTO(v: {
  id: string;
  codigo: string;
  montoInicial: unknown;
  saldo: unknown;
  medioPago: string;
  vendedor: string;
  clienteNombre: string | null;
  observaciones: string | null;
  fecha: Date;
}): VoucherDTO {
  return {
    id: v.id,
    codigo: v.codigo,
    montoInicial: toNumber(v.montoInicial as never),
    saldo: toNumber(v.saldo as never),
    medioPago: v.medioPago,
    vendedor: v.vendedor,
    clienteNombre: v.clienteNombre,
    observaciones: v.observaciones,
    fecha: v.fecha.toISOString(),
  };
}

/** Vende un voucher: ingreso de dinero sin producto asociado, no toca stock. */
export async function crearVoucher(data: {
  codigo?: string;
  monto: number;
  medioPago: string;
  vendedor: string;
  clienteNombre?: string;
  observaciones?: string;
}): Promise<{ error: string } | { ok: true; codigo: string }> {
  await requireRole("admin", "empleada");

  if (!(data.monto > 0)) return { error: "El monto debe ser mayor a 0" };
  if (!data.vendedor.trim()) return { error: "El vendedor es obligatorio" };
  if (!MEDIOS.includes(data.medioPago as (typeof MEDIOS)[number])) return { error: "Medio de pago inválido" };

  let codigo = data.codigo?.trim().toUpperCase();
  if (codigo) {
    const existe = await prisma.voucher.findUnique({ where: { codigo } });
    if (existe) return { error: `Ya existe un voucher con el código ${codigo}` };
  } else {
    codigo = await generarCodigoUnico();
  }

  await prisma.voucher.create({
    data: {
      codigo,
      montoInicial: data.monto,
      saldo: data.monto,
      medioPago: data.medioPago,
      vendedor: data.vendedor.trim(),
      clienteNombre: data.clienteNombre?.trim() || null,
      observaciones: data.observaciones?.trim() || null,
    },
  });

  revalidateAfterVoucher();
  return { ok: true, codigo };
}

/** Búsqueda por código para redimirlo como medio de pago en una venta. */
export async function buscarVoucherPorCodigo(codigo: string): Promise<VoucherDTO | null> {
  await requireRole("admin", "empleada");
  const c = codigo.trim();
  if (!c) return null;

  const voucher = await prisma.voucher.findFirst({ where: { codigo: { equals: c, mode: "insensitive" } } });
  return voucher ? aDTO(voucher) : null;
}

export async function listarVouchers(): Promise<VoucherDTO[]> {
  await requireRole("admin", "empleada");
  const vouchers = await prisma.voucher.findMany({ orderBy: { fecha: "desc" } });
  return vouchers.map(aDTO);
}

/** Solo se puede borrar un voucher que nunca se usó como pago en ninguna venta. */
export async function eliminarVoucher(id: string): Promise<{ error: string } | void> {
  await requireRole("admin");

  const usado = await prisma.pagoVenta.findFirst({ where: { voucherId: id } });
  if (usado) {
    return { error: "No se puede eliminar: este voucher ya se usó como pago en una venta" };
  }

  await prisma.voucher.delete({ where: { id } });
  revalidateAfterVoucher();
}
