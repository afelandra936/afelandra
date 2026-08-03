"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { serialize } from "@/lib/serialize";
import { revalidatePath } from "next/cache";

export type BackupData = {
  exportadoEl: string;
  productos: {
    id: string; nombre: string; tipo: string; color: string; marca: string;
    proveedorId: string | null; talle: string; costo: number; stock: number;
    stockMin: number; codigo: string | null;
  }[];
  ventas: {
    id: string; fecha: string; productoId: string; nombre: string; tipo: string;
    proveedor: string | null; talle: string; cantidad: number; medioPago: string;
    vendedor: string; clienteId: string | null; clienteNombre: string | null;
    observaciones: string | null; sucursal: string | null; precioVenta: number;
    costoUnitario: number; promocionId: string | null; promocionNombre: string | null;
    pagos: { id: string; ventaId: string; medio: string; monto: number }[];
  }[];
  promociones: {
    id: string; nombre: string; tipo: string; valorPorcentaje: number | null;
    fechaDesde: string | null; fechaHasta: string | null; activa: boolean;
  }[];
  gastos: { id: string; fecha: string; concepto: string; tipo: string; monto: number }[];
  proveedores: {
    id: string; nombre: string; marca: string | null; contacto: string | null;
    formaPago: string | null; plazo: string | null; ultimaCompra: string | null;
    deudaInicial: number;
  }[];
  remitos: {
    id: string; proveedorId: string; fecha: string; numero: string | null;
    montoSinIva: number; tieneIva: boolean;
  }[];
  pagosProveedores: {
    id: string; proveedorId: string; fecha: string; monto: number; medio: string; nota: string | null;
  }[];
  clientes: {
    id: string; nombre: string; dni: string | null; email: string | null;
    telefono: string | null; instagram: string | null; cumple: string | null;
  }[];
  config: {
    id: number; debito: number; credito3: number; credito6: number; contado: number;
    pinAdminHash: string | null; pinVendedorHash: string | null;
    talles: string[]; tallesIndumentaria: string[]; tiposCalzado: string[]; tiposAccesorio: string[];
  };
  coeficientesMarca: {
    id: string; marca: string; debito: number; credito3: number; credito6: number; contado: number;
  }[];
};

export async function exportarDatos(): Promise<BackupData> {
  await requireRole("admin");

  const [productos, ventas, gastos, proveedores, remitos, pagosProveedores, clientes, config, promociones, coeficientesMarca] =
    await Promise.all([
      prisma.producto.findMany(),
      prisma.venta.findMany({ include: { pagos: true } }),
      prisma.gasto.findMany(),
      prisma.proveedor.findMany(),
      prisma.remito.findMany(),
      prisma.pagoProveedor.findMany(),
      prisma.cliente.findMany(),
      getConfig(),
      prisma.promocion.findMany(),
      prisma.coeficienteMarca.findMany(),
    ]);

  return serialize<BackupData>({
    exportadoEl: new Date().toISOString(),
    productos,
    ventas,
    gastos,
    proveedores,
    remitos,
    pagosProveedores,
    clientes,
    config,
    promociones,
    coeficientesMarca,
  });
}

