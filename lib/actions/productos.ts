"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type TalleInput = { talle: string; stock: number; codigo?: string };

export async function crearProducto(data: {
  nombre: string;
  tipo: string;
  color: string;
  marca: string;
  proveedorNombre?: string;
  costo: number;
  stockMin: number;
  talles: TalleInput[];
}) {
  await requireRole("admin");

  if (!data.nombre.trim()) throw new Error("El nombre es obligatorio");
  if (data.talles.length === 0) throw new Error("Elegí al menos un talle");
  if (!(data.costo > 0)) throw new Error("El costo debe ser mayor a 0");

  let proveedorId: string | undefined;
  if (data.proveedorNombre?.trim()) {
    const proveedor = await prisma.proveedor.upsert({
      where: { nombre: data.proveedorNombre.trim() },
      update: {},
      create: { nombre: data.proveedorNombre.trim() },
    });
    proveedorId = proveedor.id;
  }

  for (const t of data.talles) {
    if (t.codigo) {
      const exists = await prisma.producto.findUnique({ where: { codigo: t.codigo } });
      if (exists) throw new Error(`El código ${t.codigo} ya está en uso`);
    }
  }

  await prisma.producto.createMany({
    data: data.talles.map((t) => ({
      nombre: data.nombre.trim(),
      tipo: data.tipo,
      color: data.color.trim(),
      marca: data.marca.trim(),
      proveedorId,
      talle: t.talle === "Único" ? "" : t.talle,
      costo: data.costo,
      stock: t.stock,
      stockMin: data.stockMin,
      codigo: t.codigo || null,
    })),
  });

  revalidatePath("/stock");
}

export async function actualizarProducto(
  id: string,
  data: Partial<{
    marca: string;
    color: string;
    codigo: string | null;
    costo: number;
    stock: number;
    stockMin: number;
  }>
) {
  await requireRole("admin");

  if (data.codigo) {
    const existente = await prisma.producto.findFirst({ where: { codigo: data.codigo, NOT: { id } } });
    if (existente) throw new Error(`El código ${data.codigo} ya está en uso`);
  }

  await prisma.producto.update({ where: { id }, data });
  revalidatePath("/stock");
}

export async function sumarStock(productoId: string, cantidad: number) {
  await requireRole("admin", "empleada");
  if (!(cantidad > 0)) throw new Error("Cantidad inválida");

  await prisma.producto.update({
    where: { id: productoId },
    data: { stock: { increment: Math.round(cantidad) } },
  });
  revalidatePath("/stock");
}

export async function eliminarProducto(id: string) {
  await requireRole("admin");
  try {
    await prisma.producto.delete({ where: { id } });
  } catch {
    throw new Error("No se puede eliminar: el producto tiene ventas asociadas");
  }
  revalidatePath("/stock");
}
