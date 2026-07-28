import type { Prisma } from "@/app/generated/prisma/client";

type Numeric = number | string | Prisma.Decimal;

export function toNumber(value: Numeric): number {
  return typeof value === "number" ? value : Number(value);
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function fmt(value: Numeric): string {
  return currencyFormatter.format(toNumber(value));
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function fmtDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return dateFormatter.format(date);
}
