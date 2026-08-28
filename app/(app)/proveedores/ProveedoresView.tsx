"use client";

import { Fragment, useState, useTransition, useEffect } from "react";
import { IconTrash, IconPencil, IconChevronDown, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { fmt, fmtDate } from "@/lib/format";
import {
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  crearRemito,
  eliminarRemito,
  crearPagoProveedor,
  eliminarPagoProveedor,
  type RemitoItemInput,
} from "@/lib/actions/proveedores";
import {
  buscarModelosParaRemito,
  buscarColoresParaRemito,
  buscarVariantesParaRemito,
  obtenerInfoModelo,
  type ProductoBusqueda,
} from "@/lib/actions/productos";
import { BarChart } from "@/components/charts/BarChart";
import type { ChartEntry } from "@/lib/reports";

const MEDIOS_PAGO_PROVEEDOR = ["Efectivo", "Transferencia", "Cheque", "Depósito"];

type RemitoItemDTO = { id: string; nombre: string; color: string; talle: string; cantidad: number; costoUnitario: number };
type RemitoDTO = { id: string; fecha: string; numero: string | null; montoSinIva: number; tieneIva: boolean; items: RemitoItemDTO[] };
type PagoDTO = { id: string; fecha: string; monto: number; medio: string; nota: string | null };
type ProveedorDTO = {
  id: string;
  nombre: string;
  marca: string | null;
  contacto: string | null;
  formaPago: string | null;
  plazo: string | null;
  ultimaCompra: string | null;
  deudaInicial: number;
  remitos: RemitoDTO[];
  pagos: PagoDTO[];
  facturado: number;
  debe: number;
};

export function ProveedoresView({
  proveedores,
  chartFacturado,
  chartDeuda,
  tiposCalzado,
  tiposAccesorio,
  marcasProductos,
}: {
  proveedores: ProveedorDTO[];
  chartFacturado: ChartEntry[];
  chartDeuda: ChartEntry[];
  tiposCalzado: string[];
  tiposAccesorio: string[];
  marcasProductos: string[];
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
                <th>Marca</th>
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
        <NuevoRemitoForm proveedores={proveedores} tiposCalzado={tiposCalzado} tiposAccesorio={tiposAccesorio} marcasProductos={marcasProductos} />
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
  const [editing, setEditing] = useState(false);
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

  if (editing) {
    return <EditProveedorRow proveedor={proveedor} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;
  }

  return (
    <tr>
      <td>{proveedor.nombre}</td>
      <td>{proveedor.marca ?? "—"}</td>
      <td>{proveedor.contacto ?? "—"}</td>
      <td>{proveedor.formaPago ?? "—"}</td>
      <td className="num">{fmt(proveedor.facturado)}</td>
      <td className={`num ${proveedor.debe > 0 ? "low-stock" : ""}`}>{fmt(proveedor.debe)}</td>
      <td>
        <span style={{ display: "flex", gap: 6 }}>
          <button className="btn ghost small" type="button" onClick={() => setEditing(true)} disabled={pending}>
            <IconPencil size={14} />
          </button>
          <button className="btn danger small" type="button" onClick={handleDelete} disabled={pending}>
            <IconTrash size={14} />
          </button>
        </span>
        {error && <div style={{ color: "var(--danger)", fontSize: 11 }}>{error}</div>}
      </td>
    </tr>
  );
}

function EditProveedorRow({
  proveedor,
  onDone,
  onCancel,
}: {
  proveedor: ProveedorDTO;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(proveedor.nombre);
  const [marca, setMarca] = useState(proveedor.marca ?? "");
  const [contacto, setContacto] = useState(proveedor.contacto ?? "");
  const [formaPago, setFormaPago] = useState(proveedor.formaPago ?? "");
  const [plazo, setPlazo] = useState(proveedor.plazo ?? "");
  const [ultimaCompra, setUltimaCompra] = useState(proveedor.ultimaCompra?.slice(0, 10) ?? "");
  const [deudaInicial, setDeudaInicial] = useState(String(proveedor.deudaInicial));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await actualizarProveedor(proveedor.id, {
          nombre,
          marca,
          contacto,
          formaPago,
          plazo,
          ultimaCompra: ultimaCompra || undefined,
          deudaInicial: Number(deudaInicial) || 0,
        });
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <tr>
      <td colSpan={7}>
        <form className="inline-form" onSubmit={handleSubmit} style={{ marginBottom: 0 }}>
          <div className="field">
            <label htmlFor={`ep-nombre-${proveedor.id}`}>Nombre</label>
            <input id={`ep-nombre-${proveedor.id}`} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor={`ep-marca-${proveedor.id}`}>Marca</label>
            <input id={`ep-marca-${proveedor.id}`} value={marca} onChange={(e) => setMarca(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`ep-contacto-${proveedor.id}`}>Contacto</label>
            <input id={`ep-contacto-${proveedor.id}`} value={contacto} onChange={(e) => setContacto(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`ep-forma-${proveedor.id}`}>Forma de pago</label>
            <input id={`ep-forma-${proveedor.id}`} value={formaPago} onChange={(e) => setFormaPago(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`ep-plazo-${proveedor.id}`}>Plazo</label>
            <input id={`ep-plazo-${proveedor.id}`} value={plazo} onChange={(e) => setPlazo(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`ep-ultima-${proveedor.id}`}>Última compra</label>
            <input id={`ep-ultima-${proveedor.id}`} type="date" value={ultimaCompra} onChange={(e) => setUltimaCompra(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`ep-deuda-${proveedor.id}`}>Deuda inicial</label>
            <input
              id={`ep-deuda-${proveedor.id}`}
              type="number"
              step="0.01"
              value={deudaInicial}
              onChange={(e) => setDeudaInicial(e.target.value)}
              style={{ width: 110 }}
            />
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
          <button className="btn" type="submit" disabled={pending}>Guardar</button>
          <button className="btn ghost" type="button" onClick={onCancel} disabled={pending}>Cancelar</button>
        </form>
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

type ItemBorrador = {
  clave: string;
  productoId?: string; // seteado cuando el modelo+color+talle elegidos ya existen en Stock
  esNuevo: boolean; // el usuario tildó "es un producto nuevo" explícitamente
  modeloQuery: string;
  modelo: string | null;
  color: string;
  colorEsNuevo: boolean;
  talle: string;
  talleEsNuevo: boolean;
  tipo: string;
  marca: string;
  cantidad: string;
  costoUnitario: string;
};

function nuevoItemBorrador(tipoDefault: string): ItemBorrador {
  return {
    clave: Math.random().toString(36).slice(2),
    esNuevo: false,
    modeloQuery: "",
    modelo: null,
    color: "",
    colorEsNuevo: false,
    talle: "",
    talleEsNuevo: false,
    tipo: tipoDefault,
    marca: "",
    cantidad: "1",
    costoUnitario: "",
  };
}

function NuevoRemitoForm({
  proveedores,
  tiposCalzado,
  tiposAccesorio,
  marcasProductos,
}: {
  proveedores: ProveedorDTO[];
  tiposCalzado: string[];
  tiposAccesorio: string[];
  marcasProductos: string[];
}) {
  const [proveedorId, setProveedorId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [numero, setNumero] = useState("");
  const [montoSinIva, setMontoSinIva] = useState("");
  const [tieneIva, setTieneIva] = useState(true);
  const [items, setItems] = useState<ItemBorrador[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function agregarItem() {
    setItems((prev) => [...prev, nuevoItemBorrador(tiposCalzado[0] ?? "")]);
  }
  function quitarItem(clave: string) {
    setItems((prev) => prev.filter((it) => it.clave !== clave));
  }
  function actualizarItem(clave: string, patch: Partial<ItemBorrador>) {
    setItems((prev) => prev.map((it) => (it.clave === clave ? { ...it, ...patch } : it)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!proveedorId) { setError("Elegí un proveedor"); return; }

    const itemsInput: RemitoItemInput[] = [];
    for (const it of items) {
      const cantidad = Number(it.cantidad);
      const costoUnitario = Number(it.costoUnitario);
      if (!(cantidad > 0) || !(costoUnitario > 0)) {
        setError("Cada artículo necesita cantidad y costo unitario mayores a 0");
        return;
      }
      if (it.productoId && !it.esNuevo) {
        itemsInput.push({ modo: "existente", productoId: it.productoId, cantidad, costoUnitario });
      } else {
        if (!it.modeloQuery.trim() || !it.color.trim() || !it.talle.trim() || !it.marca.trim()) {
          setError("Completá modelo, color, talle y marca de cada artículo nuevo");
          return;
        }
        itemsInput.push({
          modo: "nuevo",
          nombre: it.modeloQuery.trim(),
          tipo: it.tipo,
          color: it.color.trim(),
          marca: it.marca.trim(),
          talle: it.talle.trim(),
          cantidad,
          costoUnitario,
        });
      }
    }

    setError(null);
    startTransition(async () => {
      try {
        await crearRemito({ proveedorId, fecha, numero, montoSinIva: Number(montoSinIva), tieneIva, items: itemsInput });
        setNumero(""); setMontoSinIva(""); setItems([]);
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

      <div style={{ flexBasis: "100%", marginTop: 8 }}>
        <div className="hint" style={{ marginBottom: 6, fontWeight: 600 }}>
          Detalle de artículos (opcional) — qué llegó puntualmente en este remito
        </div>
        {items.map((it) => (
          <RemitoItemRow
            key={it.clave}
            item={it}
            tiposCalzado={tiposCalzado}
            tiposAccesorio={tiposAccesorio}
            marcasProductos={marcasProductos}
            onChange={(patch) => actualizarItem(it.clave, patch)}
            onRemove={() => quitarItem(it.clave)}
          />
        ))}
        <button type="button" className="btn ghost small" onClick={agregarItem} style={{ marginTop: items.length ? 8 : 0 }}>
          <IconPlus size={14} /> Agregar artículo
        </button>
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
      <button className="btn" type="submit" disabled={pending} style={{ marginTop: 8 }}>Agregar remito</button>
    </form>
  );
}

function RemitoItemRow({
  item,
  tiposCalzado,
  tiposAccesorio,
  marcasProductos,
  onChange,
  onRemove,
}: {
  item: ItemBorrador;
  tiposCalzado: string[];
  tiposAccesorio: string[];
  marcasProductos: string[];
  onChange: (patch: Partial<ItemBorrador>) => void;
  onRemove: () => void;
}) {
  const [sugerenciasModelo, setSugerenciasModelo] = useState<string[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [colores, setColores] = useState<{ color: string; stock: number }[]>([]);
  const [variantes, setVariantes] = useState<ProductoBusqueda[]>([]);

  // Búsqueda de modelo (debounced)
  useEffect(() => {
    if (item.esNuevo || (item.modelo && item.modeloQuery === item.modelo)) {
      setSugerenciasModelo([]);
      return;
    }
    if (!item.modeloQuery.trim()) {
      setSugerenciasModelo([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSugerenciasModelo(await buscarModelosParaRemito(item.modeloQuery));
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.modeloQuery, item.esNuevo]);

  // Colores del modelo elegido
  useEffect(() => {
    if (!item.modelo || item.esNuevo) { setColores([]); return; }
    buscarColoresParaRemito(item.modelo).then(setColores);
  }, [item.modelo, item.esNuevo]);

  // Variantes (talles) del modelo+color elegidos
  useEffect(() => {
    if (!item.modelo || !item.color || item.colorEsNuevo || item.esNuevo) { setVariantes([]); return; }
    buscarVariantesParaRemito(item.modelo, item.color).then(setVariantes);
  }, [item.modelo, item.color, item.colorEsNuevo, item.esNuevo]);

  function elegirModelo(nombre: string) {
    onChange({ modelo: nombre, modeloQuery: nombre, color: "", colorEsNuevo: false, talle: "", talleEsNuevo: false, productoId: undefined });
    setSugerenciasModelo([]);
    setMostrarSugerencias(false);
  }

  function elegirColor(color: string) {
    if (color === "__nuevo__") {
      onChange({ color: "", colorEsNuevo: true, talle: "", talleEsNuevo: false, productoId: undefined });
      return;
    }
    onChange({ color, colorEsNuevo: false, talle: "", talleEsNuevo: false, productoId: undefined });
  }

  async function elegirTalle(value: string) {
    if (value === "__nuevo__") {
      // talle nuevo para un modelo/color existente: heredamos tipo/marca del modelo
      const info = item.modelo ? await obtenerInfoModelo(item.modelo) : null;
      onChange({ talle: "", talleEsNuevo: true, productoId: undefined, tipo: info?.tipo ?? item.tipo, marca: info?.marca ?? item.marca });
      return;
    }
    const variante = variantes.find((v) => v.id === value);
    onChange({ talle: variante?.talle ?? "", talleEsNuevo: false, productoId: value });
  }

  const esAccesorio = tiposAccesorio.includes(item.tipo);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 8, padding: 8, background: "var(--bg-subtle, rgba(255,255,255,0.03))", borderRadius: 8 }}>
      <div className="checkbox-row" style={{ alignSelf: "center" }}>
        <input
          id={`ri-nuevo-${item.clave}`}
          type="checkbox"
          checked={item.esNuevo}
          onChange={(e) => onChange({ esNuevo: e.target.checked, productoId: undefined, color: "", colorEsNuevo: false, talle: "", talleEsNuevo: false })}
        />
        <label htmlFor={`ri-nuevo-${item.clave}`} style={{ fontSize: 12 }}>Producto nuevo</label>
      </div>

      <div className="field" style={{ position: "relative", minWidth: 180 }}>
        <label>Modelo</label>
        <input
          placeholder="Buscar modelo..."
          autoComplete="off"
          value={item.modeloQuery}
          onChange={(e) => {
            const texto = e.target.value;
            const patch: Partial<ItemBorrador> = { modeloQuery: texto };
            if (item.modelo && texto !== item.modelo) {
              patch.modelo = null;
              patch.color = "";
              patch.colorEsNuevo = false;
              patch.talle = "";
              patch.talleEsNuevo = false;
              patch.productoId = undefined;
            }
            onChange(patch);
            setMostrarSugerencias(true);
          }}
          onFocus={() => setMostrarSugerencias(true)}
          onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
        />
        {!item.esNuevo && mostrarSugerencias && sugerenciasModelo.length > 0 && (
          <ul className="autocomplete-list">
            {sugerenciasModelo.map((nombre) => (
              <li key={nombre} onMouseDown={(e) => { e.preventDefault(); elegirModelo(nombre); }}>{nombre}</li>
            ))}
          </ul>
        )}
      </div>

      {item.esNuevo || !item.modelo ? (
        <>
          <div className="field">
            <label>Tipo</label>
            <select value={item.tipo} onChange={(e) => onChange({ tipo: e.target.value })}>
              <optgroup label="Calzado">
                {tiposCalzado.map((t) => <option key={t} value={t}>{t}</option>)}
              </optgroup>
              <optgroup label="Accesorios">
                {tiposAccesorio.map((t) => <option key={t} value={t}>{t}</option>)}
              </optgroup>
            </select>
          </div>
          <div className="field">
            <label>Color</label>
            <input value={item.color} onChange={(e) => onChange({ color: e.target.value })} placeholder="Negro" />
          </div>
          <div className="field">
            <label>Marca</label>
            <input value={item.marca} onChange={(e) => onChange({ marca: e.target.value })} list={`ri-marcas-${item.clave}`} />
            <datalist id={`ri-marcas-${item.clave}`}>
              {marcasProductos.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div className="field">
            <label>Talle</label>
            <input value={item.talle} onChange={(e) => onChange({ talle: e.target.value })} placeholder={esAccesorio ? "M" : "38"} />
          </div>
        </>
      ) : (
        <>
          {item.modelo && (
            <div className="field">
              <label>Color</label>
              <select value={item.colorEsNuevo ? "__nuevo__" : item.color} onChange={(e) => elegirColor(e.target.value)}>
                <option value="">Elegí un color...</option>
                {colores.map((c) => <option key={c.color} value={c.color}>{c.color} ({c.stock} en stock)</option>)}
                <option value="__nuevo__">+ Color nuevo</option>
              </select>
              {item.colorEsNuevo && (
                <input value={item.color} onChange={(e) => onChange({ color: e.target.value })} placeholder="Color nuevo" style={{ marginTop: 4 }} />
              )}
            </div>
          )}
          {item.modelo && item.color && (
            <div className="field">
              <label>Talle</label>
              <select value={item.talleEsNuevo ? "__nuevo__" : item.productoId ?? ""} onChange={(e) => elegirTalle(e.target.value)}>
                <option value="">Elegí un talle...</option>
                {variantes.map((v) => <option key={v.id} value={v.id}>{v.talle || "Único"} — {v.stock} en stock</option>)}
                <option value="__nuevo__">+ Talle nuevo</option>
              </select>
              {item.talleEsNuevo && (
                <input value={item.talle} onChange={(e) => onChange({ talle: e.target.value })} placeholder="Talle nuevo" style={{ marginTop: 4 }} />
              )}
            </div>
          )}
        </>
      )}

      <div className="field" style={{ width: 90 }}>
        <label>Cantidad</label>
        <input type="number" min="1" value={item.cantidad} onChange={(e) => onChange({ cantidad: e.target.value })} />
      </div>
      <div className="field" style={{ width: 120 }}>
        <label>Costo unitario</label>
        <input type="number" step="0.01" min="0" value={item.costoUnitario} onChange={(e) => onChange({ costoUnitario: e.target.value })} />
      </div>
      <button type="button" className="btn danger small" onClick={onRemove} style={{ alignSelf: "center", marginTop: 18 }}>
        <IconTrash size={14} />
      </button>
    </div>
  );
}

function RemitosTable({ proveedores }: { proveedores: ProveedorDTO[] }) {
  const [pending, startTransition] = useTransition();
  const [expandido, setExpandido] = useState<string | null>(null);
  const filas = proveedores.flatMap((p) => p.remitos.map((r) => ({ ...r, proveedorNombre: p.nombre })));

  if (filas.length === 0) return <p className="empty">Sin remitos cargados.</p>;

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este remito? Si tenía artículos cargados, se descuenta esa cantidad del stock.")) return;
    startTransition(() => eliminarRemito(id));
  }

  return (
    <table>
      <thead>
        <tr>
          <th></th><th>Proveedor</th><th>Fecha</th><th>N°</th><th>Monto s/IVA</th><th>IVA</th><th></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((r) => (
          <Fragment key={r.id}>
            <tr>
              <td>
                {r.items.length > 0 && (
                  <button type="button" className="btn ghost small" onClick={() => setExpandido(expandido === r.id ? null : r.id)}>
                    {expandido === r.id ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  </button>
                )}
              </td>
              <td>{r.proveedorNombre}</td>
              <td>{fmtDate(r.fecha)}</td>
              <td>{r.numero ?? "—"}</td>
              <td className="num">{fmt(r.montoSinIva)}</td>
              <td>{r.tieneIva ? "Sí" : "No"}</td>
              <td>
                <button className="btn danger small" type="button" disabled={pending} onClick={() => handleDelete(r.id)}>
                  <IconTrash size={14} />
                </button>
              </td>
            </tr>
            {expandido === r.id && r.items.length > 0 && (
              <tr>
                <td></td>
                <td colSpan={6}>
                  <table style={{ margin: 0 }}>
                    <thead>
                      <tr><th>Producto</th><th>Color</th><th>Talle</th><th>Cantidad</th><th>Costo unit.</th><th>Subtotal</th></tr>
                    </thead>
                    <tbody>
                      {r.items.map((it) => (
                        <tr key={it.id}>
                          <td>{it.nombre}</td>
                          <td>{it.color || "—"}</td>
                          <td>{it.talle || "Único"}</td>
                          <td className="num">{it.cantidad}</td>
                          <td className="num">{fmt(it.costoUnitario)}</td>
                          <td className="num">{fmt(it.costoUnitario * it.cantidad)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            )}
          </Fragment>
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
