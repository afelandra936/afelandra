import { getConfig } from "@/lib/config";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const config = await getConfig();

  return (
    <LoginForm
      hasPinAdmin={Boolean(config.pinAdminHash)}
      hasPinVendedor={Boolean(config.pinVendedorHash)}
    />
  );
}
