import { toNumber } from "@/lib/format";

type StockRow = { stock: number; stockMin: number };

export function esStockBajo(p: StockRow): boolean {
  return p.stock > 0 && p.stock <= p.stockMin;
}

export function esAgotado(p: StockRow): boolean {
  return p.stock === 0;
}

export function valorStock(productos: { stock: number; costo: unknown }[]): number {
  return productos.reduce((acc, p) => acc + p.stock * toNumber(p.costo as never), 0);
}
