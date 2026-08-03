"use client";

import { useState, useTransition, type FormEvent } from "react";
import { IconCrown, IconUser } from "@tabler/icons-react";
import { BrandMark } from "@/components/BrandMark";
import { loginAction, obtenerPreguntaSeguridad, resetearPinConRespuesta } from "@/lib/actions/auth";
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
  const [recuperando, setRecuperando] = useState(false);
  const [pregunta, setPregunta] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [nuevoPin, setNuevoPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [recuperarError, setRecuperarError] = useState<string | null>(null);
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

  function volverDesdeInicio() {
    setSelected(null);
    setRecuperando(false);
    setPregunta(null);
    setRespuesta("");
    setNuevoPin("");
    setConfirmarPin("");
    setError(null);
    setRecuperarError(null);
  }

  function iniciarRecuperacion() {
    if (!selected) return;
    setError(null);
    setRecuperarError(null);
    startTransition(async () => {
      const p = await obtenerPreguntaSeguridad(selected);
      if (!p) {
        setError("No hay pregunta de seguridad configurada para este rol. Pedile al admin que la configure en Resumen → Seguridad.");
        return;
      }
      setPregunta(p);
      setRecuperando(true);
    });
  }

  function submitRecuperar(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setRecuperarError(null);
    if (!nuevoPin.trim()) {
      setRecuperarError("Ingresá un código nuevo");
      return;
    }
    if (nuevoPin !== confirmarPin) {
      setRecuperarError("Los códigos no coinciden");
      return;
    }
    startTransition(async () => {
      const res = await resetearPinConRespuesta(selected, respuesta, nuevoPin);
      if (res?.error) setRecuperarError(res.error);
    });
  }

  return (
    <div id="login">
      <div className="brand">
        <BrandMark variant="on-light" priority />
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
      ) : recuperando ? (
        <form className="card" onSubmit={submitRecuperar} style={{ display: "flex", flexDirection: "column", gap: 12, width: 280 }}>
          <p className="hint" style={{ margin: 0 }}>{pregunta}</p>
          <div className="field">
            <label htmlFor="respuesta">Respuesta</label>
            <input id="respuesta" autoFocus value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="nuevo-pin">Código nuevo</label>
            <input
              id="nuevo-pin"
              type="password"
              inputMode="numeric"
              value={nuevoPin}
              onChange={(e) => setNuevoPin(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="confirmar-pin">Confirmar código nuevo</label>
            <input
              id="confirmar-pin"
              type="password"
              inputMode="numeric"
              value={confirmarPin}
              onChange={(e) => setConfirmarPin(e.target.value)}
            />
          </div>
          {recuperarError && <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>{recuperarError}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn ghost" onClick={volverDesdeInicio} disabled={pending}>
              Volver
            </button>
            <button type="submit" className="btn" disabled={pending}>
              Restablecer y entrar
            </button>
          </div>
        </form>
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
            <button type="button" className="btn ghost" onClick={volverDesdeInicio} disabled={pending}>
              Volver
            </button>
            <button type="submit" className="btn" disabled={pending}>
              Entrar
            </button>
          </div>
          <button type="button" className="hint" style={{ all: "unset", cursor: "pointer", textDecoration: "underline" }} onClick={iniciarRecuperacion} disabled={pending}>
            ¿Olvidaste tu código?
          </button>
        </form>
      )}
    </div>
  );
}
