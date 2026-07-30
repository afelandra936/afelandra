"use client";

import { useMemo, useState, useTransition } from "react";
import { IconTrash, IconPlus, IconCopy, IconPencil } from "@tabler/icons-react";
import { fmt } from "@/lib/format";
import { esAgotado, esStockBajo } from "@/lib/stock";
import { BarChart } from "@/components/charts/BarChart";
import {
  actualizarProducto,
  actualizarCostoTodosTalles,
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
  observaciones: string | null;
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
  const [seed, setSeed] = useState<ProductoDTO | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q) ||
        p.talle.toLowerCase().includes(q) ||
        p.tipo.toLowerCase().includes(q) ||
        (p.codigo?.toLowerCase().includes(q) ?? false)
    );
  }, [productos, busqueda]);

  function abrirNuevo() {
    setSeed(null);
    setShowForm(true);
  }

  function abrirDuplicado(producto: ProductoDTO) {
    setSeed(producto);
    setShowForm(true);
  }

  const sinMovimientoSet = useMemo(() => new Set(props.sinMovimientoIds), [props.sinMovimientoIds]);
  const tiposAccesorioSet = useMemo(() => new Set(props.tiposAccesorio), [props.tiposAccesorio]);

  const metrics = useMemo(() => {
    const valorStock = productos.reduce((acc, p) => acc + p.stock * p.costo, 0);
    const agotados = productos.filter(esAgotado).length;
    const pocoStock = productos.filter(esStockBajo).length;
    const sinMovimiento = productos.filter((p) => p.stock > 0 && sinMovimientoSet.has(p.id)).length;
    return { valorStock, agotados, pocoStock, sinMovimiento };
  }, [productos, sinMovimientoSet]);

  const stockPorTipo = useMemo(() => {
    const unidades = new Map<string, number>();
    const modelos = new Map<string, Set<string>>();
    for (const p of productos) {
      unidades.set(p.tipo, (unidades.get(p.tipo) ?? 0) + p.stock);
      if (!modelos.has(p.tipo)) modelos.set(p.tipo, new Set());
      modelos.get(p.tipo)!.add(p.nombre);
    }
    return {
      unidades: [...unidades.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
      modelos: [...modelos.entries()]
        .sort((a, b) => b[1].size - a[1].size)
        .map(([label, set]) => ({ label, value: set.size })),
    };
  }, [productos]);

  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Stock</h1>
          <p>Productos, tipos, talles y cantidad disponible.</p>
        </div>
        {isAdmin && (
          <button className="btn" type="button" onClick={() => (showForm ? setShowForm(false) : abrirNuevo())}>
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

      {isAdmin && (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>Stock por categoría</div>
          <div className="cols-2" style={{ marginBottom: 24 }}>
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>Unidades en stock</h3>
              <BarChart entries={stockPorTipo.unidades} />
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>Modelos distintos</h3>
              <BarChart entries={stockPorTipo.modelos} />
            </div>
          </div>
        </>
      )}

      {isAdmin && showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <NuevoProductoForm
            key={seed?.id ?? "new"}
            {...props}
            seed={seed}
            onDone={() => setShowForm(false)}
          />
        </div>
      )}

      {productos.length > 0 && (
        <div className="field" style={{ maxWidth: 320, marginBottom: 12 }}>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, marca, color, talle, código o tipo..."
          />
        </div>
      )}

      <div className="card">
        {productos.length === 0 ? (
          <p className="empty">Todavía no cargaste productos.</p>
        ) : productosFiltrados.length === 0 ? (
          <p className="empty">No se encontraron productos para &quot;{busqueda}&quot;.</p>
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
                <th>Observaciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p) => (
                <ProductoRow
                  key={p.id}
                  producto={p}
                  role={role}
                  esAccesorio={tiposAccesorioSet.has(p.tipo)}
                  sinMovimiento={p.stock > 0 && sinMovimientoSet.has(p.id)}
                  onDuplicate={abrirDuplicado}
                  tiposCalzado={props.tiposCalzado}
                  tiposAccesorio={props.tiposAccesorio}
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
  onDuplicate,
  tiposCalzado,
  tiposAccesorio,
}: {
  producto: ProductoDTO;
  role: Role;
  esAccesorio: boolean;
  sinMovimiento: boolean;
  onDuplicate: (producto: ProductoDTO) => void;
  tiposCalzado: string[];
  tiposAccesorio: string[];
}) {
  const isAdmin = role === "admin";
  const [editing, setEditing] = useState(false);
  const [marca, setMarca] = useState(producto.marca);
  const [color, setColor] = useState(producto.color);
  const [codigo, setCodigo] = useState(producto.codigo ?? "");
  const [costo, setCosto] = useState(String(producto.costo));
  const [stock, setStock] = useState(String(producto.stock));
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

  function commitCosto() {
    const nuevoCosto = Number(costo);
    if (nuevoCosto === producto.costo) return;
    setError(null);
    const aplicarATodos = confirm(`¿Aplicar este costo a todos los talles de "${producto.nombre}"?`);
    startTransition(async () => {
      try {
        if (aplicarATodos) {
          await actualizarCostoTodosTalles(producto.nombre, nuevoCosto);
        } else {
          await actualizarProducto(producto.id, { costo: nuevoCosto });
        }
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

  if (editing) {
    return (
      <EditProductoRow
        producto={producto}
        tiposCalzado={tiposCalzado}
        tiposAccesorio={tiposAccesorio}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <tr>
      <td>{producto.nombre}</td>
      <td>
        <span className={`tag ${esAccesorio ? "accesorio" : "calzado"}`}>{producto.tipo}</span>
      </td>
      <td>
        {isAdmin ? (
          <input value={marca} onChange={(e) => setMarca(e.target.value)} onBlur={() => marca !== producto.marca && commit("marca", marca)} style={{ width: 70 }} disabled={pending} />
        ) : (
          producto.marca
        )}
      </td>
      <td>
        {isAdmin ? (
          <input value={color} onChange={(e) => setColor(e.target.value)} onBlur={() => color !== producto.color && commit("color", color)} style={{ width: 60 }} disabled={pending} />
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
            style={{ width: 80 }}
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
            onBlur={commitCosto}
            style={{ width: 100 }}
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
            style={{ width: 55 }}
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
      <td className="hint" style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={producto.observaciones ?? undefined}>
        {producto.observaciones ?? "—"}
      </td>
      <td>
        {isAdmin ? (
          <span style={{ display: "flex", gap: 6 }}>
            <button className="btn ghost small" type="button" onClick={() => setEditing(true)} disabled={pending} title="Editar">
              <IconPencil size={14} />
            </button>
            <button className="btn ghost small" type="button" onClick={() => onDuplicate(producto)} disabled={pending} title="Duplicar">
              <IconCopy size={14} />
            </button>
            <button className="btn danger small" type="button" onClick={handleEliminar} disabled={pending}>
              <IconTrash size={14} />
            </button>
          </span>
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

function EditProductoRow({
  producto,
  tiposCalzado,
  tiposAccesorio,
  onDone,
  onCancel,
}: {
  producto: ProductoDTO;
  tiposCalzado: string[];
  tiposAccesorio: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [nombre, setNombre] = useState(producto.nombre);
  const [tipo, setTipo] = useState(producto.tipo);
  const [marca, setMarca] = useState(producto.marca);
  const [color, setColor] = useState(producto.color);
  const [talle, setTalle] = useState(producto.talle || "Único");
  const [codigo, setCodigo] = useState(producto.codigo ?? "");
  const [costo, setCosto] = useState(String(producto.costo));
  const [stock, setStock] = useState(String(producto.stock));
  const [observaciones, setObservaciones] = useState(producto.observaciones ?? "");
  const [aplicarCostoATodos, setAplicarCostoATodos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const costoCambio = Number(costo) !== producto.costo;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await actualizarProducto(producto.id, {
          nombre,
          tipo,
          marca,
          color,
          talle,
          codigo: codigo || null,
          ...(aplicarCostoATodos && costoCambio ? {} : { costo: Number(costo) }),
          stock: Number(stock),
          observaciones: observaciones.trim() || null,
        });
        if (aplicarCostoATodos && costoCambio) {
          await actualizarCostoTodosTalles(nombre, Number(costo));
        }
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <tr>
      <td colSpan={10}>
        <form className="inline-form" onSubmit={handleSubmit} style={{ marginBottom: 0 }}>
          <div className="field">
            <label htmlFor={`ep-nombre-${producto.id}`}>Nombre</label>
            <input id={`ep-nombre-${producto.id}`} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor={`ep-tipo-${producto.id}`}>Tipo</label>
            <select id={`ep-tipo-${producto.id}`} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <optgroup label="Calzado">
                {tiposCalzado.map((t) => <option key={t} value={t}>{t}</option>)}
              </optgroup>
              <optgroup label="Accesorios">
                {tiposAccesorio.map((t) => <option key={t} value={t}>{t}</option>)}
              </optgroup>
            </select>
          </div>
          <div className="field">
            <label htmlFor={`ep-marca-${producto.id}`}>Marca</label>
            <input id={`ep-marca-${producto.id}`} value={marca} onChange={(e) => setMarca(e.target.value)} style={{ width: 90 }} />
          </div>
          <div className="field">
            <label htmlFor={`ep-color-${producto.id}`}>Color</label>
            <input id={`ep-color-${producto.id}`} value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 80 }} />
          </div>
          <div className="field">
            <label htmlFor={`ep-talle-${producto.id}`}>Talle</label>
            <input id={`ep-talle-${producto.id}`} value={talle} onChange={(e) => setTalle(e.target.value)} style={{ width: 70 }} />
          </div>
          <div className="field">
            <label htmlFor={`ep-codigo-${producto.id}`}>Código</label>
            <input id={`ep-codigo-${producto.id}`} value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ width: 100 }} />
          </div>
          <div className="field">
            <label htmlFor={`ep-costo-${producto.id}`}>Costo</label>
            <input id={`ep-costo-${producto.id}`} type="number" step="0.01" min="0" value={costo} onChange={(e) => setCosto(e.target.value)} style={{ width: 100 }} required />
          </div>
          <div className="field">
            <label htmlFor={`ep-stock-${producto.id}`}>Stock</label>
            <input id={`ep-stock-${producto.id}`} type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} style={{ width: 70 }} required />
          </div>
          <div className="field" style={{ minWidth: 200 }}>
            <label htmlFor={`ep-obs-${producto.id}`}>Observaciones</label>
            <input id={`ep-obs-${producto.id}`} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
          {costoCambio && (
            <div className="checkbox-row" style={{ flexBasis: "100%" }}>
              <input
                id={`ep-costo-todos-${producto.id}`}
                type="checkbox"
                checked={aplicarCostoATodos}
                onChange={(e) => setAplicarCostoATodos(e.target.checked)}
              />
              <label htmlFor={`ep-costo-todos-${producto.id}`}>
                ¿Aplicar este costo a todos los talles de este modelo?
              </label>
            </div>
          )}
          {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
          <button className="btn" type="submit" disabled={pending}>Guardar</button>
          <button className="btn ghost" type="button" onClick={onCancel} disabled={pending}>Cancelar</button>
        </form>
      </td>
    </tr>
  );
}

function NuevoProductoForm(props: Props & { seed: ProductoDTO | null; onDone: () => void }) {
  const { seed } = props;
  const [nombre, setNombre] = useState(seed?.nombre ?? "");
  const [tipo, setTipo] = useState(seed?.tipo ?? props.tiposCalzado[0] ?? "");
  const [color, setColor] = useState(seed?.color ?? "");
  const [marca, setMarca] = useState(seed?.marca ?? "");
  const [proveedorNombre, setProveedorNombre] = useState(seed?.proveedor?.nombre ?? "");
  const [costo, setCosto] = useState(seed ? String(seed.costo) : "");
  const [stockMin, setStockMin] = useState(seed ? String(seed.stockMin) : "2");
  const [observaciones, setObservaciones] = useState(seed?.observaciones ?? "");
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
          observaciones: observaciones || undefined,
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
      {seed && (
        <p className="hint" style={{ flexBasis: "100%", margin: 0 }}>
          Duplicando &quot;{seed.nombre}&quot; — elegí el talle nuevo y la cantidad.
        </p>
      )}
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
      <div className="field" style={{ minWidth: 200 }}>
        <label htmlFor="p-obs">Observaciones</label>
        <input id="p-obs" placeholder="Opcional" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
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
