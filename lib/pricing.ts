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

export type CoeficientesPorMarca = Record<string, CoeficientesConfig>;

/**
 * Coeficientes de una marca si tiene configuración propia; si no, los generales.
 * Compara recortando espacios: las marcas se tipean a mano en Stock durante meses y
 * es común que la misma marca tenga variantes con espacios de más (ver mismo problema
 * ya resuelto para nombre de producto y color).
 */
export function resolverCoeficientes(
  marca: string,
  general: CoeficientesConfig,
  porMarca: CoeficientesPorMarca
): CoeficientesConfig {
  return porMarca[marca.trim()] ?? general;
}

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

export type PromocionInput = {
  tipo: string; // "porcentaje" | "2x1"
  valorPorcentaje?: number | string | Prisma.Decimal | null;
};

/**
 * Factor por el que se multiplica el precio total de la venta para aplicar la promoción.
 * - Porcentaje: resta ese % del total.
 * - 2x1: por cada par de unidades se cobra solo 1 (la más cara, pero dentro de una
 *   misma venta todas las unidades tienen el mismo precio unitario, así que cobrar
 *   ceil(cantidad/2) unidades al precio normal ya cobra "la más cara" de cada par).
 *   Cantidad impar: la unidad suelta se cobra entera, sin descuento.
 */
export function factorPromocion(promocion: PromocionInput | null | undefined, cantidad: number): number {
  if (!promocion) return 1;
  if (promocion.tipo === "porcentaje") {
    const pct = toNumber(promocion.valorPorcentaje ?? 0);
    return 1 - pct / 100;
  }
  if (promocion.tipo === "2x1") {
    if (cantidad <= 0) return 1;
    return Math.ceil(cantidad / 2) / cantidad;
  }
  return 1;
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
