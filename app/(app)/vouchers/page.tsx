import { getSession } from "@/lib/auth";
import { listarVouchers } from "@/lib/actions/vouchers";
import { getConfig } from "@/lib/config";
import { VouchersView } from "./VouchersView";

export default async function VouchersPage() {
  const session = await getSession();
  const [vouchers, config] = await Promise.all([listarVouchers(), getConfig()]);

  return <VouchersView role={session!.role} vouchers={vouchers} vendedoresNombres={config.vendedores} />;
}
