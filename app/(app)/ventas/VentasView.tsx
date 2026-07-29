"use client";

import { useMemo, useState, useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";
import { fmt, fmtDate } from "@/lib/format";
import { MEDIOS, precioUnitario, calcularMontoResto, factorPromocion } from "@/lib/pricing";
import { registrarVenta, eliminarVenta } from "@/lib/actions/ventas";
import { BarChart } from "@/components/charts/BarChart";
import type { Role } from "@/lib/auth";
import type { ChartEntry } from "@/lib/reports";

type ProductoDTO = {
  id: string;
  nombre: string;
  talle: string;
  marca: string;
  costo: number;
  stock: number;
  codigo: string | null;
};

type VentaDTO = {
  id: string;
  fecha: string;
  nombre: string;
  talle: string;
  cantidad: number;
  medioPago: string;
  vendedor: string;
  clienteNombre: string | null;
  precioVenta: number;
  promocionNombre: string | null;
};

type PromocionDTO = {
  id: string;
  nombre: string;
  tipo: string;
  valorPorcentaje: number | null;
};

type ConfigDTO = { debito: number; credito3: number; credito6: number; contado: number };

type Props = {
  role: Role;
  productos: ProductoDTO[];
  ventas: VentaDTO[];
  clientesNombres: string[];
  config: ConfigDTO;
  charts: { topProductos: ChartEntry[]; topProveedores: ChartEntry[]; medios: ChartEntry[]; vendedores: ChartEntry[] } | null;
  promociones: PromocionDTO[];
};

export function VentasView(props: Props) {
  const isAdmin = props.role === "admin";

  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Ventas</h1>
          <p>Elegí el producto y el medio de pago: el precio se calcula solo.</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <NuevaVentaForm {...props} />
      </div>

      <div className="card">
        {props.ventas.length === 0 ? (
          <p className="empty">Todavía no cargaste ventas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Medio</th>
                <th>Total</th>
                <th>Promo</th>
                <th>Vendedor</th>
                <th>Cliente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {props.ventas.map((v) => (
                <VentaRow key={v.id} venta={v} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin && props.charts && (
        <>
          <div className="section-title">Análisis de ventas</div>
          <div className="cols-2">
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>Top productos</h3>
              <BarChart entries={props.charts.topProductos} />
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>Top proveedores</h3>
              <BarChart entries={props.charts.topProveedores} />
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>Medios de pago</h3>
              <BarChart entries={props.charts.medios} />
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>Top vendedores</h3>
              <BarChart entries={props.charts.vendedores} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function VentaRow({ venta }: { venta: VentaDTO }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar la venta de ${venta.nombre}?`)) return;
    startTransition(() => eliminarVenta(venta.id));
  }

  return (
    <tr>
      <td>{fmtDate(venta.fecha)}</td>
      <td>
        {venta.nombre} {venta.talle && <span className="num">({venta.talle})</span>}
      </td>
      <td className="num">{venta.cantidad}</td>
      <td>{venta.medioPago}</td>
      <td className="num">{fmt(venta.precioVenta * venta.cantidad)}</td>
      <td>{venta.promocionNombre ?? "—"}</td>
      <td>{venta.vendedor}</td>
      <td>{venta.clienteNombre ?? "—"}</td>
      <td>
        <button className="btn danger small" type="button" onClick={handleDelete} disabled={pending}>
          <IconTrash size={14} />
        </button>
      </td>
    </tr>
  );
}

function NuevaVentaForm(props: Props) {
  const { productos, config } = props;

  const [codigoBarras, setCodigoBarras] = useState("");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [medioPago, setMedioPago] = useState<string>(MEDIOS[0]);
  const [dividido, setDividido] = useState(false);
  const [pagosParciales, setPagosParciales] = useState<{ medio: string; monto: string }[]>([]);
  const [medioResto, setMedioResto] = useState<string>(MEDIOS[0]);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [vendedor, setVendedor] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [promocionId, setPromocionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const producto = useMemo(() => productos.find((p) => p.id === productoId) ?? null, [productos, productoId]);
  const cantidadNum = Number(cantidad) || 0;
  const costoTotal = producto ? producto.costo * cantidadNum : 0;
  const promocion = useMemo(
    () => props.promociones.find((p) => p.id === promocionId) ?? null,
    [props.promociones, promocionId]
  );
  const factor = factorPromocion(promocion, cantidadNum);

  const precioSimple = producto ? precioUnitario(producto.costo, medioPago, config) * cantidadNum : 0;

  const montoResto = useMemo(() => {
    if (!producto) return 0;
    const pagosNum = pagosParciales.map((p) => ({ medio: p.medio, monto: Number(p.monto) || 0 }));
    return calcularMontoResto(costoTotal, pagosNum, medioResto, config);
  }, [producto, pagosParciales, medioResto, costoTotal, config]);

  const totalDividido = pagosParciales.reduce((acc, p) => acc + (Number(p.monto) || 0), 0) + montoResto;
  const totalConPromo = (dividido ? totalDividido : precioSimple) * factor;

  function handleBarcode(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const match = productos.find((p) => p.codigo === codigoBarras.trim());
    if (match) {
      setProductoId(match.id);
      setCodigoBarras("");
    }
  }

  function addPagoParcial() {
    setPagosParciales((prev) => [...prev, { medio: MEDIOS[0], monto: "" }]);
  }

  function removePagoParcial(idx: number) {
    setPagosParciales((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePagoParcial(idx: number, field: "medio" | "monto", value: string) {
    setPagosParciales((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  async function submit(confirmarPerdida: boolean) {
    if (!producto) {
      setError("Elegí un producto");
      return;
    }
    if (cantidadNum <= 0) {
      setError("Cantidad inválida");
      return;
    }

    const pagos = dividido
      ? [...pagosParciales.map((p) => ({ medio: p.medio, monto: Number(p.monto) || 0 })), { medio: medioResto, monto: montoResto }]
      : undefined;

    setError(null);
    startTransition(async () => {
      const res = await registrarVenta({
        fecha,
        productoId: producto.id,
        cantidad: cantidadNum,
        medioPago,
        pagos,
        vendedor,
        clienteNombre: clienteNombre || undefined,
        observaciones: observaciones || undefined,
        sucursal: sucursal || undefined,
        promocionId: promocionId || undefined,
        confirmarPerdida,
      });

      if (res?.warning) {
        if (confirm(res.warning)) await submit(true);
        return;
      }
      if (res?.error) {
        setError(res.error);
        return;
      }

      setProductoId("");
      setCantidad("1");
      setDividido(false);
      setPagosParciales([]);
      setClienteNombre("");
      setObservaciones("");
      setPromocionId("");
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(false);
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="v-codigo">Código de barras</label>
        <input
          id="v-codigo"
          value={codigoBarras}
          onChange={(e) => setCodigoBarras(e.target.value)}
          onKeyDown={handleBarcode}
          placeholder="Escanear y Enter"
        />
      </div>
      <div className="field" style={{ minWidth: 240 }}>
        <label htmlFor="v-producto">Producto</label>
        <select id="v-producto" value={productoId} onChange={(e) => setProductoId(e.target.value)} required>
          <option value="">Elegir...</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id} disabled={p.stock === 0}>
              {p.nombre} {p.talle ? `(${p.talle})` : "(Único)"} — {p.marca} — stock {p.stock}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="v-cantidad">Cantidad</label>
        <input id="v-cantidad" type="number" min={1} max={producto?.stock ?? undefined} value={cantidad} onChange={(e) => setCantidad(e.target.value)} style={{ width: 80 }} />
      </div>
      <div className="field">
        <label htmlFor="v-medio">Medio de pago</label>
        <select id="v-medio" value={medioPago} onChange={(e) => setMedioPago(e.target.value)} disabled={dividido}>
          {MEDIOS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="v-promo">Promoción</label>
        <select id="v-promo" value={promocionId} onChange={(e) => setPromocionId(e.target.value)}>
          <option value="">Ninguna</option>
          {props.promociones.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.tipo === "porcentaje" ? `(${p.valorPorcentaje}% OFF)` : "(2x1)"}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Precio</label>
        <div style={{ height: 36, display: "flex", alignItems: "center" }} className="num">
          {fmt(totalConPromo)}
        </div>
      </div>
      <div className="field">
        <label htmlFor="v-fecha">Fecha</label>
        <input id="v-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="v-vendedor">Vendedor</label>
        <input id="v-vendedor" value={vendedor} onChange={(e) => setVendedor(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="v-cliente">Cliente</label>
        <input id="v-cliente" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} list="clientes-list" />
        <datalist id="clientes-list">
          {props.clientesNombres.map((n) => <option key={n} value={n} />)}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor="v-sucursal">Sucursal</label>
        <input id="v-sucursal" value={sucursal} onChange={(e) => setSucursal(e.target.value)} />
      </div>
      <div className="field" style={{ minWidth: 180 }}>
        <label htmlFor="v-obs">Observaciones</label>
        <input id="v-obs" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <div className="checkbox-row" style={{ flexBasis: "100%" }}>
        <input
          type="checkbox"
          id="v-dividir"
          checked={dividido}
          onChange={(e) => {
            setDividido(e.target.checked);
            if (e.target.checked && pagosParciales.length === 0) addPagoParcial();
          }}
        />
        <label htmlFor="v-dividir">Dividir el pago entre varios medios</label>
      </div>

      {dividido && (
        <div style={{ flexBasis: "100%" }}>
          {pagosParciales.map((p, idx) => (
            <div className="pago-row" key={idx}>
              <select value={p.medio} onChange={(e) => updatePagoParcial(idx, "medio", e.target.value)}>
                {MEDIOS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                placeholder="Monto"
                value={p.monto}
                onChange={(e) => updatePagoParcial(idx, "monto", e.target.value)}
                style={{ width: 120 }}
              />
              <button type="button" className="btn ghost small" onClick={() => removePagoParcial(idx)}>
                Quitar
              </button>
            </div>
          ))}
          <button type="button" className="btn ghost small" onClick={addPagoParcial}>
            + Agregar medio
          </button>
          <div className="pago-row" style={{ marginTop: 8 }}>
            <span className="hint">Resto automático:</span>
            <select value={medioResto} onChange={(e) => setMedioResto(e.target.value)}>
              {MEDIOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <span className="num">{fmt(montoResto)}</span>
          </div>
        </div>
      )}

      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}

      <button className="btn" type="submit" disabled={pending}>
        Registrar venta
      </button>
    </form>
  );
}
