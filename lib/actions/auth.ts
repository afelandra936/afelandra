"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getConfig } from "@/lib/config";
import { createSession, destroySession, type Role } from "@/lib/auth";

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
