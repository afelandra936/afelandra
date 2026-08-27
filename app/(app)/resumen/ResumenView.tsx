"use client";

import { useRef, useState, useTransition } from "react";
import { IconX } from "@tabler/icons-react";
import { fmt } from "@/lib/format";
import { BarList } from "@/components/ui/BarList";
import {
  actualizarCoeficientes,
  actualizarPin,
  actualizarPreguntaSeguridad,
  agregarItemLista,
  quitarItemLista,
  guardarCoeficientesMarca,
  eliminarCoeficientesMarca,
} from "@/lib/actions/config";
import { exportarDatos, importarDatos } from "@/lib/actions/backup";

type ConfigDTO = {
  debito: number;
  credito3: number;
  credito6: number;
  contado: number;
  talles: string[];
  tallesIndumentaria: string[];
  tallesJeans: string[];
  tiposCalzado: string[];
  tiposAccesorio: string[];
  vendedores: string[];
  preguntaAdmin: string | null;
  preguntaVendedor: string | null;
};

type CoeficienteMarcaDTO = {
  marca: string;
  debito: number;
  credito3: number;
  credito6: number;
  contado: number;
};

type CierreCajaDTO = {
  porMedio: { medio: string; monto: number }[];
  total: number;
  voucherRedimidoHoy: number;
};

export function ResumenView({
  metrics,
  efectivoPorSucursal,
  config,
  coeficientesMarca,
  marcasProductos,
  cierreCaja,
}: {
  metrics: { facturacionHoy: number; facturacionMes: number; gananciaEstimadaMes: number; ticketPromedioMes: number };
  efectivoPorSucursal: { label: string; value: number }[];
  config: ConfigDTO;
  coeficientesMarca: CoeficienteMarcaDTO[];
  marcasProductos: string[];
  cierreCaja: CierreCajaDTO;
}) {
  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Resumen del negocio</h1>
          <p>Cómo viene el mes, de un vistazo.</p>
        </div>
      </header>

      <div className="grid-metrics">
        <div className="metric">
          <div className="label">Facturación de hoy</div>
          <div className="value">{fmt(metrics.facturacionHoy)}</div>
        </div>
        <div className="metric">
          <div className="label">Facturación del mes</div>
          <div className="value">{fmt(metrics.facturacionMes)}</div>
        </div>
        <div className="metric">
          <div className="label">Ganancia estimada (mes)</div>
          <div className={`value ${metrics.gananciaEstimadaMes >= 0 ? "pos" : "neg"}`}>{fmt(metrics.gananciaEstimadaMes)}</div>
        </div>
        <div className="metric">
          <div className="label">Ticket promedio (mes)</div>
          <div className="value">{fmt(metrics.ticketPromedioMes)}</div>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>Cierre de caja de hoy</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              {cierreCaja.porMedio.map((m) => <th key={m.medio}>{m.medio}</th>)}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {cierreCaja.porMedio.map((m) => (
                <td key={m.medio} className="num" style={{ fontSize: 16 }}>{fmt(m.monto)}</td>
              ))}
              <td className="num" style={{ fontSize: 16, fontWeight: 700 }}>{fmt(cierreCaja.total)}</td>
            </tr>
          </tbody>
        </table>
        {cierreCaja.voucherRedimidoHoy > 0 && (
          <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
            Pagado con vouchers hoy: {fmt(cierreCaja.voucherRedimidoHoy)} (no está en el total de arriba — esa plata ya se contó el día que se vendió cada voucher).
          </p>
        )}
      </div>

      <div className="section-title">Efectivo de hoy por sucursal</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <BarList entries={efectivoPorSucursal.map((e) => ({ ...e, display: fmt(e.value) }))} />
      </div>

      <div className="section-title">Coeficientes de precio</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <CoeficientesForm config={config} />
      </div>

      <div className="section-title">Coeficientes propios por marca</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <CoeficientesMarcaSection coeficientesMarca={coeficientesMarca} marcasProductos={marcasProductos} />
      </div>

      <div className="section-title">Talles y tipos de producto</div>
      <div className="card cols-2" style={{ marginBottom: 24 }}>
        <ListaEditable titulo="Talles de calzado" campo="talles" valores={config.talles} />
        <ListaEditable titulo="Talles de indumentaria" campo="tallesIndumentaria" valores={config.tallesIndumentaria} />
        <ListaEditable titulo="Talles de Jeans" campo="tallesJeans" valores={config.tallesJeans} />
        <ListaEditable titulo="Tipos de calzado" campo="tiposCalzado" valores={config.tiposCalzado} />
        <ListaEditable titulo="Tipos de accesorio" campo="tiposAccesorio" valores={config.tiposAccesorio} />
      </div>

      <div className="section-title">Vendedores</div>
      <div className="card" style={{ marginBottom: 24 }}>
        <ListaEditable titulo="Vendedores" campo="vendedores" valores={config.vendedores} />
      </div>

      <div className="section-title">Seguridad</div>
      <div className="card cols-2" style={{ marginBottom: 24 }}>
        <PinForm role="admin" label="Código de acceso — Afelandra (admin)" />
        <PinForm role="empleada" label="Código de acceso — Vendedor" />
      </div>

      <div className="section-title">Recuperación de código olvidado</div>
      <div className="card cols-2" style={{ marginBottom: 24 }}>
        <PreguntaSeguridadForm
          role="admin"
          label="Pregunta de seguridad — Afelandra (admin)"
          preguntaActual={config.preguntaAdmin}
        />
        <PreguntaSeguridadForm
          role="empleada"
          label="Pregunta de seguridad — Vendedor"
          preguntaActual={config.preguntaVendedor}
        />
      </div>

      <div className="section-title">Backup</div>
      <div className="card">
        <BackupControls />
      </div>
    </div>
  );
}

