"use client";

import { useState, useTransition } from "react";
import { fmt, fmtDate } from "@/lib/format";
import { MEDIOS } from "@/lib/pricing";
import { crearVoucher } from "@/lib/actions/vouchers";
import type { Role } from "@/lib/auth";

type VoucherDTO = {
  id: string;
  codigo: string;
  montoInicial: number;
  saldo: number;
  medioPago: string;
  vendedor: string;
  clienteNombre: string | null;
  observaciones: string | null;
  fecha: string;
};

export function VouchersView({
  role,
  vouchers,
  vendedoresNombres,
}: {
  role: Role;
  vouchers: VoucherDTO[];
  vendedoresNombres: string[];
}) {
  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Vouchers</h1>
          <p>Vendé un voucher para usar como pago en una venta futura.</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <NuevoVoucherForm vendedoresNombres={vendedoresNombres} />
      </div>

      <div className="card">
        {vouchers.length === 0 ? (
          <p className="empty">Todavía no vendiste ningún voucher.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Medio</th>
                <th>Monto inicial</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.id}>
                  <td className="num">{v.codigo}</td>
                  <td>{v.clienteNombre ?? "—"}</td>
                  <td>{v.vendedor}</td>
                  <td>{v.medioPago}</td>
                  <td className="num">{fmt(v.montoInicial)}</td>
                  <td className="num">{fmt(v.saldo)}</td>
                  <td>
                    {v.saldo <= 0 ? (
                      <span className="out-stock">Agotado</span>
                    ) : v.saldo < v.montoInicial ? (
                      <span className="hint">Parcial</span>
                    ) : (
                      <span className="tag calzado">Activo</span>
                    )}
                  </td>
                  <td>{fmtDate(v.fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function NuevoVoucherForm({ vendedoresNombres }: { vendedoresNombres: string[] }) {
  const [codigo, setCodigo] = useState("");
  const [monto, setMonto] = useState("");
  const [medioPago, setMedioPago] = useState<string>(MEDIOS[0]);
  const [vendedor, setVendedor] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCodigoGenerado(null);
    startTransition(async () => {
      const res = await crearVoucher({
        codigo: codigo || undefined,
        monto: Number(monto),
        medioPago,
        vendedor,
        clienteNombre: clienteNombre || undefined,
        observaciones: observaciones || undefined,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setCodigoGenerado(res.codigo);
      setCodigo("");
      setMonto("");
      setClienteNombre("");
      setObservaciones("");
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="vo-codigo">Código (opcional)</label>
        <input id="vo-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Se genera solo si lo dejás vacío" style={{ minWidth: 200 }} />
      </div>
      <div className="field">
        <label htmlFor="vo-monto">Monto</label>
        <input id="vo-monto" type="number" step="0.01" min="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} required style={{ width: 130 }} />
      </div>
      <div className="field">
        <label htmlFor="vo-medio">Medio de pago</label>
        <select id="vo-medio" value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
          {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="vo-vendedor">Vendedor</label>
        <input id="vo-vendedor" value={vendedor} onChange={(e) => setVendedor(e.target.value)} list="vo-vendedores-list" required />
        <datalist id="vo-vendedores-list">
          {vendedoresNombres.map((n) => <option key={n} value={n} />)}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor="vo-cliente">Cliente (opcional)</label>
        <input id="vo-cliente" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} />
      </div>
      <div className="field" style={{ minWidth: 200 }}>
        <label htmlFor="vo-obs">Observaciones</label>
        <input id="vo-obs" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
      {codigoGenerado && (
        <p className="hint" style={{ flexBasis: "100%", fontSize: 14 }}>
          Voucher creado — código: <strong className="num">{codigoGenerado}</strong>
        </p>
      )}
      <button className="btn" type="submit" disabled={pending}>Vender voucher</button>
    </form>
  );
}
