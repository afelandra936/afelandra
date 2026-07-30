"use client";

import { useEffect, useState } from "react";
import { IconTrash, IconPrinter, IconPlus } from "@tabler/icons-react";
import { fmt } from "@/lib/format";
import { MEDIOS, precioUnitario, factorPromocion } from "@/lib/pricing";
import { buscarProductos, type ProductoBusqueda } from "@/lib/actions/productos";

type PromocionDTO = {
  id: string;
  nombre: string;
  tipo: string;
  valorPorcentaje: number | null;
};

type ConfigDTO = { debito: number; credito3: number; credito6: number; contado: number };

type Item = {
  id: string;
  producto: ProductoBusqueda | null;
  productoQuery: string;
  cantidad: string;
  medioPago: string;
  promocionId: string;
};

function labelProducto(p: ProductoBusqueda): string {
  return `${p.nombre} ${p.talle ? `(${p.talle})` : "(Único)"} — ${p.marca} — stock ${p.stock}`;
}

function nuevoItem(): Item {
  return {
    id: Math.random().toString(36).slice(2),
    producto: null,
    productoQuery: "",
    cantidad: "1",
    medioPago: MEDIOS[0],
    promocionId: "",
  };
}

function totalItem(item: Item, config: ConfigDTO, promociones: PromocionDTO[]): number {
  if (!item.producto) return 0;
  const cantidad = Number(item.cantidad) || 0;
  const base = precioUnitario(item.producto.costo, item.medioPago, config) * cantidad;
  const promocion = promociones.find((p) => p.id === item.promocionId) ?? null;
  return base * factorPromocion(promocion, cantidad);
}

export function PresupuestosView({ config, promociones }: { config: ConfigDTO; promociones: PromocionDTO[] }) {
  const [cliente, setCliente] = useState("");
  const [items, setItems] = useState<Item[]>([nuevoItem()]);

  const total = items.reduce((acc, item) => acc + totalItem(item, config, promociones), 0);
  const fecha = new Date().toLocaleDateString("es-AR");

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  function nuevoPresupuesto() {
    setCliente("");
    setItems([nuevoItem()]);
  }

  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Presupuestos</h1>
          <p>Calculá un precio para mostrarle al cliente, sin afectar stock ni ventas.</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="inline-form no-print">
          <div className="field">
            <label htmlFor="pr-cliente">Cliente (opcional)</label>
            <input id="pr-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" />
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Medio de pago</th>
              <th>Promoción</th>
              <th>Subtotal</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                config={config}
                promociones={promociones}
                onChange={(patch) => updateItem(item.id, patch)}
                onRemove={() => removeItem(item.id)}
                removable={items.length > 1}
              />
            ))}
          </tbody>
        </table>

        <button className="btn ghost small no-print" type="button" style={{ marginTop: 12 }} onClick={() => setItems((prev) => [...prev, nuevoItem()])}>
          <IconPlus size={14} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Agregar producto
        </button>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {cliente && <div>Cliente: {cliente}</div>}
            <div className="hint">Fecha: {fecha}</div>
          </div>
          <div style={{ fontSize: 22 }} className="num">
            Total: {fmt(total)}
          </div>
        </div>

        <div className="no-print" style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button className="btn" type="button" onClick={() => window.print()}>
            <IconPrinter size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            Imprimir
          </button>
          <button className="btn ghost" type="button" onClick={nuevoPresupuesto}>
            Nuevo presupuesto
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  config,
  promociones,
  onChange,
  onRemove,
  removable,
}: {
  item: Item;
  config: ConfigDTO;
  promociones: PromocionDTO[];
  onChange: (patch: Partial<Item>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const [sugerencias, setSugerencias] = useState<ProductoBusqueda[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (item.producto && item.productoQuery === labelProducto(item.producto)) {
      setSugerencias([]);
      return;
    }
    if (!item.productoQuery.trim()) {
      setSugerencias([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(async () => {
      const resultados = await buscarProductos(item.productoQuery);
      setSugerencias(resultados);
      setBuscando(false);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.productoQuery]);

  function elegirProducto(p: ProductoBusqueda) {
    onChange({ producto: p, productoQuery: labelProducto(p) });
    setSugerencias([]);
    setMostrarSugerencias(false);
  }

  const subtotal = totalItem(item, config, promociones);

  return (
    <tr>
      <td style={{ position: "relative", minWidth: 220 }}>
        <input
          className="no-print"
          placeholder="Buscar por nombre..."
          autoComplete="off"
          value={item.productoQuery}
          onChange={(e) => {
            const texto = e.target.value;
            onChange({ productoQuery: texto, ...(item.producto && texto !== labelProducto(item.producto) ? { producto: null } : {}) });
            setMostrarSugerencias(true);
          }}
          onFocus={() => setMostrarSugerencias(true)}
          onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
        />
        <span style={{ display: "none" }} className="print-only">{item.producto ? labelProducto(item.producto) : ""}</span>
        {mostrarSugerencias && (buscando || sugerencias.length > 0) && (
          <ul className="autocomplete-list">
            {buscando ? (
              <li className="autocomplete-hint">Buscando...</li>
            ) : (
              sugerencias.map((p) => (
                <li key={p.id} onMouseDown={(e) => { e.preventDefault(); elegirProducto(p); }}>
                  {labelProducto(p)}
                </li>
              ))
            )}
          </ul>
        )}
      </td>
      <td>
        <input
          className="num"
          type="number"
          min={1}
          value={item.cantidad}
          onChange={(e) => onChange({ cantidad: e.target.value })}
          style={{ width: 60 }}
        />
      </td>
      <td>
        <select value={item.medioPago} onChange={(e) => onChange({ medioPago: e.target.value })}>
          {MEDIOS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </td>
      <td>
        <select value={item.promocionId} onChange={(e) => onChange({ promocionId: e.target.value })}>
          <option value="">Ninguna</option>
          {promociones.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </td>
      <td className="num">{fmt(subtotal)}</td>
      <td className="no-print">
        <button className="btn danger small" type="button" onClick={onRemove} disabled={!removable}>
          <IconTrash size={14} />
        </button>
      </td>
    </tr>
  );
}
