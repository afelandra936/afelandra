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
  await prisma.cliente.delete({ where: { id } });
  revalidatePath("/clientes");
}
