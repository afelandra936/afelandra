"use client";

import { useEffect, useState, useTransition } from "react";
import { fmt, fmtDate } from "@/lib/format";
import { MEDIOS, precioUnitario, resolverCoeficientes } from "@/lib/pricing";
import { registrarCambio } from "@/lib/actions/cambios";
import { buscarClientes, type ClienteBusqueda } from "@/lib/actions/clientes";
import {
  buscarModelos,
  buscarColoresPorModelo,
  buscarVariantesPorModeloColor,
  type ProductoBusqueda,
} from "@/lib/actions/productos";
import type { Role } from "@/lib/auth";

type CambioDTO = {
  id: string;
  fecha: string;
  clienteNombre: string;
  nombreDevuelto: string;
  talleDevuelto: string;
  precioDevuelto: number;
  nombreNuevo: string;
  talleNuevo: string;
  precioNuevo: number;
  diferencia: number;
  tipo: "venta" | "nota_credito" | "sin_diferencia";
  vendedor: string;
  observaciones: string | null;
};

type NotaCreditoDTO = {
  id: string;
  clienteId: string;
  clienteNombre: string;
  montoInicial: number;
  saldo: number;
  fecha: string;
};

type ConfigDTO = { debito: number; credito3: number; credito6: number; contado: number };
type CoeficientesPorMarcaDTO = Record<string, ConfigDTO>;

