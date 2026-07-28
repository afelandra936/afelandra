import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";

const IVA = 1.21;

export function montoConIva(remito: { montoSinIva: unknown; tieneIva: boolean }): number {
  const monto = toNumber(remito.montoSinIva as never);
  return remito.tieneIva ? monto * IVA : monto;
}

export function calcularDeuda(
  remitos: { montoSinIva: unknown; tieneIva: boolean }[],
  pagos: { monto: unknown }[],
  deudaInicial: unknown
): number {
  const facturado = remitos.reduce((acc, r) => acc + montoConIva(r), 0) + toNumber(deudaInicial as never);
  const pagado = pagos.reduce((acc, p) => acc + toNumber(p.monto as never), 0);
  return Math.max(0, facturado - pagado);
}

export async function deudaProveedor(proveedorId: string): Promise<number> {
  const proveedor = await prisma.proveedor.findUniqueOrThrow({
    where: { id: proveedorId },
    include: { remitos: true, pagos: true },
  });
  return calcularDeuda(proveedor.remitos, proveedor.pagos, proveedor.deudaInicial);
}
