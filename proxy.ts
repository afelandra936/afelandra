import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "afelandra_session";
const ADMIN_ONLY_PREFIXES = ["/resumen", "/proveedores", "/gastos", "/rentabilidad"];

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta AUTH_SECRET en las variables de entorno");
  return new TextEncoder().encode(secret);
}

async function readRole(request: NextRequest): Promise<"admin" | "empleada" | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role === "admin" || payload.role === "empleada") return payload.role;
    return null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await readRole(request);

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(role ? (role === "admin" ? "/resumen" : "/ventas") : "/login", request.url)
    );
  }

  if (!role) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (role === "empleada" && ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/ventas", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
