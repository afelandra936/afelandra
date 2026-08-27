"use client";

import { useEffect, useState, useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";
import { fmt, fmtDate } from "@/lib/format";
import { MEDIOS, precioUnitario, factorPromocion, calcularMontoResto, resolverCoeficientes } from "@/lib/pricing";
import { registrarVentaCarrito, eliminarVenta, type ItemCarrito } from "@/lib/actions/ventas";
import {
  buscarProductoPorCodigo,
  buscarModelos,
  buscarColoresPorModelo,
  buscarVariantesPorModeloColor,
} from "@/lib/actions/productos";
import { BarChart } from "@/components/charts/BarChart";
import type { Role } from "@/lib/auth";
import type { ChartEntry } from "@/lib/reports";

type ProductoDTO = {
  id: string;
  nombre: string;
  color: string;
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
type CoeficientesPorMarcaDTO = Record<string, ConfigDTO>;

type Props = {
  role: Role;
  ventas: VentaDTO[];
  clientesNombres: string[];
  config: ConfigDTO;
  coeficientesPorMarca: CoeficientesPorMarcaDTO;
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
          <p>Armá el carrito con uno o varios productos: el precio se calcula solo.</p>
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
                <VentaRow key={v.id} venta={v} isAdmin={isAdmin} />
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

function VentaRow({ venta, isAdmin }: { venta: VentaDTO; isAdmin: boolean }) {
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
        {isAdmin && (
          <button className="btn danger small" type="button" onClick={handleDelete} disabled={pending}>
            <IconTrash size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}

type CartItem = {
  id: string;
  modeloQuery: string;
  modelo: string | null;
  color: string | null;
  producto: ProductoDTO | null;
  cantidad: string;
  medioPago: string;
  promocionId: string;
};

function nuevoItem(): CartItem {
  return {
    id: Math.random().toString(36).slice(2),
    modeloQuery: "",
    modelo: null,
    color: null,
    producto: null,
    cantidad: "1",
    medioPago: MEDIOS[0],
    promocionId: "",
  };
}

function totalItem(
  item: CartItem,
  config: ConfigDTO,
  coeficientesPorMarca: CoeficientesPorMarcaDTO,
  promociones: PromocionDTO[]
): number {
  if (!item.producto) return 0;
  const cantidad = Number(item.cantidad) || 0;
  const promocion = promociones.find((p) => p.id === item.promocionId) ?? null;
  const factor = factorPromocion(promocion, cantidad);
  const coef = resolverCoeficientes(item.producto.marca, config, coeficientesPorMarca);
  return precioUnitario(item.producto.costo, item.medioPago, coef) * cantidad * factor;
}

type ItemConProducto = CartItem & { producto: ProductoDTO };

/**
 * Igual que el "resto automático" de una venta simple, pero usando el costo de
 * TODOS los productos del carrito como base — así seguir cobrando en 3 cuotas o en
 * efectivo sigue "valiendo" lo mismo en términos de costo cubierto, sin importar
 * cuántos productos distintos haya. Después, cada producto se lleva su parte
 * proporcional a su costo, y recién ahí se le aplica su propia promoción (si tiene).
 */
function calcularDivisionCarrito(
  itemsValidos: ItemConProducto[],
  pagosParciales: { medio: string; monto: string }[],
  medioResto: string,
  config: ConfigDTO,
  coeficientesPorMarca: CoeficientesPorMarcaDTO,
  promociones: PromocionDTO[]
): {
  porItem: { id: string; pagos: { medio: string; monto: number }[]; total: number }[];
  total: number;
  montoResto: number;
} {
  const costoTotalCarrito = itemsValidos.reduce((acc, it) => acc + it.producto.costo * (Number(it.cantidad) || 0), 0);
  const pagosNum = pagosParciales.map((p) => ({ medio: p.medio, monto: Number(p.monto) || 0 }));
  // El "resto" se calcula con un único juego de coeficientes: si todo el carrito es
  // de una misma marca se usan los suyos, si hay marcas mezcladas no hay un coeficiente
  // "correcto" único y se cae a los generales.
  const marcasEnCarrito = new Set(itemsValidos.map((it) => it.producto.marca));
  const marcaUnica = marcasEnCarrito.size === 1 ? [...marcasEnCarrito][0] : null;
  const coefResto = marcaUnica ? resolverCoeficientes(marcaUnica, config, coeficientesPorMarca) : config;
  const montoResto = calcularMontoResto(costoTotalCarrito, pagosNum, medioResto, coefResto);
  const pagosGlobal = [...pagosNum, { medio: medioResto, monto: montoResto }];

  let total = 0;
  const porItem = itemsValidos.map((it) => {
    const cantidad = Number(it.cantidad) || 0;
    const costoItem = it.producto.costo * cantidad;
    const share = costoTotalCarrito > 0 ? costoItem / costoTotalCarrito : 0;
    const promocion = promociones.find((p) => p.id === it.promocionId) ?? null;
    const factor = factorPromocion(promocion, cantidad);
    const pagos = pagosGlobal.map((p) => ({ medio: p.medio, monto: p.monto * share }));
    const totalItemConFactor = pagos.reduce((acc, p) => acc + p.monto, 0) * factor;
    total += totalItemConFactor;
    return { id: it.id, pagos, total: totalItemConFactor };
  });

  return { porItem, total, montoResto };
}

function NuevaVentaForm(props: Props) {
  const { config, coeficientesPorMarca } = props;

  const [codigoBarras, setCodigoBarras] = useState("");
  const [items, setItems] = useState<CartItem[]>([nuevoItem()]);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [vendedor, setVendedor] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [dividido, setDividido] = useState(false);
  const [pagosParciales, setPagosParciales] = useState<{ medio: string; monto: string }[]>([]);
  const [medioResto, setMedioResto] = useState<string>(MEDIOS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const itemsValidos = items.filter((it): it is ItemConProducto => it.producto !== null);
  const divisionCarrito = dividido
    ? calcularDivisionCarrito(itemsValidos, pagosParciales, medioResto, config, coeficientesPorMarca, props.promociones)
    : null;
  const total = divisionCarrito
    ? divisionCarrito.total
    : items.reduce((acc, item) => acc + totalItem(item, config, coeficientesPorMarca, props.promociones), 0);
  const montoResto = divisionCarrito?.montoResto ?? 0;

  function addPagoParcial() {
    setPagosParciales((prev) => [...prev, { medio: MEDIOS[0], monto: "" }]);
  }

  function removePagoParcial(idx: number) {
    setPagosParciales((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePagoParcial(idx: number, field: "medio" | "monto", value: string) {
    setPagosParciales((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function updateItem(id: string, patch: Partial<CartItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  function agregarProductoAlCarrito(p: ProductoDTO) {
    const patch = { modelo: p.nombre, modeloQuery: p.nombre, color: p.color, producto: p };
    setItems((prev) => {
      const ultimo = prev[prev.length - 1];
      if (ultimo && !ultimo.producto) {
        return prev.map((it, i) => (i === prev.length - 1 ? { ...it, ...patch } : it));
      }
      return [...prev, { ...nuevoItem(), ...patch }];
    });
  }

  function handleBarcode(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const codigo = codigoBarras.trim();
    if (!codigo) return;
    startTransition(async () => {
      const match = await buscarProductoPorCodigo(codigo);
      if (match) {
        agregarProductoAlCarrito(match);
        setCodigoBarras("");
      }
    });
  }

  async function submit(confirmarPerdida: boolean) {
    if (itemsValidos.length === 0) {
      setError("Agregá al menos un producto");
      return;
    }
    if (itemsValidos.some((it) => (Number(it.cantidad) || 0) <= 0)) {
      setError("Cantidad inválida en algún producto");
      return;
    }

    const carritoItems: ItemCarrito[] = itemsValidos.map((it) => {
      const cantidadNum = Number(it.cantidad) || 0;
      const pagos = divisionCarrito?.porItem.find((p) => p.id === it.id)?.pagos;
      return {
        productoId: it.producto.id,
        cantidad: cantidadNum,
        medioPago: it.medioPago,
        pagos,
        promocionId: it.promocionId || undefined,
      };
    });

    setError(null);
    startTransition(async () => {
      const res = await registrarVentaCarrito({
        fecha,
        vendedor,
        clienteNombre: clienteNombre || undefined,
        observaciones: observaciones || undefined,
        sucursal: sucursal || undefined,
        items: carritoItems,
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

      setItems([nuevoItem()]);
      setClienteNombre("");
      setObservaciones("");
      setDividido(false);
      setPagosParciales([]);
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

      <div style={{ flexBasis: "100%", marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Medio de pago</th>
              <th>Promoción</th>
              <th>Subtotal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                config={config}
                coeficientesPorMarca={coeficientesPorMarca}
                promociones={props.promociones}
                onChange={(patch) => updateItem(item.id, patch)}
                onRemove={() => removeItem(item.id)}
                removable={items.length > 1}
                subtotalOverride={divisionCarrito?.porItem.find((p) => p.id === item.id)?.total}
                dividido={dividido}
              />
            ))}
          </tbody>
        </table>
        <button type="button" className="btn ghost small" style={{ marginTop: 8 }} onClick={() => setItems((prev) => [...prev, nuevoItem()])}>
          + Agregar producto
        </button>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>Total</label>
        <div style={{ height: 36, display: "flex", alignItems: "center", fontSize: 18 }} className="num">
          {fmt(total)}
        </div>
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

      <button className="btn" type="submit" disabled={pending} style={{ flexBasis: "100%" }}>
        Registrar venta
      </button>
    </form>
  );
}

/**
 * Selección en 3 pasos para no confundir variantes de color parecidas (ej. "Tole negra"
 * vs "Tole platino"): primero modelo, recién ahí colores DE ESE modelo, recién ahí
 * talles DE ESE modelo+color. El color elegido queda siempre visible en un renglón aparte.
 */
function SelectorModeloColorTalle({
  item,
  onChange,
}: {
  item: CartItem;
  onChange: (patch: Partial<CartItem>) => void;
}) {
  const [sugerenciasModelo, setSugerenciasModelo] = useState<string[]>([]);
  const [mostrarSugerenciasModelo, setMostrarSugerenciasModelo] = useState(false);
  const [buscandoModelo, setBuscandoModelo] = useState(false);
  const [colores, setColores] = useState<{ color: string; stock: number }[]>([]);
  const [cargandoColores, setCargandoColores] = useState(false);
  const [variantes, setVariantes] = useState<ProductoDTO[]>([]);
  const [cargandoVariantes, setCargandoVariantes] = useState(false);

  useEffect(() => {
    if (item.modelo && item.modeloQuery === item.modelo) {
      setSugerenciasModelo([]);
      return;
    }
    if (!item.modeloQuery.trim()) {
      setSugerenciasModelo([]);
      setBuscandoModelo(false);
      return;
    }
    setBuscandoModelo(true);
    const timer = setTimeout(async () => {
      const resultados = await buscarModelos(item.modeloQuery);
      setSugerenciasModelo(resultados);
      setBuscandoModelo(false);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.modeloQuery]);

  useEffect(() => {
    if (!item.modelo) {
      setColores([]);
      return;
    }
    setCargandoColores(true);
    buscarColoresPorModelo(item.modelo).then((res) => {
      setColores(res);
      setCargandoColores(false);
    });
  }, [item.modelo]);

  useEffect(() => {
    if (!item.modelo || !item.color) {
      setVariantes([]);
      return;
    }
    setCargandoVariantes(true);
    buscarVariantesPorModeloColor(item.modelo, item.color).then((res) => {
      setVariantes(res);
      setCargandoVariantes(false);
    });
  }, [item.modelo, item.color]);

  function elegirModelo(nombre: string) {
    onChange({ modelo: nombre, modeloQuery: nombre, color: null, producto: null });
    setSugerenciasModelo([]);
    setMostrarSugerenciasModelo(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ position: "relative" }}>
        <input
          placeholder="Buscar modelo..."
          autoComplete="off"
          value={item.modeloQuery}
          onChange={(e) => {
            const texto = e.target.value;
            onChange({
              modeloQuery: texto,
              ...(item.modelo && texto !== item.modelo ? { modelo: null, color: null, producto: null } : {}),
            });
            setMostrarSugerenciasModelo(true);
          }}
          onFocus={() => setMostrarSugerenciasModelo(true)}
          onBlur={() => setTimeout(() => setMostrarSugerenciasModelo(false), 150)}
        />
        {mostrarSugerenciasModelo && (buscandoModelo || sugerenciasModelo.length > 0) && (
          <ul className="autocomplete-list">
            {buscandoModelo ? (
              <li className="autocomplete-hint">Buscando...</li>
            ) : (
              sugerenciasModelo.map((nombre) => (
                <li key={nombre} onMouseDown={(e) => { e.preventDefault(); elegirModelo(nombre); }}>
                  {nombre}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {item.modelo && (
        <select value={item.color ?? ""} onChange={(e) => onChange({ color: e.target.value || null, producto: null })} disabled={cargandoColores}>
          <option value="">{cargandoColores ? "Cargando colores..." : "Elegí un color..."}</option>
          {colores.map((c) => (
            <option key={c.color} value={c.color}>{c.color} ({c.stock} en stock)</option>
          ))}
        </select>
      )}

      {item.modelo && item.color && (
        <select
          value={item.producto?.id ?? ""}
          onChange={(e) => onChange({ producto: variantes.find((v) => v.id === e.target.value) ?? null })}
          disabled={cargandoVariantes}
        >
          <option value="">{cargandoVariantes ? "Cargando talles..." : "Elegí un talle..."}</option>
          {variantes.map((v) => (
            <option key={v.id} value={v.id}>{v.talle || "Único"} — {v.stock} en stock</option>
          ))}
        </select>
      )}

      {item.modelo && item.color && (
        <div className="hint" style={{ fontWeight: 600 }}>
          {item.modelo} · Color: {item.color}
          {item.producto && ` · Talle: ${item.producto.talle || "Único"}`}
        </div>
      )}
    </div>
  );
}

function CartItemRow({
  item,
  config,
  coeficientesPorMarca,
  promociones,
  onChange,
  onRemove,
  removable,
  subtotalOverride,
  dividido,
}: {
  item: CartItem;
  config: ConfigDTO;
  coeficientesPorMarca: CoeficientesPorMarcaDTO;
  promociones: PromocionDTO[];
  onChange: (patch: Partial<CartItem>) => void;
  onRemove: () => void;
  removable: boolean;
  subtotalOverride?: number;
  dividido: boolean;
}) {
  const subtotal = subtotalOverride ?? totalItem(item, config, coeficientesPorMarca, promociones);

  return (
    <tr>
      <td style={{ minWidth: 240 }}>
        <SelectorModeloColorTalle item={item} onChange={onChange} />
      </td>
      <td>
        <input
          className="num"
          type="number"
          min={1}
          max={item.producto?.stock ?? undefined}
          value={item.cantidad}
          onChange={(e) => {
            const stock = item.producto?.stock;
            const valor = e.target.value;
            const clamped = stock !== undefined && Number(valor) > stock ? String(stock) : valor;
            onChange({ cantidad: clamped });
          }}
          style={{ width: 70 }}
        />
      </td>
      <td>
        <select value={item.medioPago} onChange={(e) => onChange({ medioPago: e.target.value })} disabled={dividido}>
          {MEDIOS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </td>
      <td>
        <select value={item.promocionId} onChange={(e) => onChange({ promocionId: e.target.value })}>
          <option value="">Ninguna</option>
          {promociones.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.tipo === "porcentaje" ? `(${p.valorPorcentaje}% OFF)` : "(2x1)"}
            </option>
          ))}
        </select>
      </td>
      <td className="num">{fmt(subtotal)}</td>
      <td>
        <button className="btn danger small" type="button" onClick={onRemove} disabled={!removable}>
          <IconTrash size={14} />
        </button>
      </td>
    </tr>
  );
}
