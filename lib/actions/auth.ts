"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getConfig } from "@/lib/config";
import { createSession, destroySession, normalizarRespuesta, type Role } from "@/lib/auth";

export async function loginAction(role: Role, pin: string): Promise<{ error: string } | void> {
  const config = await getConfig();
  const hash = role === "admin" ? config.pinAdminHash : config.pinVendedorHash;

  if (hash) {
    const valid = pin.length > 0 && (await bcrypt.compare(pin, hash));
    if (!valid) return { error: "Código incorrecto" };
  }

  await createSession(role);
  redirect(role === "admin" ? "/resumen" : "/ventas");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/** Devuelve la pregunta de seguridad configurada para el rol, o null si no hay ninguna. */
export async function obtenerPreguntaSeguridad(role: Role): Promise<string | null> {
  const config = await getConfig();
  return role === "admin" ? config.preguntaAdmin : config.preguntaVendedor;
}

/** Verifica la respuesta a la pregunta de seguridad y, si es correcta, define un PIN nuevo e inicia sesión. */
export async function resetearPinConRespuesta(
  role: Role,
  respuesta: string,
  nuevoPin: string
): Promise<{ error: string } | void> {
  const config = await getConfig();
  const hashRespuesta = role === "admin" ? config.respuestaAdminHash : config.respuestaVendedorHash;
  if (!hashRespuesta) return { error: "No hay pregunta de seguridad configurada para este rol" };
  if (!nuevoPin.trim()) return { error: "Ingresá un código nuevo" };

  const valida = await bcrypt.compare(normalizarRespuesta(respuesta), hashRespuesta);
  if (!valida) return { error: "Respuesta incorrecta" };

  const nuevoHash = await bcrypt.hash(nuevoPin.trim(), 10);
  const campo = role === "admin" ? "pinAdminHash" : "pinVendedorHash";
  await prisma.config.update({ where: { id: 1 }, data: { [campo]: nuevoHash } });

  await createSession(role);
  redirect(role === "admin" ? "/resumen" : "/ventas");
}
