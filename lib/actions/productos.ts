"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toNumber } from "@/lib/format";
import { revalidatePath } from "next/cache";

type TalleInput = { talle: string; stock: number; codigo?: string };

export type ProductoBusqueda = {
  id: string;
  nombre: string;
  color: string;
  talle: string;
  marca: string;
  costo: number;
  stock: number;
  codigo: string | null;
};

function aBusqueda(p: {
  id: string;
  nombre: string;
  color: string;
  talle: string;
  marca: string;
  costo: unknown;
  stock: number;
  codigo: string | null;
}): ProductoBusqueda {
  return {
    id: p.id,
    nombre: p.nombre,
    color: p.color,
    talle: p.talle,
    marca: p.marca,
    costo: toNumber(p.costo as never),
    stock: p.stock,
    codigo: p.codigo,
  };
}

function compararTalle(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, "es");
}

/** Búsqueda server-side para el autocompletado de Ventas: no manda el catálogo entero al cliente. */
export async function buscarProductos(query: string): Promise<ProductoBusqueda[]> {
  await requireRole("admin", "empleada");
  const q = query.trim();
  if (!q) return [];

  const productos = await prisma.producto.findMany({
    where: { nombre: { contains: q, mode: "insensitive" }, stock: { gt: 0 } },
    orderBy: { nombre: "asc" },
    take: 15,
  });
  return productos.map(aBusqueda);
}

export async function buscarProductoPorCodigo(codigo: string): Promise<ProductoBusqueda | null> {
  await requireRole("admin", "empleada");
  const c = codigo.trim();
  if (!c) return null;

  const producto = await prisma.producto.findUnique({ where: { codigo: c } });
  return producto ? aBusqueda(producto) : null;
}

/** Paso 1 de Ventas: nombres de modelo que coinciden con la búsqueda, con stock disponible. */
export async function buscarModelos(query: string): Promise<string[]> {
  await requireRole("admin", "empleada");
  const q = query.trim();
  if (!q) return [];

  const productos = await prisma.producto.findMany({
    where: { nombre: { contains: q, mode: "insensitive" }, stock: { gt: 0 } },
    select: { nombre: true },
    distinct: ["nombre"],
    orderBy: { nombre: "asc" },
    take: 15,
  });
  return productos.map((p) => p.nombre);
}

/**
 * Paso 2 de Ventas: colores disponibles de un modelo, con el stock total de cada uno.
 * Agrupa por color recortado (trim) para no mostrar como "colores" distintos filas que
 * solo difieren en un espacio de más — el mismo tipo de dato sucio que ya se vio en
 * nombres de producto (ver fix de actualizarCostoTodosTalles).
 */
export async function buscarColoresPorModelo(nombre: string): Promise<{ color: string; stock: number }[]> {
  await requireRole("admin", "empleada");
  const productos = await prisma.producto.findMany({
    where: { nombre, stock: { gt: 0 } },
    select: { color: true, stock: true },
  });

  const mapa = new Map<string, number>();
  for (const p of productos) {
    const key = p.color.trim();
    mapa.set(key, (mapa.get(key) ?? 0) + p.stock);
  }
  return [...mapa.entries()]
    .map(([color, stock]) => ({ color, stock }))
    .sort((a, b) => a.color.localeCompare(b.color, "es"));
}

/** Paso 3 de Ventas: variantes de talle de un modelo+color, ordenadas por talle. */
export async function buscarVariantesPorModeloColor(nombre: string, color: string): Promise<ProductoBusqueda[]> {
  await requireRole("admin", "empleada");
  const colorTrim = color.trim();
  const productos = await prisma.producto.findMany({ where: { nombre, stock: { gt: 0 } } });
  const filtrados = productos.filter((p) => p.color.trim() === colorTrim);
  return filtrados.map(aBusqueda).sort((a, b) => compararTalle(a.talle, b.talle));
}

export async function crearProducto(data: {
  nombre: string;
  tipo: string;
  color: string;
  marca: string;
  proveedorNombre?: string;
  costo: number;
  stockMin: number;
  observaciones?: string;
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
      observaciones: data.observaciones?.trim() || null,
    })),
  });

  revalidatePath("/stock");
}

export async function actualizarProducto(
  id: string,
  data: Partial<{
    nombre: string;
    tipo: string;
    marca: string;
    color: string;
    talle: string;
    codigo: string | null;
    costo: number;
    stock: number;
    stockMin: number;
    observaciones: string | null;
  }>
) {
  await requireRole("admin");

  if (data.nombre !== undefined && !data.nombre.trim()) {
    throw new Error("El nombre es obligatorio");
  }
  if (data.codigo) {
    const existente = await prisma.producto.findFirst({ where: { codigo: data.codigo, NOT: { id } } });
    if (existente) throw new Error(`El código ${data.codigo} ya está en uso`);
  }

  await prisma.producto.update({
    where: { id },
    data: { ...data, nombre: data.nombre?.trim(), talle: data.talle === "Único" ? "" : data.talle },
  });
  revalidatePath("/stock");
}

/**
 * Aplica un costo a un conjunto puntual de productos (todas las variantes de talle
 * de un mismo modelo). Recibe los IDs explícitos en vez de buscar por nombre: así no
 * depende de que el texto del nombre coincida exactamente entre filas (mayúsculas,
 * espacios) — se actualiza exactamente lo que el usuario ve agrupado en la tabla.
 */
export async function actualizarCostoTodosTalles(ids: string[], costo: number) {
  await requireRole("admin");
  if (!(costo > 0)) throw new Error("El costo debe ser mayor a 0");
  if (ids.length === 0) return;

  await prisma.producto.updateMany({ where: { id: { in: ids } }, data: { costo } });
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
