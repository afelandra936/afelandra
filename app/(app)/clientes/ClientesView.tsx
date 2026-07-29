"use client";

import { useState, useTransition } from "react";
import { IconTrash, IconCake } from "@tabler/icons-react";
import { fmt, fmtDate } from "@/lib/format";
import { crearCliente, eliminarCliente } from "@/lib/actions/clientes";

type ClienteDTO = {
  id: string;
  nombre: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  instagram: string | null;
  cumple: string | null;
  totalGastado: number;
  compras: number;
  ultima: string | null;
};

export function ClientesView({ clientes, cumpleHoy }: { clientes: ClienteDTO[]; cumpleHoy: ClienteDTO[] }) {
  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Clientes</h1>
          <p>Para armar campañas a tus clientes frecuentes.</p>
        </div>
      </header>

      {cumpleHoy.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <IconCake size={18} /> Cumpleaños de hoy
          </h3>
          {cumpleHoy.map((c) => (
            <span key={c.id} className="tag fijo" style={{ marginRight: 8 }}>{c.nombre}</span>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <NuevoClienteForm />
      </div>

      <div className="card">
        {clientes.length === 0 ? (
          <p className="empty">Todavía no cargaste clientes.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>DNI</th>
                <th>Email</th>
                <th>Instagram</th>
                <th>Cumpleaños</th>
                <th>Última compra</th>
                <th>Compras</th>
                <th>Total gastado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <ClienteRow key={c.id} cliente={c} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ClienteRow({ cliente }: { cliente: ClienteDTO }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar a ${cliente.nombre}?`)) return;
    startTransition(() => eliminarCliente(cliente.id));
  }

  return (
    <tr>
      <td>{cliente.nombre}</td>
      <td>{cliente.telefono ?? cliente.email ?? cliente.instagram ?? "—"}</td>
      <td>{cliente.dni ?? "—"}</td>
      <td>{cliente.email ?? "—"}</td>
      <td>{cliente.instagram ?? "—"}</td>
      <td>{cliente.cumple ? fmtDate(cliente.cumple) : "—"}</td>
      <td>{cliente.ultima ? fmtDate(cliente.ultima) : "—"}</td>
      <td className="num">{cliente.compras}</td>
      <td className="num">{fmt(cliente.totalGastado)}</td>
      <td>
        <button className="btn danger small" type="button" onClick={handleDelete} disabled={pending}>
          <IconTrash size={14} />
        </button>
      </td>
    </tr>
  );
}

function NuevoClienteForm() {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [instagram, setInstagram] = useState("");
  const [cumple, setCumple] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearCliente({ nombre, dni, email, telefono, instagram, cumple: cumple || undefined });
        setNombre(""); setDni(""); setEmail(""); setTelefono(""); setInstagram(""); setCumple("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="cl-nombre">Nombre</label>
        <input id="cl-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="cl-dni">DNI</label>
        <input id="cl-dni" value={dni} onChange={(e) => setDni(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cl-email">Email</label>
        <input id="cl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cl-tel">Teléfono</label>
        <input id="cl-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cl-ig">Instagram</label>
        <input id="cl-ig" placeholder="@usuario" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cl-cumple">Cumpleaños</label>
        <input id="cl-cumple" type="date" value={cumple} onChange={(e) => setCumple(e.target.value)} />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
      <button className="btn" type="submit" disabled={pending}>Agregar cliente</button>
    </form>
  );
}
