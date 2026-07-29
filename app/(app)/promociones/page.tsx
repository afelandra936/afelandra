import { prisma } from "@/lib/prisma";
import { serialize } from "@/lib/serialize";
import { PromocionesView } from "./PromocionesView";

export default async function PromocionesPage() {
  const promociones = await prisma.promocion.findMany({ orderBy: { createdAt: "desc" } });

  return <PromocionesView promociones={serialize(promociones)} />;
}
