"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole, normalizarRespuesta } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  for (const path of ["/resumen", "/ventas", "/stock"]) revalidatePath(path);
}

export async function actualizarCoeficientes(data: {
  debito: number;
  credito3: number;
  credito6: number;
  contado: number;
}) {
  await requireRole("admin");
  await getConfig();
  await prisma.config.update({ where: { id: 1 }, data });
  revalidateAll();
}

type ListaCampo = "talles" | "tallesIndumentaria" | "tiposCalzado" | "tiposAccesorio";

export async function agregarItemLista(campo: ListaCampo, valor: string) {
  await requireRole("admin");
  const config = await getConfig();
  const actual = config[campo] as string[];
  if (!valor.trim() || actual.includes(valor.trim())) return;
  await prisma.config.update({ where: { id: 1 }, data: { [campo]: [...actual, valor.trim()] } });
  revalidateAll();
}

export async function quitarItemLista(campo: ListaCampo, valor: string) {
  await requireRole("admin");
  const config = await getConfig();
  const actual = config[campo] as string[];
  await prisma.config.update({ where: { id: 1 }, data: { [campo]: actual.filter((v) => v !== valor) } });
  revalidateAll();
}

export async function guardarCoeficientesMarca(
  marca: string,
  data: { debito: number; credito3: number; credito6: number; contado: number }
) {
  await requireRole("admin");
  const nombre = marca.trim();
  if (!nombre) throw new Error("La marca es obligatoria");
  await prisma.coeficienteMarca.upsert({
    where: { marca: nombre },
    update: data,
    create: { marca: nombre, ...data },
  });
  revalidateAll();
}

export async function eliminarCoeficientesMarca(marca: string) {
  await requireRole("admin");
  await prisma.coeficienteMarca.deleteMany({ where: { marca } });
  revalidateAll();
}

export async function actualizarPin(role: "admin" | "empleada", pin: string) {
  await requireRole("admin");
  await getConfig();
  const hash = pin.trim() ? await bcrypt.hash(pin.trim(), 10) : null;
  const campo = role === "admin" ? "pinAdminHash" : "pinVendedorHash";
  await prisma.config.update({ where: { id: 1 }, data: { [campo]: hash } });
}

export async function actualizarPreguntaSeguridad(role: "admin" | "empleada", pregunta: string, respuesta: string) {
  await requireRole("admin");
  await getConfig();

  const campoPregunta = role === "admin" ? "preguntaAdmin" : "preguntaVendedor";
  const campoHash = role === "admin" ? "respuestaAdminHash" : "respuestaVendedorHash";
  const preguntaTrim = pregunta.trim();
  const respuestaTrim = respuesta.trim();

  if (!preguntaTrim || !respuestaTrim) {
    await prisma.config.update({ where: { id: 1 }, data: { [campoPregunta]: null, [campoHash]: null } });
    return;
  }

  const hash = await bcrypt.hash(normalizarRespuesta(respuestaTrim), 10);
  await prisma.config.update({ where: { id: 1 }, data: { [campoPregunta]: preguntaTrim, [campoHash]: hash } });
}
