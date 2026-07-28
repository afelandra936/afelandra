"use client";

import { useMemo, useState, useTransition } from "react";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { fmt } from "@/lib/format";
import { esAgotado, esStockBajo } from "@/lib/stock";
import {
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  sumarStock,
} from "@/lib/actions/productos";
import type { Role } from "@/lib/auth";

type ProductoDTO = {
  id: string;
  nombre: string;
  tipo: string;
  color: string;
  marca: string;
  proveedor: { id: string; nombre: string } | null;
  talle: string;
  costo: number;
  stock: number;
  stockMin: number;
  codigo: string | null;
};

type Props = {
  role: Role;
  productos: ProductoDTO[];
  tiposCalzado: string[];
  tiposAccesorio: string[];
  tallesCalzado: string[];
  tallesIndumentaria: string[];
  proveedoresNombres: string[];
  sinMovimientoIds: string[];
};

export function StockView(props: Props) {
  const { role, productos } = props;
  const isAdmin = role === "admin";
  const [showForm, setShowForm] = useState(false);

  const sinMovimientoSet = useMemo(() => new Set(props.sinMovimientoIds), [props.sinMovimientoIds]);
  const tiposAccesorioSet = useMemo(() => new Set(props.tiposAccesorio), [props.tiposAccesorio]);

  const metrics = useMemo(() => {
    const valorStock = productos.reduce((acc, p) => acc + p.stock * p.costo, 0);
    const agotados = productos.filter(esAgotado).length;
    const pocoStock = productos.filter(esStockBajo).length;
    const sinMovimiento = productos.filter((p) => p.stock > 0 && sinMovimientoSet.has(p.id)).length;
    return { valorStock, agotados, pocoStock, sinMovimiento };
  }, [productos, sinMovimientoSet]);

  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Stock</h1>
          <p>Productos, tipos, talles y cantidad disponible.</p>
        </div>
        {isAdmin && (
          <button className="btn" type="button" onClick={() => setShowForm((v) => !v)}>
            <IconPlus size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
            {showForm ? "Cerrar" : "Nuevo producto"}
          </button>
        )}
      </header>

      {isAdmin && (
        <div className="grid-metrics">
          <div className="metric">
            <div className="label">Valor de stock</div>
            <div className="value">{fmt(metrics.valorStock)}</div>
          </div>
          <div className="metric">
            <div className="label">Agotados</div>
            <div className="value neg">{metrics.agotados}</div>
          </div>
          <div className="metric">
            <div className="label">Poco stock</div>
            <div className="value">{metrics.pocoStock}</div>
          </div>
          <div className="metric">
            <div className="label">Sin movimiento (30d)</div>
            <div className="value">{metrics.sinMovimiento}</div>
          </div>
        </div>
      )}

      {isAdmin && showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <NuevoProductoForm {...props} onDone={() => setShowForm(false)} />
        </div>
      )}

      <div className="card">
        {productos.length === 0 ? (
          <p className="empty">Todavía no cargaste productos.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Marca</th>
                <th>Color</th>
                <th>Talle</th>
                <th>Código</th>
                {isAdmin && <th>Costo</th>}
                <th>Stock</th>
                <th>Mín.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <ProductoRow
                  key={p.id}
                  producto={p}
                  role={role}
                  esAccesorio={tiposAccesorioSet.has(p.tipo)}
                  sinMovimiento={p.stock > 0 && sinMovimientoSet.has(p.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ProductoRow({
  producto,
  role,
  esAccesorio,
  sinMovimiento,
}: {
  producto: ProductoDTO;
  role: Role;
  esAccesorio: boolean;
  sinMovimiento: boolean;
}) {
  const isAdmin = role === "admin";
  const [marca, setMarca] = useState(producto.marca);
  const [color, setColor] = useState(producto.color);
  const [codigo, setCodigo] = useState(producto.codigo ?? "");
  const [costo, setCosto] = useState(String(producto.costo));
  const [stock, setStock] = useState(String(producto.stock));
  const [stockMin, setStockMin] = useState(String(producto.stockMin));
  const [sumando, setSumando] = useState(false);
  const [cantidadASumar, setCantidadASumar] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function commit(field: string, value: unknown) {
    setError(null);
    startTransition(async () => {
      try {
        await actualizarProducto(producto.id, { [field]: value });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  function handleSumar() {
    const cantidad = Number(cantidadASumar);
    setError(null);
    startTransition(async () => {
      try {
        await sumarStock(producto.id, cantidad);
        setSumando(false);
        setCantidadASumar("1");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  function handleEliminar() {
    if (!confirm(`¿Eliminar ${producto.nombre} (talle ${producto.talle || "Único"})?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarProducto(producto.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      }
    });
  }

  return (
    <tr>
      <td>{producto.nombre}</td>
      <td>
        <span className={`tag ${esAccesorio ? "accesorio" : "calzado"}`}>{producto.tipo}</span>
      </td>
      <td>
        {isAdmin ? (
          <input value={marca} onChange={(e) => setMarca(e.target.value)} onBlur={() => marca !== producto.marca && commit("marca", marca)} style={{ minWidth: 90 }} disabled={pending} />
        ) : (
          producto.marca
        )}
      </td>
      <td>
        {isAdmin ? (
          <input value={color} onChange={(e) => setColor(e.target.value)} onBlur={() => color !== producto.color && commit("color", color)} style={{ minWidth: 80 }} disabled={pending} />
        ) : (
          producto.color
        )}
      </td>
      <td className="num">{producto.talle || "Único"}</td>
      <td>
        {isAdmin ? (
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onBlur={() => codigo !== (producto.codigo ?? "") && commit("codigo", codigo || null)}
            style={{ minWidth: 100 }}
            disabled={pending}
          />
        ) : (
          producto.codigo ?? "—"
        )}
      </td>
      {isAdmin && (
        <td>
          <input
            className="num"
            type="number"
            step="0.01"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
            onBlur={() => Number(costo) !== producto.costo && commit("costo", Number(costo))}
            style={{ width: 90 }}
            disabled={pending}
          />
        </td>
      )}
      <td>
        {isAdmin ? (
          <input
            className={`num ${esAgotado(producto) ? "low-stock" : ""}`}
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            onBlur={() => Number(stock) !== producto.stock && commit("stock", Number(stock))}
            style={{ width: 70 }}
            disabled={pending}
          />
        ) : sumando ? (
          <span style={{ display: "flex", gap: 4 }}>
            <input
              className="num"
              type="number"
              min={1}
              value={cantidadASumar}
              onChange={(e) => setCantidadASumar(e.target.value)}
              style={{ width: 60 }}
              autoFocus
            />
            <button className="btn small" type="button" onClick={handleSumar} disabled={pending}>
              OK
            </button>
          </span>
        ) : (
          <span className={`num ${esAgotado(producto) ? "out-stock" : esStockBajo(producto) ? "low-stock" : ""}`}>
            {esAgotado(producto) ? "Agotado" : producto.stock}
          </span>
        )}
      </td>
      <td>
        {isAdmin ? (
          <input
            className="num"
            type="number"
            value={stockMin}
            onChange={(e) => setStockMin(e.target.value)}
            onBlur={() => Number(stockMin) !== producto.stockMin && commit("stockMin", Number(stockMin))}
            style={{ width: 60 }}
            disabled={pending}
          />
        ) : (
          <span className="num">{producto.stockMin}</span>
        )}
      </td>
      <td>
        {isAdmin ? (
          <button className="btn danger small" type="button" onClick={handleEliminar} disabled={pending}>
            <IconTrash size={14} />
          </button>
        ) : (
          !sumando && (
            <button className="btn ghost small" type="button" onClick={() => setSumando(true)}>
              + Stock
            </button>
          )
        )}
        {error && <div style={{ color: "var(--danger)", fontSize: 11, marginTop: 4 }}>{error}</div>}
        {sinMovimiento && isAdmin && <div className="hint">Sin movimiento</div>}
      </td>
    </tr>
  );
}

function NuevoProductoForm(props: Props & { onDone: () => void }) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState(props.tiposCalzado[0] ?? "");
  const [color, setColor] = useState("");
  const [marca, setMarca] = useState("");
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [costo, setCosto] = useState("");
  const [stockMin, setStockMin] = useState("2");
  const [seleccion, setSeleccion] = useState<Record<string, { activo: boolean; stock: string; codigo: string }>>({});
  const [cantidadRapida, setCantidadRapida] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const esAccesorio = props.tiposAccesorio.includes(tipo);
  const chips = ["Único", ...(esAccesorio ? props.tallesIndumentaria : props.tallesCalzado)];

  function toggleChip(talle: string) {
    setSeleccion((prev) => ({
      ...prev,
      [talle]: {
        activo: !(prev[talle]?.activo ?? false),
        stock: prev[talle]?.stock ?? "1",
        codigo: prev[talle]?.codigo ?? "",
      },
    }));
  }

  function updateChip(talle: string, field: "stock" | "codigo", value: string) {
    setSeleccion((prev) => ({
      ...prev,
      [talle]: { activo: prev[talle]?.activo ?? true, stock: prev[talle]?.stock ?? "1", codigo: prev[talle]?.codigo ?? "", [field]: value },
    }));
  }

  function aplicarCantidadRapida() {
    setSeleccion((prev) => {
      const next = { ...prev };
      for (const talle of Object.keys(next)) {
        if (next[talle].activo) next[talle] = { ...next[talle], stock: cantidadRapida };
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const talles = Object.entries(seleccion)
      .filter(([, v]) => v.activo)
      .map(([talle, v]) => ({ talle, stock: Number(v.stock) || 0, codigo: v.codigo.trim() || undefined }));

    if (talles.length === 0) {
      setError("Elegí al menos un talle");
      return;
    }

    startTransition(async () => {
      try {
        await crearProducto({
          nombre,
          tipo,
          color,
          marca,
          proveedorNombre: proveedorNombre || undefined,
          costo: Number(costo),
          stockMin: Number(stockMin) || 0,
          talles,
        });
        props.onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="p-nombre">Nombre</label>
        <input id="p-nombre" placeholder="Bota cuero negra" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="p-tipo">Tipo</label>
        <select id="p-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <optgroup label="Calzado">
            {props.tiposCalzado.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </optgroup>
          <optgroup label="Accesorios">
            {props.tiposAccesorio.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </optgroup>
        </select>
      </div>
      <div className="field">
        <label htmlFor="p-color">Color</label>
        <input id="p-color" placeholder="Negro" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="p-marca">Marca</label>
        <input id="p-marca" placeholder="Grimoldi" value={marca} onChange={(e) => setMarca(e.target.value)} list="marcas-list" />
      </div>
      <div className="field">
        <label htmlFor="p-proveedor">Proveedor</label>
        <input id="p-proveedor" value={proveedorNombre} onChange={(e) => setProveedorNombre(e.target.value)} list="proveedores-list" />
        <datalist id="proveedores-list">
          {props.proveedoresNombres.map((n) => <option key={n} value={n} />)}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor="p-costo">Costo</label>
        <input id="p-costo" type="number" step="0.01" min="0" value={costo} onChange={(e) => setCosto(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="p-stock-min">Stock mínimo</label>
        <input id="p-stock-min" type="number" min="0" value={stockMin} onChange={(e) => setStockMin(e.target.value)} />
      </div>

      <div style={{ flexBasis: "100%" }}>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>Talles</label>
        </div>
        <div className="talles-grid">
          {chips.map((talle) => {
            const activo = seleccion[talle]?.activo ?? false;
            return (
              <div key={talle} className={`talle-chip ${activo ? "active" : ""}`}>
                <label>
                  <input type="checkbox" checked={activo} onChange={() => toggleChip(talle)} />
                  {talle}
                </label>
                {activo && (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={seleccion[talle]?.stock ?? "1"}
                      onChange={(e) => updateChip(talle, "stock", e.target.value)}
                      title="Cantidad"
                    />
                    <input
                      placeholder="Código"
                      value={seleccion[talle]?.codigo ?? ""}
                      onChange={(e) => updateChip(talle, "codigo", e.target.value)}
                      style={{ width: 80, height: 26, fontSize: 11 }}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="pago-row" style={{ marginTop: 10 }}>
          <input type="number" min={1} value={cantidadRapida} onChange={(e) => setCantidadRapida(e.target.value)} style={{ width: 70 }} />
          <button type="button" className="btn ghost small" onClick={aplicarCantidadRapida}>
            Aplicar cantidad a los tildados
          </button>
        </div>
      </div>

      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}

      <button className="btn" type="submit" disabled={pending}>
        Guardar producto
      </button>
    </form>
  );
}
