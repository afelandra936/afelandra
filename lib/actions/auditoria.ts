"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/** Registra una acción destructiva en la auditoría, con el nombre que la persona tipeó
 * para confirmarla. El acceso de Afelandra (admin) es compartido entre varias personas
 * sin login individual, así que esto es lo único que distingue quién hizo cada borrado. */
export async function registrarAuditoria(entidad: string, entidadId: string, detalle: string, responsable: string) {
  const nombre = responsable?.trim();
  if (!nombre) throw new Error("Falta confirmar con el nombre de quién hace el cambio");

  const session = await getSession();
  await prisma.auditLog.create({
    data: {
      accion: "eliminar",
      entidad,
      entidadId,
      detalle,
      responsable: nombre,
      role: session?.role ?? "desconocido",
    },
  });
}

export type AuditLogDTO = {
  id: string;
  entidad: string;
  detalle: string;
  responsable: string;
  role: string;
  createdAt: string;
};

export async function listarAuditoria(): Promise<AuditLogDTO[]> {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return logs.map((l) => ({
    id: l.id,
    entidad: l.entidad,
    detalle: l.detalle,
    responsable: l.responsable,
    role: l.role,
    createdAt: l.createdAt.toISOString(),
  }));
}
