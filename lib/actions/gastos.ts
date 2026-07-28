"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function crearGasto(data: { concepto: string; tipo: "fijo" | "variable"; monto: number }) {
  await requireRole("admin");
  if (!data.concepto.trim()) throw new Error("El concepto es obligatorio");
  if (!(data.monto > 0)) throw new Error("El monto debe ser mayor a 0");

  await prisma.gasto.create({
    data: { concepto: data.concepto.trim(), tipo: data.tipo, monto: data.monto },
  });
  revalidatePath("/gastos");
  revalidatePath("/resumen");
  revalidatePath("/rentabilidad");
}

export async function eliminarGasto(id: string) {
  await requireRole("admin");
  await prisma.gasto.delete({ where: { id } });
  revalidatePath("/gastos");
  revalidatePath("/resumen");
  revalidatePath("/rentabilidad");
}
