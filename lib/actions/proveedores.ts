"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function revalidateProveedores() {
  for (const path of ["/proveedores", "/rentabilidad", "/resumen"]) revalidatePath(path);
}

export async function crearProveedor(data: {
  nombre: string;
  marca?: string;
  contacto?: string;
  formaPago?: string;
  plazo?: string;
  ultimaCompra?: string;
  deudaInicial?: number;
}) {
  await requireRole("admin");
  if (!data.nombre.trim()) throw new Error("El nombre es obligatorio");

  await prisma.proveedor.create({
    data: {
      nombre: data.nombre.trim(),
      marca: data.marca?.trim() || null,
      contacto: data.contacto?.trim() || null,
      formaPago: data.formaPago?.trim() || null,
      plazo: data.plazo?.trim() || null,
      ultimaCompra: data.ultimaCompra ? new Date(data.ultimaCompra) : null,
      deudaInicial: data.deudaInicial ?? 0,
    },
  });
  revalidateProveedores();
}

export async function eliminarProveedor(id: string) {
  await requireRole("admin");
  try {
    await prisma.proveedor.delete({ where: { id } });
  } catch {
    throw new Error("No se puede eliminar: tiene productos, remitos o pagos asociados");
  }
  revalidateProveedores();
}

export async function crearRemito(data: {
  proveedorId: string;
  fecha: string;
  numero?: string;
  montoSinIva: number;
  tieneIva: boolean;
}) {
  await requireRole("admin");
  if (!(data.montoSinIva > 0)) throw new Error("El monto debe ser mayor a 0");

  await prisma.remito.create({
    data: {
      proveedorId: data.proveedorId,
      fecha: new Date(data.fecha),
      numero: data.numero?.trim() || null,
      montoSinIva: data.montoSinIva,
      tieneIva: data.tieneIva,
    },
  });
  revalidateProveedores();
}

export async function eliminarRemito(id: string) {
  await requireRole("admin");
  await prisma.remito.delete({ where: { id } });
  revalidateProveedores();
}

export async function crearPagoProveedor(data: {
  proveedorId: string;
  fecha: string;
  monto: number;
  medio: string;
  nota?: string;
}) {
  await requireRole("admin");
  if (!(data.monto > 0)) throw new Error("El monto debe ser mayor a 0");

  await prisma.pagoProveedor.create({
    data: {
      proveedorId: data.proveedorId,
      fecha: new Date(data.fecha),
      monto: data.monto,
      medio: data.medio,
      nota: data.nota?.trim() || null,
    },
  });
  revalidateProveedores();
}

export async function eliminarPagoProveedor(id: string) {
  await requireRole("admin");
  await prisma.pagoProveedor.delete({ where: { id } });
  revalidateProveedores();
}
