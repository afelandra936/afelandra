import { toNumber } from "@/lib/format";
import type { Prisma } from "@/app/generated/prisma/client";

export const MEDIOS = [
  "Efectivo",
  "Débito",
  "Crédito 1 pago",
  "Crédito 3 cuotas",
  "Crédito 6 cuotas",
  "Transferencia",
] as const;

export type Medio = (typeof MEDIOS)[number];

export type CoeficientesConfig = {
  debito: number | string | Prisma.Decimal;
  credito3: number | string | Prisma.Decimal;
  credito6: number | string | Prisma.Decimal;
  contado: number | string | Prisma.Decimal;
};

/** Coeficiente por el que se multiplica el costo según el medio de pago elegido. */
export function ratioMedio(medio: string, config: CoeficientesConfig): number {
  const debito = toNumber(config.debito);
  switch (medio) {
    case "Efectivo":
      return debito * (1 - toNumber(config.contado) / 100);
    case "Débito":
    case "Crédito 1 pago":
    case "Transferencia":
      return debito;
    case "Crédito 3 cuotas":
      return toNumber(config.credito3);
    case "Crédito 6 cuotas":
      return toNumber(config.credito6);
    default:
      return debito;
  }
}

/** Precio de venta unitario sugerido para un costo y medio de pago dados. */
export function precioUnitario(
  costo: number | string | Prisma.Decimal,
  medio: string,
  config: CoeficientesConfig
): number {
  return toNumber(costo) * ratioMedio(medio, config);
}

/**
 * Cuando el pago se divide entre varios medios, cada monto ingresado "cubre"
 * una porción del costo total (monto / ratioMedio del medio). El medio "resto"
 * se lleva automáticamente lo que falta para cubrir el costo total restante.
 */
export function calcularMontoResto(
  costoTotal: number,
  pagosIngresados: { medio: string; monto: number }[],
  medioResto: string,
  config: CoeficientesConfig
): number {
  const costoCubierto = pagosIngresados.reduce(
    (acc, p) => acc + p.monto / ratioMedio(p.medio, config),
    0
  );
  const costoRestante = Math.max(0, costoTotal - costoCubierto);
  return costoRestante * ratioMedio(medioResto, config);
}
