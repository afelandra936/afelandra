"use client";

import { useState, useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";
import { fmt, fmtDate } from "@/lib/format";
import {
  crearProveedor,
  eliminarProveedor,
  crearRemito,
  eliminarRemito,
  crearPagoProveedor,
  eliminarPagoProveedor,
} from "@/lib/actions/proveedores";
import { BarChart } from "@/components/charts/BarChart";
import type { ChartEntry } from "@/lib/reports";

const MEDIOS_PAGO_PROVEEDOR = ["Efectivo", "Transferencia", "Cheque", "Depósito"];

type RemitoDTO = { id: string; fecha: string; numero: string | null; montoSinIva: number; tieneIva: boolean };
type PagoDTO = { id: string; fecha: string; monto: number; medio: string; nota: string | null };
type ProveedorDTO = {
  id: string;
  nombre: string;
  marca: string | null;
  contacto: string | null;
  formaPago: string | null;
  plazo: string | null;
  remitos: RemitoDTO[];
  pagos: PagoDTO[];
  facturado: number;
  debe: number;
};

export function ProveedoresView({
  proveedores,
  chartFacturado,
  chartDeuda,
}: {
  proveedores: ProveedorDTO[];
  chartFacturado: ChartEntry[];
  chartDeuda: ChartEntry[];
}) {
  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Proveedores</h1>
          <p>Contacto, condiciones y estado de cuenta con cada uno.</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <NuevoProveedorForm />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        {proveedores.length === 0 ? (
          <p className="empty">Todavía no cargaste proveedores.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Contacto</th>
                <th>Forma de pago</th>
                <th>Facturado</th>
                <th>Debo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => (
                <ProveedorRow key={p.id} proveedor={p} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section-title">Remitos (mercadería recibida)</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <NuevoRemitoForm proveedores={proveedores} />
        <RemitosTable proveedores={proveedores} />
      </div>

      <div className="section-title">Pagos a proveedores</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <NuevoPagoForm proveedores={proveedores} />
        <PagosTable proveedores={proveedores} />
      </div>

      <div className="section-title">Análisis</div>
      <div className="cols-2">
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 14 }}>Facturado por proveedor</h3>
          <BarChart entries={chartFacturado} />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 14 }}>Deuda por proveedor</h3>
          <BarChart entries={chartDeuda} />
        </div>
      </div>
    </div>
  );
}

