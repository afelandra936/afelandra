import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/format";
import { serialize } from "@/lib/serialize";
import { GastosView } from "./GastosView";

export default async function GastosPage() {
  const gastos = await prisma.gasto.findMany({ orderBy: { fecha: "desc" } });

  const hoy = new Date();
  const delMes = gastos.filter(
    (g) => g.fecha.getFullYear() === hoy.getFullYear() && g.fecha.getMonth() === hoy.getMonth()
  );
  const fijos = delMes.filter((g) => g.tipo === "fijo").reduce((acc, g) => acc + toNumber(g.monto), 0);
  const variables = delMes.filter((g) => g.tipo === "variable").reduce((acc, g) => acc + toNumber(g.monto), 0);

  return (
    <GastosView
      gastos={serialize(gastos)}
      metrics={{ fijos, variables, total: fijos + variables }}
    />
  );
}
