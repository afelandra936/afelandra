"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type PromocionInput = {
  nombre: string;
  tipo: "porcentaje" | "2x1";
  valorPorcentaje?: number | null;
  fechaDesde?: string | null; // YYYY-MM-DD
  fechaHasta?: string | null;
  activa: boolean;
};

function validar(data: PromocionInput) {
  if (!data.nombre.trim()) throw new Error("El nombre es obligatorio");
  if (data.tipo === "porcentaje") {
    const pct = data.valorPorcentaje;
    if (pct == null || !(pct > 0) || pct > 100) throw new Error("El % debe estar entre 1 y 100");
  }
  if (data.fechaDesde && data.fechaHasta && data.fechaDesde > data.fechaHasta) {
    throw new Error("La fecha desde no puede ser posterior a la fecha hasta");
  }
}

function revalidateAfterPromocion() {
  revalidatePath("/promociones");
  revalidatePath("/ventas");
}

export async function crearPromocion(data: PromocionInput) {
  await requireRole("admin");
  validar(data);

  await prisma.promocion.create({
    data: {
      nombre: data.nombre.trim(),
      tipo: data.tipo,
      valorPorcentaje: data.tipo === "porcentaje" ? data.valorPorcentaje : null,
      fechaDesde: data.fechaDesde ? new Date(`${data.fechaDesde}T00:00:00`) : null,
      fechaHasta: data.fechaHasta ? new Date(`${data.fechaHasta}T23:59:59`) : null,
      activa: data.activa,
    },
  });
  revalidateAfterPromocion();
}

export async function actualizarPromocion(id: string, data: PromocionInput) {
  await requireRole("admin");
  validar(data);

  await prisma.promocion.update({
    where: { id },
    data: {
      nombre: data.nombre.trim(),
      tipo: data.tipo,
      valorPorcentaje: data.tipo === "porcentaje" ? data.valorPorcentaje : null,
      fechaDesde: data.fechaDesde ? new Date(`${data.fechaDesde}T00:00:00`) : null,
      fechaHasta: data.fechaHasta ? new Date(`${data.fechaHasta}T23:59:59`) : null,
      activa: data.activa,
    },
  });
  revalidateAfterPromocion();
}

export async function eliminarPromocion(id: string) {
  await requireRole("admin");
  await prisma.promocion.delete({ where: { id } });
  revalidateAfterPromocion();
}
