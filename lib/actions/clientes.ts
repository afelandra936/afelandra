"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function crearCliente(data: {
  nombre: string;
  dni?: string;
  email?: string;
  telefono?: string;
  instagram?: string;
  cumple?: string;
}) {
  await requireRole("admin", "empleada");
  if (!data.nombre.trim()) throw new Error("El nombre es obligatorio");

  await prisma.cliente.create({
    data: {
      nombre: data.nombre.trim(),
      dni: data.dni?.trim() || null,
      email: data.email?.trim() || null,
      telefono: data.telefono?.trim() || null,
      instagram: data.instagram?.trim() || null,
      cumple: data.cumple ? new Date(`${data.cumple}T12:00:00`) : null,
    },
  });
  revalidatePath("/clientes");
}

export async function eliminarCliente(id: string) {
  await requireRole("admin", "empleada");
  try {
    await prisma.cliente.delete({ where: { id } });
  } catch {
    throw new Error("No se puede eliminar: el cliente tiene ventas, cambios o notas de crédito asociadas");
  }
  revalidatePath("/clientes");
}

export type ClienteBusqueda = { id: string; nombre: string };

/** Búsqueda server-side para elegir un cliente identificado (cambios, notas de crédito). */
export async function buscarClientes(query: string): Promise<ClienteBusqueda[]> {
  await requireRole("admin", "empleada");
  const q = query.trim();
  if (!q) return [];

  const clientes = await prisma.cliente.findMany({
    where: { nombre: { contains: q, mode: "insensitive" } },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
    take: 10,
  });
  return clientes;
}