export function CambiosView({
  role,
  cambios,
  notasCredito,
  vendedoresNombres,
  config,
  coeficientesPorMarca,
}: {
  role: Role;
  cambios: CambioDTO[];
  notasCredito: NotaCreditoDTO[];
  vendedoresNombres: string[];
  config: ConfigDTO;
  coeficientesPorMarca: CoeficientesPorMarcaDTO;
}) {
  const isAdmin = role === "admin";

  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Cambios</h1>
          <p>Devolución de una prenda a cambio de otra, con la diferencia como venta o nota de crédito.</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <RegistrarCambioForm vendedoresNombres={vendedoresNombres} config={config} coeficientesPorMarca={coeficientesPorMarca} />
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>Historial de cambios</div>
      <div className="card" style={{ marginBottom: 24 }}>
        {cambios.length === 0 ? (
          <p className="empty">Todavía no registraste ningún cambio.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Devuelve</th>
                <th>Se lleva</th>
                <th>Diferencia</th>
                <th>Resultado</th>
                <th>Vendedor</th>
              </tr>
            </thead>
            <tbody>
              {cambios.map((c) => (
                <tr key={c.id}>
                  <td>{fmtDate(c.fecha)}</td>
                  <td>{c.clienteNombre}</td>
                  <td>{c.nombreDevuelto} ({c.talleDevuelto || "Único"}) — {fmt(c.precioDevuelto)}</td>
                  <td>{c.nombreNuevo} ({c.talleNuevo || "Único"}) — {fmt(c.precioNuevo)}</td>
                  <td className="num">{fmt(c.diferencia)}</td>
                  <td>
                    {c.tipo === "venta" ? (
                      <span className="tag calzado">Cobrado</span>
                    ) : c.tipo === "nota_credito" ? (
                      <span className="hint">Nota de crédito</span>
                    ) : (
                      <span className="hint">Sin diferencia</span>
                    )}
                  </td>
                  <td>{c.vendedor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="section-title">Notas de crédito</div>
          <div className="card">
            {notasCredito.length === 0 ? (
              <p className="empty">No hay notas de crédito emitidas.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Monto inicial</th>
                    <th>Saldo</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {notasCredito.map((n) => (
                    <tr key={n.id}>
                      <td>{n.clienteNombre}</td>
                      <td className="num">{fmt(n.montoInicial)}</td>
                      <td className="num">{fmt(n.saldo)}</td>
                      <td>
                        {n.saldo <= 0 ? (
                          <span className="out-stock">Usada</span>
                        ) : n.saldo < n.montoInicial ? (
                          <span className="hint">Parcial</span>
                        ) : (
                          <span className="tag calzado">Activa</span>
                        )}
                      </td>
                      <td>{fmtDate(n.fecha)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RegistrarCambioForm({
  vendedoresNombres,
  config,
  coeficientesPorMarca,
}: {
  vendedoresNombres: string[];
  config: ConfigDTO;
  coeficientesPorMarca: CoeficientesPorMarcaDTO;
}) {
  const [clienteQuery, setClienteQuery] = useState("");
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
  const [devuelto, setDevuelto] = useState<ProductoBusqueda | null>(null);
  const [nuevo, setNuevo] = useState<ProductoBusqueda | null>(null);
  const [medioPago, setMedioPago] = useState<string>(MEDIOS[0]);
  const [vendedor, setVendedor] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const precioDevuelto = devuelto
    ? precioUnitario(devuelto.costo, medioPago, resolverCoeficientes(devuelto.marca, config, coeficientesPorMarca))
    : null;
  const precioNuevo = nuevo
    ? precioUnitario(nuevo.costo, medioPago, resolverCoeficientes(nuevo.marca, config, coeficientesPorMarca))
    : null;
  const diferencia = precioDevuelto !== null && precioNuevo !== null ? precioNuevo - precioDevuelto : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResultado(null);
    if (!cliente) {
      setError("Elegí un cliente");
      return;
    }
    if (!devuelto || !nuevo) {
      setError("Elegí el producto devuelto y el producto nuevo");
      return;
    }
    startTransition(async () => {
      const res = await registrarCambio({
        clienteId: cliente.id,
        productoDevueltoId: devuelto.id,
        productoNuevoId: nuevo.id,
        medioPago,
        vendedor,
        fecha,
        observaciones: observaciones || undefined,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      if (res.tipo === "venta") {
        setResultado(`Cliente pagó la diferencia: ${fmt(res.diferencia)} (${medioPago}).`);
      } else if (res.tipo === "nota_credito") {
        setResultado(`Se generó una nota de crédito a favor del cliente por ${fmt(Math.abs(res.diferencia))}.`);
      } else {
        setResultado("Cambio registrado sin diferencia.");
      }
      setClienteQuery("");
      setCliente(null);
      setDevuelto(null);
      setNuevo(null);
      setObservaciones("");
    });
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <ClientePicker query={clienteQuery} onQueryChange={setClienteQuery} cliente={cliente} onSelect={setCliente} />

      <div className="field">
        <label htmlFor="cb-fecha">Fecha</label>
        <input id="cb-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="cb-vendedor">Vendedor</label>
        <input id="cb-vendedor" value={vendedor} onChange={(e) => setVendedor(e.target.value)} list="cb-vendedores-list" required />
        <datalist id="cb-vendedores-list">
          {vendedoresNombres.map((n) => <option key={n} value={n} />)}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor="cb-medio">Medio de pago (para tasar ambos productos)</label>
        <select id="cb-medio" value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
          {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className="field" style={{ minWidth: 200 }}>
        <label htmlFor="cb-obs">Observaciones</label>
        <input id="cb-obs" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </div>

      <div style={{ flexBasis: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
        <div>
          <div className="hint" style={{ marginBottom: 6, fontWeight: 600 }}>Devuelve (repone stock)</div>
          <SelectorProducto value={devuelto} onChange={setDevuelto} />
          {precioDevuelto !== null && (
            <div className="hint" style={{ marginTop: 6 }}>Valor: <span className="num">{fmt(precioDevuelto)}</span></div>
          )}
        </div>
        <div>
          <div className="hint" style={{ marginBottom: 6, fontWeight: 600 }}>Se lleva (descuenta stock)</div>
          <SelectorProducto value={nuevo} onChange={setNuevo} />
          {precioNuevo !== null && (
            <div className="hint" style={{ marginTop: 6 }}>Valor: <span className="num">{fmt(precioNuevo)}</span></div>
          )}
        </div>
      </div>

      {diferencia !== null && (
        <div className="field" style={{ marginTop: 16 }}>
          <label>Diferencia</label>
          <div
            style={{ height: 36, display: "flex", alignItems: "center", fontSize: 18, fontWeight: 700 }}
            className="num"
          >
            {diferencia > 0.01
              ? `Cliente paga ${fmt(diferencia)}`
              : diferencia < -0.01
              ? `Nota de crédito ${fmt(Math.abs(diferencia))}`
              : "Sin diferencia"}
          </div>
        </div>
      )}

      {error && <p style={{ color: "var(--danger)", fontSize: 13, flexBasis: "100%" }}>{error}</p>}
      {resultado && <p className="hint" style={{ flexBasis: "100%" }}>{resultado}</p>}

      <button className="btn" type="submit" disabled={pending} style={{ flexBasis: "100%" }}>
        Registrar cambio
      </button>
    </form>
  );
}

function ClientePicker({
  query,
  onQueryChange,
  cliente,
  onSelect,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  cliente: ClienteBusqueda | null;
  onSelect: (c: ClienteBusqueda | null) => void;
}) {
  const [sugerencias, setSugerencias] = useState<ClienteBusqueda[]>([]);
  const [mostrar, setMostrar] = useState(false);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (cliente && query === cliente.nombre) {
      setSugerencias([]);
      return;
    }
    if (!query.trim()) {
      setSugerencias([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(async () => {
      const resultados = await buscarClientes(query);
      setSugerencias(resultados);
      setBuscando(false);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="field" style={{ position: "relative", minWidth: 200 }}>
      <label htmlFor="cb-cliente">Cliente</label>
      <input
        id="cb-cliente"
        placeholder="Buscar cliente..."
        autoComplete="off"
        value={query}
        onChange={(e) => {
          const texto = e.target.value;
          onQueryChange(texto);
          if (cliente && texto !== cliente.nombre) onSelect(null);
          setMostrar(true);
        }}
        onFocus={() => setMostrar(true)}
        onBlur={() => setTimeout(() => setMostrar(false), 150)}
      />
      {mostrar && (buscando || sugerencias.length > 0) && (
        <ul className="autocomplete-list">
          {buscando ? (
            <li className="autocomplete-hint">Buscando...</li>
          ) : (
            sugerencias.map((c) => (
              <li
                key={c.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(c);
                  onQueryChange(c.nombre);
                  setSugerencias([]);
                  setMostrar(false);
                }}
              >
                {c.nombre}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function SelectorProducto({
  value,
  onChange,
}: {
  value: ProductoBusqueda | null;
  onChange: (p: ProductoBusqueda | null) => void;
}) {
  const [modeloQuery, setModeloQuery] = useState("");
  const [modelo, setModelo] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [sugerenciasModelo, setSugerenciasModelo] = useState<string[]>([]);
  const [mostrarSugerenciasModelo, setMostrarSugerenciasModelo] = useState(false);
  const [buscandoModelo, setBuscandoModelo] = useState(false);
  const [colores, setColores] = useState<{ color: string; stock: number }[]>([]);
  const [cargandoColores, setCargandoColores] = useState(false);
  const [variantes, setVariantes] = useState<ProductoBusqueda[]>([]);
  const [cargandoVariantes, setCargandoVariantes] = useState(false);

  useEffect(() => {
    if (modelo && modeloQuery === modelo) {
      setSugerenciasModelo([]);
      return;
    }
    if (!modeloQuery.trim()) {
      setSugerenciasModelo([]);
      setBuscandoModelo(false);
      return;
    }
    setBuscandoModelo(true);
    const timer = setTimeout(async () => {
      const resultados = await buscarModelos(modeloQuery);
      setSugerenciasModelo(resultados);
      setBuscandoModelo(false);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeloQuery]);

  useEffect(() => {
    if (!modelo) {
      setColores([]);
      return;
    }
    setCargandoColores(true);
    buscarColoresPorModelo(modelo).then((res) => {
      setColores(res);
      setCargandoColores(false);
    });
  }, [modelo]);

  useEffect(() => {
    if (!modelo || !color) {
      setVariantes([]);
      return;
    }
    setCargandoVariantes(true);
    buscarVariantesPorModeloColor(modelo, color).then((res) => {
      setVariantes(res);
      setCargandoVariantes(false);
    });
  }, [modelo, color]);

  function elegirModelo(nombre: string) {
    setModelo(nombre);
    setModeloQuery(nombre);
    setColor(null);
    onChange(null);
    setSugerenciasModelo([]);
    setMostrarSugerenciasModelo(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ position: "relative" }}>
        <input
          placeholder="Buscar modelo..."
          autoComplete="off"
          value={modeloQuery}
          onChange={(e) => {
            const texto = e.target.value;
            setModeloQuery(texto);
            if (modelo && texto !== modelo) {
              setModelo(null);
              setColor(null);
              onChange(null);
            }
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

      {modelo && (
        <select
          value={color ?? ""}
          onChange={(e) => {
            setColor(e.target.value || null);
            onChange(null);
          }}
          disabled={cargandoColores}
        >
          <option value="">{cargandoColores ? "Cargando colores..." : "Elegí un color..."}</option>
          {colores.map((c) => (
            <option key={c.color} value={c.color}>{c.color} ({c.stock} en stock)</option>
          ))}
        </select>
      )}

      {modelo && color && (
        <select
          value={value?.id ?? ""}
          onChange={(e) => onChange(variantes.find((v) => v.id === e.target.value) ?? null)}
          disabled={cargandoVariantes}
        >
          <option value="">{cargandoVariantes ? "Cargando talles..." : "Elegí un talle..."}</option>
          {variantes.map((v) => (
            <option key={v.id} value={v.id}>{v.talle || "Único"} — {v.stock} en stock</option>
          ))}
        </select>
      )}

      {value && (
        <div className="hint" style={{ fontWeight: 600 }}>
          {modelo} · {color} · Talle: {value.talle || "Único"}
        </div>
      )}
    </div>
  );
}
