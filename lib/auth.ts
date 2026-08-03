import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type Role = "admin" | "empleada";

export const SESSION_COOKIE = "afelandra_session";
const SESSION_DURATION = "12h";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta AUTH_SECRET en las variables de entorno");
  return new TextEncoder().encode(secret);
}

export async function createSession(role: Role) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getSession(): Promise<{ role: Role } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "admin" && payload.role !== "empleada") return null;
    return { role: payload.role };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Lanza si no hay sesión o el rol no está permitido. Usar al inicio de Server Actions sensibles. */
export async function requireRole(...roles: Role[]) {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    throw new Error("No autorizado");
  }
  return session;
}

/** Normaliza una respuesta de seguridad antes de hashear/comparar, para que mayúsculas y espacios no importen. */
export function normalizarRespuesta(respuesta: string): string {
  return respuesta.trim().toLowerCase();
}
