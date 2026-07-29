"use client";

import { useState, useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";
import { crearPromocion, actualizarPromocion, eliminarPromocion, type PromocionInput } from "@/lib/actions/promociones";

type PromocionDTO = {
  id: string;
  nombre: string;
  tipo: string;
  valorPorcentaje: number | null;
  fechaDesde: string | null;
  fechaHasta: string | null;
  activa: boolean;
};

export function PromocionesView({ promociones }: { promociones: PromocionDTO[] }) {
  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Promociones</h1>
          <p>Descuentos por % o 2x1, disponibles para aplicar al cargar una venta.</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <NuevaPromocionForm />
      </div>

      <div className="card">
        {promociones.length === 0 ? (
          <p className="empty">Todavía no cargaste promociones.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>%</th>
                <th>Desde</th>
                <th>Hasta</th>
                <th>Activa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {promociones.map((p) => (
                <PromocionRow key={p.id} promocion={p} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PromocionRow({ promocion }: { promocion: PromocionDTO }) {
  const [nombre, setNombre] = useState(promocion.nombre);
  const [tipo, setTipo] = useState<"porcentaje" | "2x1">(promocion.tipo === "2x1" ? "2x1" : "porcentaje");
  const [valorPorcentaje, setValorPorcentaje] = useState(String(promocion.valorPorcentaje ?? ""));
  const [fechaDesde, setFechaDesde] = useState(promocion.fechaDesde?.slice(0, 10) ?? "");
  const [fechaHasta, setFechaHasta] = useState(promocion.fechaHasta?.slice(0, 10) ?? "");
  const [activa, setActiva] = useState(promocion.activa);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function commit(overrides: Partial<{
    nombre: string;
    tipo: "porcentaje" | "2x1";
    valorPorcentaje: string;
    fechaDesde: string;
    fechaHasta: string;
    activa: boolean;
  }>) {
    const next = { nombre, tipo, valorPorcentaje, fechaDesde, fechaHasta, activa, ...overrides };
    const data: PromocionInput = {
      nombre: next.nombre,
      tipo: next.tipo,
      valorPorcentaje: next.tipo === "porcentaje" ? Number(next.valorPorcentaje) || 0 : null,
      fechaDesde: next.fechaDesde || null,
      fechaHasta: next.fechaHasta || null,
      activa: next.activa,
    };
    setError(null);
    startTransition(async () => {
      try {
        await actualizarPromocion(promocion.id, data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar la promoción "${promocion.nombre}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarPromocion(promocion.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <tr>
      <td>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => nombre !== promocion.nombre && commit({})}
          style={{ minWidth: 160 }}
          disabled={pending}
        />
      </td>
      <td>
        <select
          value={tipo}
          onChange={(e) => {
            const t = e.target.value as "porcentaje" | "2x1";
            setTipo(t);
            commit({ tipo: t });
          }}
          disabled={pending}
        >
          <option value="porcentaje">Porcentaje</option>
          <option value="2x1">2x1</option>
        </select>
      </td>
      <td>
        <input
          className="num"
          type="number"
          min={1}
          max={100}
          value={valorPorcentaje}
          onChange={(e) => setValorPorcentaje(e.target.value)}
          onBlur={() => commit({})}
          disabled={pending || tipo !== "porcentaje"}
          style={{ width: 70 }}
        />
      </td>
      <td>
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => {
            setFechaDesde(e.target.value);
            commit({ fechaDesde: e.target.value });
          }}
          disabled={pending}
        />
      </td>
      <td>
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => {
            setFechaHasta(e.target.value);
            commit({ fechaHasta: e.target.value });
          }}
          disabled={pending}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={activa}
          onChange={(e) => {
            setActiva(e.target.checked);
            commit({ activa: e.target.checked });
          }}
          disabled={pending}
        />
      </td>
      <td>
        <button className="btn danger small" type="button" onClick={handleDelete} disabled={pending}>
          <IconTrash size={14} />
        </button>
        {error && <div style={{ color: "var(--danger)", fontSize: 11, marginTop: 4 }}>{error}</div>}
      </td>
    </tr>
  );
}

function NuevaPromocionForm() {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"porcentaje" | "2x1">("porcentaje");
  const [valorPorcentaje, setValorPorcentaje] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [activa, setActiva] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearPromocion({
          nombre,
          tipo,
          valorPorcentaje: tipo === "porcentaje" ? Number(valorPorcentaje) || 0 : null,
          fechaDesde: fechaDesde || null,
          fechaHasta: fechaHasta || null,
          activa,
        });
        setNombre("");
        setValorPorcentaje("");
        setFechaDesde("");
        setFechaHasta("");
        setActiva(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="field" style={{ minWidth: 200 }}>
        <label htmlFor="pm-nombre">Nombre</label>
        <input
          id="pm-nombre"
          placeholder="Liquidación fin de temporada"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="pm-tipo">Tipo</label>
        <select id="pm-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as "porcentaje" | "2x1")}>
          <option value="porcentaje">Porcentaje</option>
          <option value="2x1">2x1</option>
        </select>
      </div>
      {tipo === "porcentaje" && (
        <div className="field">
          <label htmlFor="pm-valor">% descuento</label>
          <input
            id="pm-valor"
            type="number"
            min={1}
            max={100}
            value={valorPorcentaje}
            onChange={(e) => setValorPorcentaje(e.target.value)}
            required
            style={{ width: 80 }}
          />
        </div>
      )}
      <div className="field">
        <label htmlFor="pm-desde">Desde (opcional)</label>
        <input id="pm-desde" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pm-hasta">Hasta (opcional)</label>
        <input id="pm-hasta" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
      </div>
      <div className="checkbox-row">
        <input id="pm-activa" type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
        <label htmlFor="pm-activa">Activa</label>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
      <button className="btn" type="submit" disabled={pending}>
        Crear promoción
      </button>
    </form>
  );
}
