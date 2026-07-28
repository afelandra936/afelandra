"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { precioUnitario } from "@/lib/pricing";
import { revalidatePath } from "next/cache";

export type PagoInput = { medio: string; monto: number };

export type RegistrarVentaInput = {
  fecha: string; // YYYY-MM-DD
  productoId: string;
  cantidad: number;
  medioPago: string;
  pagos?: PagoInput[]; // si hay más de uno, el pago fue dividido
  vendedor: string;
  clienteNombre?: string;
  observaciones?: string;
  sucursal?: string;
  confirmarPerdida?: boolean;
};

function revalidateAfterVenta() {
  for (const path of ["/ventas", "/stock", "/resumen", "/rentabilidad", "/clientes"]) {
    revalidatePath(path);
  }
}

export async function registrarVenta(
  input: RegistrarVentaInput
): Promise<{ error?: string; warning?: string } | void> {
  await requireRole("admin", "empleada");

  if (!input.vendedor.trim()) return { error: "El vendedor es obligatorio" };
  if (!(input.cantidad > 0)) return { error: "Cantidad inválida" };

  const producto = await prisma.producto.findUnique({ where: { id: input.productoId } });
  if (!producto) return { error: "Producto no encontrado" };

  const config = await getConfig();
  const costoUnitario = Number(producto.costo);

  const pagos: PagoInput[] =
    input.pagos && input.pagos.length > 0
      ? input.pagos
      : [{ medio: input.medioPago, monto: precioUnitario(costoUnitario, input.medioPago, config) * input.cantidad }];

  const precioTotal = pagos.reduce((acc, p) => acc + p.monto, 0);
  const precioVentaUnitario = precioTotal / input.cantidad;

  if (precioVentaUnitario < costoUnitario && !input.confirmarPerdida) {
    return { warning: "El precio de venta es menor al costo. ¿Confirmás igual?" };
  }

  let clienteId: string | null = null;
  const clienteNombre = input.clienteNombre?.trim() || null;
  if (clienteNombre) {
    const match = await prisma.cliente.findFirst({
      where: { nombre: { equals: clienteNombre, mode: "insensitive" } },
    });
    if (match) clienteId = match.id;
  }

  const medioPagoFinal = pagos.length > 1 ? "Dividido" : pagos[0].medio;

  await prisma.$transaction([
    prisma.venta.create({
      data: {
        fecha: new Date(`${input.fecha}T12:00:00`),
        productoId: producto.id,
        nombre: producto.nombre,
        tipo: producto.tipo,
        proveedor: producto.proveedorId
          ? (await prisma.proveedor.findUnique({ where: { id: producto.proveedorId } }))?.nombre
          : null,
        talle: producto.talle,
        cantidad: input.cantidad,
        medioPago: medioPagoFinal,
        vendedor: input.vendedor.trim(),
        clienteId,
        clienteNombre,
        observaciones: input.observaciones?.trim() || null,
        sucursal: input.sucursal?.trim() || null,
        precioVenta: precioVentaUnitario,
        costoUnitario,
        pagos: { createMany: { data: pagos.map((p) => ({ medio: p.medio, monto: p.monto })) } },
      },
    }),
    prisma.producto.update({
      where: { id: producto.id },
      data: { stock: Math.max(0, producto.stock - input.cantidad) },
    }),
  ]);

  revalidateAfterVenta();
}

export async function eliminarVenta(id: string) {
  await requireRole("admin", "empleada");

  const venta = await prisma.venta.findUnique({ where: { id } });
  if (!venta) return;

  await prisma.$transaction([
    prisma.producto.update({
      where: { id: venta.productoId },
      data: { stock: { increment: venta.cantidad } },
    }),
    prisma.venta.delete({ where: { id } }),
  ]);

  revalidateAfterVenta();
}
