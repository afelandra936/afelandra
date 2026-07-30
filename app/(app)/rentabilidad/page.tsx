import { getRentabilidad, getComisionesVendedores } from "@/lib/reports";
import { RentabilidadView } from "./RentabilidadView";

const PERIODOS: Record<string, number | null> = { "7": 7, "30": 30, "90": 90, todo: null };

export default async function RentabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const key = periodo && periodo in PERIODOS ? periodo : "30";
  const [data, comisiones] = await Promise.all([
    getRentabilidad(PERIODOS[key]),
    getComisionesVendedores(PERIODOS[key]),
  ]);

  return <RentabilidadView data={data} comisiones={comisiones} periodoActivo={key} />;
}
