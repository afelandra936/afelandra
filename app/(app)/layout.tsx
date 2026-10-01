import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { InactivityLogout } from "@/components/auth/InactivityLogout";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div id="shell">
      <InactivityLogout />
      <Sidebar role={session.role} />
      <main>{children}</main>
    </div>
  );
}
