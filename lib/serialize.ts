function deepSerialize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  if (Array.isArray(value)) return value.map(deepSerialize);

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepSerialize(v);
    return out;
  }

  return value;
}

/**
 * Convierte recursivamente Date -> ISO string y Prisma.Decimal -> number, para
 * poder pasar datos del servidor a componentes cliente o devolverlos desde Server Actions.
 * El tipo de salida se toma del genérico T (indicá el DTO esperado en el sitio de uso).
 */
export function serialize<T>(value: unknown): T {
  return deepSerialize(value) as T;
}
