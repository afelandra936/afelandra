import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";
import { serialize } from "@/lib/serialize";
import { ClientesView } from "./ClientesView";

export default async function ClientesPage() {
  const [clientes, ventas] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nombre: "asc" } }),
    prisma.venta.findMany({
      select: { clienteId: true, clienteNombre: true, precioVenta: true, cantidad: true, fecha: true },
    }),
  ]);

  const conStats = clientes.map((c) => {
    const propias = ventas.filter(
      (v) => v.clienteId === c.id || (!v.clienteId && v.clienteNombre?.toLowerCase() === c.nombre.toLowerCase())
    );
    const totalGastado = propias.reduce((acc, v) => acc + toNumber(v.precioVenta) * v.cantidad, 0);
    const ultima = propias.length
      ? propias.reduce((max, v) => (v.fecha > max ? v.fecha : max), propias[0].fecha)
      : null;
    return { ...c, totalGastado, compras: propias.length, ultima };
  });

  const hoy = new Date();
  const cumpleHoy = clientes.filter(
    (c) => c.cumple && c.cumple.getMonth() === hoy.getMonth() && c.cumple.getDate() === hoy.getDate()
  );

  return <ClientesView clientes={serialize(conStats)} cumpleHoy={serialize(cumpleHoy)} />;
}