export async function importarDatos(data: BackupData) {
  await requireRole("admin");

  await prisma.$transaction(async (tx) => {
    await tx.pagoVenta.deleteMany();
    await tx.venta.deleteMany();
    await tx.remito.deleteMany();
    await tx.pagoProveedor.deleteMany();
    await tx.producto.deleteMany();
    await tx.cliente.deleteMany();
    await tx.proveedor.deleteMany();
    await tx.promocion.deleteMany();
    await tx.coeficienteMarca.deleteMany();

    for (const p of data.proveedores) {
      await tx.proveedor.create({
        data: {
          id: p.id,
          nombre: p.nombre,
          marca: p.marca,
          contacto: p.contacto,
          formaPago: p.formaPago,
          plazo: p.plazo,
          ultimaCompra: p.ultimaCompra ? new Date(p.ultimaCompra) : null,
          deudaInicial: p.deudaInicial,
        },
      });
    }

    for (const c of data.clientes) {
      await tx.cliente.create({
        data: {
          id: c.id,
          nombre: c.nombre,
          dni: c.dni,
          email: c.email,
          telefono: c.telefono,
          instagram: c.instagram,
          cumple: c.cumple ? new Date(c.cumple) : null,
        },
      });
    }

    for (const p of data.productos) {
      await tx.producto.create({
        data: {
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          color: p.color,
          marca: p.marca,
          proveedorId: p.proveedorId,
          talle: p.talle,
          costo: p.costo,
          stock: p.stock,
          stockMin: p.stockMin,
          codigo: p.codigo,
        },
      });
    }

    for (const promo of data.promociones) {
      await tx.promocion.create({
        data: {
          id: promo.id,
          nombre: promo.nombre,
          tipo: promo.tipo,
          valorPorcentaje: promo.valorPorcentaje,
          fechaDesde: promo.fechaDesde ? new Date(promo.fechaDesde) : null,
          fechaHasta: promo.fechaHasta ? new Date(promo.fechaHasta) : null,
          activa: promo.activa,
        },
      });
    }

    for (const v of data.ventas) {
      await tx.venta.create({
        data: {
          id: v.id,
          fecha: new Date(v.fecha),
          productoId: v.productoId,
          nombre: v.nombre,
          tipo: v.tipo,
          proveedor: v.proveedor,
          talle: v.talle,
          cantidad: v.cantidad,
          medioPago: v.medioPago,
          vendedor: v.vendedor,
          clienteId: v.clienteId,
          clienteNombre: v.clienteNombre,
          observaciones: v.observaciones,
          sucursal: v.sucursal,
          precioVenta: v.precioVenta,
          costoUnitario: v.costoUnitario,
          promocionId: v.promocionId,
          promocionNombre: v.promocionNombre,
          pagos: { createMany: { data: v.pagos.map((pg) => ({ medio: pg.medio, monto: pg.monto })) } },
        },
      });
    }

    for (const g of data.gastos) {
      await tx.gasto.create({
        data: { id: g.id, fecha: new Date(g.fecha), concepto: g.concepto, tipo: g.tipo, monto: g.monto },
      });
    }

    for (const r of data.remitos) {
      await tx.remito.create({
        data: {
          id: r.id,
          proveedorId: r.proveedorId,
          fecha: new Date(r.fecha),
          numero: r.numero,
          montoSinIva: r.montoSinIva,
          tieneIva: r.tieneIva,
        },
      });
    }

    for (const pg of data.pagosProveedores) {
      await tx.pagoProveedor.create({
        data: {
          id: pg.id,
          proveedorId: pg.proveedorId,
          fecha: new Date(pg.fecha),
          monto: pg.monto,
          medio: pg.medio,
          nota: pg.nota,
        },
      });
    }

    for (const c of data.coeficientesMarca) {
      await tx.coeficienteMarca.create({
        data: { id: c.id, marca: c.marca, debito: c.debito, credito3: c.credito3, credito6: c.credito6, contado: c.contado },
      });
    }

    await tx.config.update({
      where: { id: 1 },
      data: {
        debito: data.config.debito,
        credito3: data.config.credito3,
        credito6: data.config.credito6,
        contado: data.config.contado,
        talles: data.config.talles,
        tallesIndumentaria: data.config.tallesIndumentaria,
        tiposCalzado: data.config.tiposCalzado,
        tiposAccesorio: data.config.tiposAccesorio,
      },
    });
  });

  for (const path of ["/resumen", "/ventas", "/stock", "/proveedores", "/clientes", "/gastos", "/rentabilidad", "/promociones"]) {
    revalidatePath(path);
  }
}
