import { getRentabilidad, getComisionesVendedores, getVentasPorDia } from "@/lib/reports";
import { RentabilidadView } from "./RentabilidadView";

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function RentabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { desde: desdeParam, hasta: hastaParam } = await searchParams;

  const hoy = new Date();
  const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);

  const desde = desdeParam || fechaISO(hace30);
  const hasta = hastaParam || fechaISO(hoy);

  const desdeDate = new Date(`${desde}T00:00:00`);
  const hastaDate = new Date(`${hasta}T23:59:59.999`);

  const [data, comisiones, ventasPorDia] = await Promise.all([
    getRentabilidad(desdeDate, hastaDate),
    getComisionesVendedores(desdeDate, hastaDate),
    getVentasPorDia(desdeDate, hastaDate),
  ]);

  return <RentabilidadView data={data} comisiones={comisiones} ventasPorDia={ventasPorDia} desde={desde} hasta={hasta} />;
}
