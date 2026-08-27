"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconShoppingBag,
  IconPackage,
  IconTruckDelivery,
  IconUsers,
  IconReceipt2,
  IconChartBar,
  IconDiscount2,
  IconCalculator,
  IconTicket,
  IconLogout,
} from "@tabler/icons-react";
import { BrandMark } from "@/components/BrandMark";
import { logoutAction } from "@/lib/actions/auth";
import type { Role } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/resumen", label: "Resumen", icon: IconLayoutDashboard, adminOnly: true },
  { href: "/ventas", label: "Ventas", icon: IconShoppingBag, adminOnly: false },
  { href: "/vouchers", label: "Vouchers", icon: IconTicket, adminOnly: false },
  { href: "/presupuestos", label: "Presupuestos", icon: IconCalculator, adminOnly: false },
  { href: "/promociones", label: "Promociones", icon: IconDiscount2, adminOnly: true },
  { href: "/stock", label: "Stock", icon: IconPackage, adminOnly: false },
  { href: "/proveedores", label: "Proveedores", icon: IconTruckDelivery, adminOnly: true },
  { href: "/clientes", label: "Clientes", icon: IconUsers, adminOnly: false },
  { href: "/gastos", label: "Gastos", icon: IconReceipt2, adminOnly: true },
  { href: "/rentabilidad", label: "Rentabilidad", icon: IconChartBar, adminOnly: true },
] as const;

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => role === "admin" || !item.adminOnly);

  return (
    <aside className="sidebar">
      <div className="brand-mini">
        <BrandMark variant="on-light" priority />
      </div>
      <nav className="nav">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : undefined}>
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <div className="role-badge">{role === "admin" ? "Afelandra (admin)" : "Vendedor"}</div>
        <button className="logout" type="button" onClick={() => logoutAction()}>
          <IconLogout size={16} />
          Cambiar usuario
        </button>
      </div>
    </aside>
  );
}