function ProveedorRow({ proveedor }: { proveedor: ProveedorDTO }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(`¿Eliminar proveedor ${proveedor.nombre}?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarProveedor(proveedor.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <tr>
      <td>{proveedor.nombre}</td>
      <td>{proveedor.contacto ?? "—"}</td>
      <td>{proveedor.formaPago ?? "—"}</td>
      <td className="num">{fmt(proveedor.facturado)}</td>
      <td className={`num ${proveedor.debe > 0 ? "low-stock" : ""}`}>{fmt(proveedor.debe)}</td>
      <td>
        <button className="btn danger small" type="button" onClick={handleDelete} disabled={pending}>
          <IconTrash size={14} />
        </button>
        {error && <div style={{ color: "var(--danger)", fontSize: 11 }}>{error}</div>}
      </td>
    </tr>
  );
}

function NuevoProveedorForm() {
  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [contacto, setContacto] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [plazo, setPlazo] = useState("");
  const [ultimaCompra, setUltimaCompra] = useState("");
  const [deudaInicial, setDeudaInicial] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearProveedor({
          nombre,
          marca,
          contacto,
          formaPago,
          plazo,
          ultimaCompra: ultimaCompra || undefined,
          deudaInicial: Number(deudaInicial) || 0,
        });
        setNombre(""); setMarca(""); setContacto(""); setFormaPago(""); setPlazo(""); setUltimaCompra(""); setDeudaInicial("0");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="pr-nombre">Nombre</label>
        <input id="pr-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="pr-marca">Marca</label>
        <input id="pr-marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pr-contacto">Contacto</label>
        <input id="pr-contacto" placeholder="Tel. / email" value={contacto} onChange={(e) => setContacto(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pr-forma">Forma de pago</label>
        <input id="pr-forma" placeholder="Contado, 30 días..." value={formaPago} onChange={(e) => setFormaPago(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pr-plazo">Plazo</label>
        <input id="pr-plazo" placeholder="Ej: 15 días" value={plazo} onChange={(e) => setPlazo(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pr-ultima">Última compra</label>
        <input id="pr-ultima" type="date" value={ultimaCompra} onChange={(e) => setUltimaCompra(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pr-deuda">Ajuste deuda inicial</label>
        <input id="pr-deuda" type="number" step="0.01" value={deudaInicial} onChange={(e) => setDeudaInicial(e.target.value)} style={{ width: 110 }} />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
      <button className="btn" type="submit" disabled={pending}>Agregar proveedor</button>
    </form>
  );
}

function NuevoRemitoForm({ proveedores }: { proveedores: ProveedorDTO[] }) {
  const [proveedorId, setProveedorId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [numero, setNumero] = useState("");
  const [montoSinIva, setMontoSinIva] = useState("");
  const [tieneIva, setTieneIva] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proveedorId) { setError("Elegí un proveedor"); return; }
    setError(null);
    startTransition(async () => {
      try {
        await crearRemito({ proveedorId, fecha, numero, montoSinIva: Number(montoSinIva), tieneIva });
        setNumero(""); setMontoSinIva("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="rm-proveedor">Proveedor</label>
        <select id="rm-proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} required>
          <option value="">Elegir...</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="rm-fecha">Fecha</label>
        <input id="rm-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="rm-numero">N° remito</label>
        <input id="rm-numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="rm-monto">Monto sin IVA</label>
        <input id="rm-monto" type="number" step="0.01" min="0" value={montoSinIva} onChange={(e) => setMontoSinIva(e.target.value)} required />
      </div>
      <div className="checkbox-row">
        <input id="rm-iva" type="checkbox" checked={tieneIva} onChange={(e) => setTieneIva(e.target.checked)} />
        <label htmlFor="rm-iva">Tiene IVA (21%)</label>
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
      <button className="btn" type="submit" disabled={pending}>Agregar remito</button>
    </form>
  );
}

function RemitosTable({ proveedores }: { proveedores: ProveedorDTO[] }) {
  const [pending, startTransition] = useTransition();
  const filas = proveedores.flatMap((p) => p.remitos.map((r) => ({ ...r, proveedorNombre: p.nombre })));

  if (filas.length === 0) return <p className="empty">Sin remitos cargados.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Proveedor</th><th>Fecha</th><th>N°</th><th>Monto s/IVA</th><th>IVA</th><th></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((r) => (
          <tr key={r.id}>
            <td>{r.proveedorNombre}</td>
            <td>{fmtDate(r.fecha)}</td>
            <td>{r.numero ?? "—"}</td>
            <td className="num">{fmt(r.montoSinIva)}</td>
            <td>{r.tieneIva ? "Sí" : "No"}</td>
            <td>
              <button className="btn danger small" type="button" disabled={pending} onClick={() => startTransition(() => eliminarRemito(r.id))}>
                <IconTrash size={14} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NuevoPagoForm({ proveedores }: { proveedores: ProveedorDTO[] }) {
  const [proveedorId, setProveedorId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [monto, setMonto] = useState("");
  const [medio, setMedio] = useState(MEDIOS_PAGO_PROVEEDOR[0]);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proveedorId) { setError("Elegí un proveedor"); return; }
    setError(null);
    startTransition(async () => {
      try {
        await crearPagoProveedor({ proveedorId, fecha, monto: Number(monto), medio, nota });
        setMonto(""); setNota("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="pp-proveedor">Proveedor</label>
        <select id="pp-proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} required>
          <option value="">Elegir...</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pp-fecha">Fecha</label>
        <input id="pp-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="pp-monto">Monto</label>
        <input id="pp-monto" type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="pp-medio">Medio</label>
        <select id="pp-medio" value={medio} onChange={(e) => setMedio(e.target.value)}>
          {MEDIOS_PAGO_PROVEEDOR.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="pp-nota">Nota</label>
        <input id="pp-nota" placeholder="Nº de cheque, etc." value={nota} onChange={(e) => setNota(e.target.value)} />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
      <button className="btn" type="submit" disabled={pending}>Agregar pago</button>
    </form>
  );
}

function PagosTable({ proveedores }: { proveedores: ProveedorDTO[] }) {
  const [pending, startTransition] = useTransition();
  const filas = proveedores.flatMap((p) => p.pagos.map((pg) => ({ ...pg, proveedorNombre: p.nombre })));

  if (filas.length === 0) return <p className="empty">Sin pagos cargados.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Proveedor</th><th>Fecha</th><th>Monto</th><th>Medio</th><th>Nota</th><th></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((pg) => (
          <tr key={pg.id}>
            <td>{pg.proveedorNombre}</td>
            <td>{fmtDate(pg.fecha)}</td>
            <td className="num">{fmt(pg.monto)}</td>
            <td>{pg.medio}</td>
            <td>{pg.nota ?? "—"}</td>
            <td>
              <button className="btn danger small" type="button" disabled={pending} onClick={() => startTransition(() => eliminarPagoProveedor(pg.id))}>
                <IconTrash size={14} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
