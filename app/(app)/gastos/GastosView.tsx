"use client";

import { useState, useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";
import { fmt, fmtDate } from "@/lib/format";
import { crearGasto, eliminarGasto } from "@/lib/actions/gastos";

type GastoDTO = { id: string; fecha: string; concepto: string; tipo: string; monto: number };

export function GastosView({
  gastos,
  metrics,
}: {
  gastos: GastoDTO[];
  metrics: { fijos: number; variables: number; total: number };
}) {
  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Gastos</h1>
          <p>Fijos y variables — impactan directo en la ganancia final.</p>
        </div>
      </header>

      <div className="grid-metrics">
        <div className="metric">
          <div className="label">Fijos (mes)</div>
          <div className="value">{fmt(metrics.fijos)}</div>
        </div>
        <div className="metric">
          <div className="label">Variables (mes)</div>
          <div className="value">{fmt(metrics.variables)}</div>
        </div>
        <div className="metric">
          <div className="label">Total (mes)</div>
          <div className="value neg">{fmt(metrics.total)}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <NuevoGastoForm />
      </div>

      <div className="card">
        {gastos.length === 0 ? (
          <p className="empty">Todavía no cargaste gastos.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th><th>Concepto</th><th>Tipo</th><th>Monto</th><th></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => <GastoRow key={g.id} gasto={g} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function GastoRow({ gasto }: { gasto: GastoDTO }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr>
      <td>{fmtDate(gasto.fecha)}</td>
      <td>{gasto.concepto}</td>
      <td><span className={`tag ${gasto.tipo}`}>{gasto.tipo === "fijo" ? "Fijo" : "Variable"}</span></td>
      <td className="num">{fmt(gasto.monto)}</td>
      <td>
        <button className="btn danger small" type="button" disabled={pending} onClick={() => startTransition(() => eliminarGasto(gasto.id))}>
          <IconTrash size={14} />
        </button>
      </td>
    </tr>
  );
}

function NuevoGastoForm() {
  const [concepto, setConcepto] = useState("");
  const [tipo, setTipo] = useState<"fijo" | "variable">("fijo");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearGasto({ concepto, tipo, monto: Number(monto) });
        setConcepto(""); setMonto("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="field" style={{ minWidth: 220 }}>
        <label htmlFor="g-concepto">Concepto</label>
        <input id="g-concepto" placeholder="Alquiler, luz, insumos..." value={concepto} onChange={(e) => setConcepto(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="g-tipo">Tipo</label>
        <select id="g-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as "fijo" | "variable")}>
          <option value="fijo">Fijo</option>
          <option value="variable">Variable</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="g-monto">Monto</label>
        <input id="g-monto" type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} required />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
      <button className="btn" type="submit" disabled={pending}>Agregar gasto</button>
    </form>
  );
}
