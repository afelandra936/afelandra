"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/actions/auditoria";
import { revalidatePath } from "next/cache";

export async function crearGasto(data: { concepto: string; tipo: "fijo" | "variable"; monto: number; fecha?: string }) {
  await requireRole("admin");
  if (!data.concepto.trim()) throw new Error("El concepto es obligatorio");
  if (!(data.monto > 0)) throw new Error("El monto debe ser mayor a 0");

  await prisma.gasto.create({
    data: {
      concepto: data.concepto.trim(),
      tipo: data.tipo,
      monto: data.monto,
      ...(data.fecha ? { fecha: new Date(`${data.fecha}T12:00:00`) } : {}),
    },
  });
  revalidatePath("/gastos");
  revalidatePath("/resumen");
  revalidatePath("/rentabilidad");
}

export async function eliminarGasto(id: string, responsable: string) {
  await requireRole("admin");
  const eliminado = await prisma.gasto.delete({ where: { id } });
  await registrarAuditoria("Gasto", id, `${eliminado.concepto} — $${Number(eliminado.monto).toLocaleString("es-AR")}`, responsable);
  revalidatePath("/gastos");
  revalidatePath("/resumen");
  revalidatePath("/rentabilidad");
}
