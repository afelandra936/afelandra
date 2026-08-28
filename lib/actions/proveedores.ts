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

export async function actualizarProveedor(
  id: string,
  data: {
    nombre: string;
    marca?: string;
    contacto?: string;
    formaPago?: string;
    plazo?: string;
    ultimaCompra?: string;
    deudaInicial?: number;
  }
) {
  await requireRole("admin");
  if (!data.nombre.trim()) throw new Error("El nombre es obligatorio");

  const existente = await prisma.proveedor.findFirst({
    where: { nombre: { equals: data.nombre.trim(), mode: "insensitive" }, NOT: { id } },
  });
  if (existente) throw new Error(`Ya existe un proveedor llamado "${data.nombre.trim()}"`);

  await prisma.proveedor.update({
    where: { id },
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

export type RemitoItemInput =
  | { modo: "existente"; productoId: string; cantidad: number; costoUnitario: number }
  | { modo: "nuevo"; nombre: string; tipo: string; color: string; marca: string; talle: string; cantidad: number; costoUnitario: number };

export async function crearRemito(data: {
  proveedorId: string;
  fecha: string;
  numero?: string;
  montoSinIva: number;
  tieneIva: boolean;
  items?: RemitoItemInput[];
}) {
  await requireRole("admin");
  if (!(data.montoSinIva > 0)) throw new Error("El monto debe ser mayor a 0");
  for (const it of data.items ?? []) {
    if (!(it.cantidad > 0)) throw new Error("Cada artículo necesita una cantidad mayor a 0");
    if (!(it.costoUnitario > 0)) throw new Error("Cada artículo necesita un costo unitario mayor a 0");
    if (it.modo === "nuevo" && !it.nombre.trim()) throw new Error("Elegí un producto existente o cargá los datos del producto nuevo");
  }

  await prisma.$transaction(async (tx) => {
    const remito = await tx.remito.create({
      data: {
        proveedorId: data.proveedorId,
        fecha: new Date(data.fecha),
        numero: data.numero?.trim() || null,
        montoSinIva: data.montoSinIva,
        tieneIva: data.tieneIva,
      },
    });

    for (const it of data.items ?? []) {
      if (it.modo === "existente") {
        const producto = await tx.producto.update({
          where: { id: it.productoId },
          data: { stock: { increment: Math.round(it.cantidad) } },
        });
        await tx.remitoItem.create({
          data: {
            remitoId: remito.id,
            productoId: producto.id,
            nombre: producto.nombre,
            color: producto.color,
            talle: producto.talle,
            cantidad: Math.round(it.cantidad),
            costoUnitario: it.costoUnitario,
          },
        });
      } else {
        const producto = await tx.producto.create({
          data: {
            nombre: it.nombre.trim(),
            tipo: it.tipo,
            color: it.color.trim(),
            marca: it.marca.trim(),
            proveedorId: data.proveedorId,
            talle: it.talle === "Único" ? "" : it.talle,
            costo: it.costoUnitario,
            stock: Math.round(it.cantidad),
            stockMin: 2,
          },
        });
        await tx.remitoItem.create({
          data: {
            remitoId: remito.id,
            productoId: producto.id,
            nombre: producto.nombre,
            color: producto.color,
            talle: producto.talle,
            cantidad: Math.round(it.cantidad),
            costoUnitario: it.costoUnitario,
          },
        });
      }
    }
  });

  revalidatePath("/stock");
  revalidateProveedores();
}

export async function eliminarRemito(id: string) {
  await requireRole("admin");

  await prisma.$transaction(async (tx) => {
    const items = await tx.remitoItem.findMany({ where: { remitoId: id } });
    for (const it of items) {
      if (!it.productoId) continue; // el producto ya fue borrado — no hay stock que revertir
      const producto = await tx.producto.findUnique({ where: { id: it.productoId } });
      if (!producto) continue;
      const nuevoStock = Math.max(0, producto.stock - it.cantidad);
      await tx.producto.update({ where: { id: it.productoId }, data: { stock: nuevoStock } });
    }
    await tx.remito.delete({ where: { id } });
  });

  revalidatePath("/stock");
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
