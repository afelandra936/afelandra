"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toNumber } from "@/lib/format";
import { registrarAuditoria } from "@/lib/actions/auditoria";
import { revalidatePath } from "next/cache";

export type MovimientoCajaDTO = {
  id: string;
  fecha: string;
  tipo: "ingreso" | "retiro";
  monto: number;
  motivo: string;
};

export async function crearMovimientoCaja(data: {
  fecha: string;
  tipo: "ingreso" | "retiro";
  monto: number;
  motivo: string;
}) {
  await requireRole("admin");
  if (!(data.monto > 0)) throw new Error("El monto debe ser mayor a 0");
  if (!data.motivo.trim()) throw new Error("El motivo es obligatorio");
  if (data.tipo !== "ingreso" && data.tipo !== "retiro") throw new Error("Tipo inválido");

  await prisma.movimientoCaja.create({
    data: {
      fecha: new Date(`${data.fecha}T12:00:00`),
      tipo: data.tipo,
      monto: data.monto,
      motivo: data.motivo.trim(),
    },
  });
  revalidatePath("/resumen");
}

export async function eliminarMovimientoCaja(id: string, responsable: string) {
  await requireRole("admin");
  const eliminado = await prisma.movimientoCaja.delete({ where: { id } });
  await registrarAuditoria(
    "Movimiento de caja",
    id,
    `${eliminado.tipo === "ingreso" ? "Ingreso" : "Retiro"} — $${Number(eliminado.monto).toLocaleString("es-AR")} — ${eliminado.motivo}`,
    responsable
  );
  revalidatePath("/resumen");
}

export async function listarMovimientosCaja(fecha: string): Promise<MovimientoCajaDTO[]> {
  await requireRole("admin");
  const inicio = new Date(`${fecha}T00:00:00`);
  const fin = new Date(`${fecha}T23:59:59.999`);
  const movimientos = await prisma.movimientoCaja.findMany({
    where: { fecha: { gte: inicio, lte: fin } },
    orderBy: { createdAt: "desc" },
  });
  return movimientos.map((m) => ({
    id: m.id,
    fecha: m.fecha.toISOString(),
    tipo: m.tipo as "ingreso" | "retiro",
    monto: toNumber(m.monto),
    motivo: m.motivo,
  }));
}