function CoeficientesForm({ config }: { config: ConfigDTO }) {
  const [debito, setDebito] = useState(String(config.debito));
  const [credito3, setCredito3] = useState(String(config.credito3));
  const [credito6, setCredito6] = useState(String(config.credito6));
  const [contado, setContado] = useState(String(config.contado));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    startTransition(async () => {
      await actualizarCoeficientes({
        debito: Number(debito),
        credito3: Number(credito3),
        credito6: Number(credito6),
        contado: Number(contado),
      });
      setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="config-grid">
        <div className="field">
          <label htmlFor="cf-debito">Débito / transferencia (x)</label>
          <input id="cf-debito" type="number" step="0.01" value={debito} onChange={(e) => setDebito(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cf-credito3">Crédito 3 cuotas (x)</label>
          <input id="cf-credito3" type="number" step="0.01" value={credito3} onChange={(e) => setCredito3(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cf-credito6">Crédito 6 cuotas (x)</label>
          <input id="cf-credito6" type="number" step="0.01" value={credito6} onChange={(e) => setCredito6(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cf-contado">Descuento efectivo (%)</label>
          <input id="cf-contado" type="number" step="0.5" value={contado} onChange={(e) => setContado(e.target.value)} />
        </div>
      </div>
      <button className="btn small" type="submit" disabled={pending}>Guardar coeficientes</button>
      {saved && <span className="hint" style={{ marginLeft: 10 }}>Guardado.</span>}
    </form>
  );
}

function CoeficientesMarcaSection({
  coeficientesMarca,
  marcasProductos,
}: {
  coeficientesMarca: CoeficienteMarcaDTO[];
  marcasProductos: string[];
}) {
  const [editando, setEditando] = useState<CoeficienteMarcaDTO | null>(null);
  const [pending, startTransition] = useTransition();

  function handleEliminar(marca: string) {
    if (!confirm(`¿Quitar el coeficiente propio de "${marca}"? Volverá a usar los coeficientes generales.`)) return;
    startTransition(() => eliminarCoeficientesMarca(marca));
  }

  return (
    <div>
      <p className="hint" style={{ marginBottom: 12 }}>
        Las marcas sin coeficiente propio usan los coeficientes generales de arriba.
      </p>
      {coeficientesMarca.length > 0 && (
        <table style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Marca</th>
              <th>Débito/transf. (x)</th>
              <th>3 cuotas (x)</th>
              <th>6 cuotas (x)</th>
              <th>Desc. efectivo (%)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {coeficientesMarca.map((c) => (
              <tr key={c.marca}>
                <td>{c.marca}</td>
                <td className="num">{c.debito}</td>
                <td className="num">{c.credito3}</td>
                <td className="num">{c.credito6}</td>
                <td className="num">{c.contado}</td>
                <td style={{ display: "flex", gap: 6 }}>
                  <button className="btn ghost small" type="button" onClick={() => setEditando(c)}>
                    Editar
                  </button>
                  <button
                    className="btn danger small"
                    type="button"
                    onClick={() => handleEliminar(c.marca)}
                    disabled={pending}
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <CoeficienteMarcaForm
        key={editando?.marca ?? "nuevo"}
        editando={editando}
        marcasProductos={marcasProductos}
        onDone={() => setEditando(null)}
      />
    </div>
  );
}

function CoeficienteMarcaForm({
  editando,
  marcasProductos,
  onDone,
}: {
  editando: CoeficienteMarcaDTO | null;
  marcasProductos: string[];
  onDone: () => void;
}) {
  const [marca, setMarca] = useState(editando?.marca ?? "");
  const [debito, setDebito] = useState(String(editando?.debito ?? ""));
  const [credito3, setCredito3] = useState(String(editando?.credito3 ?? ""));
  const [credito6, setCredito6] = useState(String(editando?.credito6 ?? ""));
  const [contado, setContado] = useState(String(editando?.contado ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!marca.trim()) {
      setError("Elegí una marca");
      return;
    }
    startTransition(async () => {
      try {
        await guardarCoeficientesMarca(marca, {
          debito: Number(debito),
          credito3: Number(credito3),
          credito6: Number(credito6),
          contado: Number(contado),
        });
        setSaved(true);
        if (editando) onDone();
        else {
          setMarca("");
          setDebito("");
          setCredito3("");
          setCredito6("");
          setContado("");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {editando && <p className="hint" style={{ marginBottom: 8 }}>Editando coeficiente de &quot;{editando.marca}&quot;</p>}
      <div className="config-grid">
        <div className="field">
          <label htmlFor="cfm-marca">Marca</label>
          {editando ? (
            <input id="cfm-marca" value={marca} disabled />
          ) : (
            <select id="cfm-marca" value={marca} onChange={(e) => setMarca(e.target.value)}>
              <option value="">Elegí una marca...</option>
              {marcasProductos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
        <div className="field">
          <label htmlFor="cfm-debito">Débito / transferencia (x)</label>
          <input id="cfm-debito" type="number" step="0.01" value={debito} onChange={(e) => setDebito(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cfm-credito3">Crédito 3 cuotas (x)</label>
          <input id="cfm-credito3" type="number" step="0.01" value={credito3} onChange={(e) => setCredito3(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cfm-credito6">Crédito 6 cuotas (x)</label>
          <input id="cfm-credito6" type="number" step="0.01" value={credito6} onChange={(e) => setCredito6(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cfm-contado">Descuento efectivo (%)</label>
          <input id="cfm-contado" type="number" step="0.5" value={contado} onChange={(e) => setContado(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
        <button className="btn small" type="submit" disabled={pending}>
          {editando ? "Guardar cambios" : "Agregar coeficiente por marca"}
        </button>
        {editando && (
          <button className="btn ghost small" type="button" onClick={onDone} disabled={pending}>
            Cancelar
          </button>
        )}
        {saved && !editando && <span className="hint">Guardado.</span>}
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 6 }}>{error}</p>}
    </form>
  );
}

function ListaEditable({
  titulo,
  campo,
  valores,
}: {
  titulo: string;
  campo: "talles" | "tallesIndumentaria" | "tallesJeans" | "tiposCalzado" | "tiposAccesorio" | "vendedores";
  valores: string[];
}) {
  const [nuevo, setNuevo] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.trim()) return;
    startTransition(async () => {
      await agregarItemLista(campo, nuevo.trim());
      setNuevo("");
    });
  }

  return (
    <div>
      <h3 style={{ fontSize: 13, marginBottom: 8 }}>{titulo}</h3>
      <div className="talles-grid" style={{ marginBottom: 8 }}>
        {valores.map((v) => (
          <span key={v} className="tag fijo" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {v}
            <button
              type="button"
              onClick={() => startTransition(() => quitarItemLista(campo, v))}
              style={{ all: "unset", cursor: "pointer", display: "flex" }}
              disabled={pending}
            >
              <IconX size={12} />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 6 }}>
        <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} style={{ height: 30, fontSize: 12 }} placeholder="Agregar..." />
        <button className="btn ghost small" type="submit" disabled={pending}>+</button>
      </form>
    </div>
  );
}

function PinForm({ role, label }: { role: "admin" | "empleada"; label: string }) {
  const [pin, setPin] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    startTransition(async () => {
      await actualizarPin(role, pin);
      setSaved(true);
      setPin("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="field">
      <label>{label}</label>
      <input type="password" placeholder="Dejar vacío para quitar el código" value={pin} onChange={(e) => setPin(e.target.value)} style={{ marginBottom: 8, maxWidth: 220 }} />
      <div>
        <button className="btn small" type="submit" disabled={pending}>Guardar</button>
        {saved && <span className="hint" style={{ marginLeft: 10 }}>Guardado.</span>}
      </div>
    </form>
  );
}

function PreguntaSeguridadForm({
  role,
  label,
  preguntaActual,
}: {
  role: "admin" | "empleada";
  label: string;
  preguntaActual: string | null;
}) {
  const [pregunta, setPregunta] = useState(preguntaActual ?? "");
  const [respuesta, setRespuesta] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    startTransition(async () => {
      await actualizarPreguntaSeguridad(role, pregunta, respuesta);
      setSaved(true);
      setRespuesta("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="field">
      <label>{label}</label>
      <input
        placeholder="Pregunta (ej: ¿Nombre de tu primera mascota?)"
        value={pregunta}
        onChange={(e) => setPregunta(e.target.value)}
        style={{ marginBottom: 6, maxWidth: 280 }}
      />
      <input
        placeholder={preguntaActual ? "Nueva respuesta (dejar vacío para quitar la pregunta)" : "Respuesta"}
        value={respuesta}
        onChange={(e) => setRespuesta(e.target.value)}
        style={{ marginBottom: 8, maxWidth: 280 }}
      />
      <div>
        <button className="btn small" type="submit" disabled={pending}>Guardar</button>
        {saved && <span className="hint" style={{ marginLeft: 10 }}>Guardado.</span>}
      </div>
    </form>
  );
}

function BackupControls() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleExport() {
    const data = await exportarDatos();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afelandra-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Esto reemplaza TODOS los datos actuales por los del backup. ¿Continuar?")) {
      e.target.value = "";
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          await importarDatos(parsed);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Archivo inválido");
        }
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <button className="btn ghost small" type="button" onClick={handleExport}>Exportar backup (.json)</button>
      <button className="btn ghost small" type="button" onClick={handleImportClick} disabled={pending}>
        Importar backup
      </button>
      <input ref={fileRef} type="file" accept="application/json" onChange={handleFileChange} style={{ display: "none" }} />
      {error && <span style={{ color: "var(--danger)", fontSize: 12 }}>{error}</span>}
    </div>
  );
}
