"use client";

import { useState, useTransition, type FormEvent } from "react";
import { IconCrown, IconUser } from "@tabler/icons-react";
import { BrandMark } from "@/components/BrandMark";
import { loginAction } from "@/lib/actions/auth";
import type { Role } from "@/lib/auth";

export function LoginForm({
  hasPinAdmin,
  hasPinVendedor,
}: {
  hasPinAdmin: boolean;
  hasPinVendedor: boolean;
}) {
  const [selected, setSelected] = useState<Role | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function selectRole(role: Role) {
    setError(null);
    setPin("");
    const requiresPin = role === "admin" ? hasPinAdmin : hasPinVendedor;
    if (!requiresPin) {
      startTransition(() => {
        loginAction(role, "");
      });
      return;
    }
    setSelected(role);
  }

  function submitPin(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await loginAction(selected, pin);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div id="login">
      <div className="brand">
        <BrandMark variant="on-dark" priority />
        <p>Gestión</p>
      </div>

      {!selected ? (
        <div className="role-cards">
          <button className="role-card" type="button" onClick={() => selectRole("admin")} disabled={pending}>
            <IconCrown />
            <h3>Afelandra</h3>
            <p>Acceso completo al negocio.</p>
          </button>
          <button className="role-card" type="button" onClick={() => selectRole("empleada")} disabled={pending}>
            <IconUser />
            <h3>Vendedor</h3>
            <p>Cargar ventas y consultar stock.</p>
          </button>
        </div>
      ) : (
        <form className="card" onSubmit={submitPin} style={{ display: "flex", flexDirection: "column", gap: 12, width: 260 }}>
          <div className="field">
            <label htmlFor="pin">Código de acceso</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn ghost" onClick={() => setSelected(null)} disabled={pending}>
              Volver
            </button>
            <button type="submit" className="btn" disabled={pending}>
              Entrar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
