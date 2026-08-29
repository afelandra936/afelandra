"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import { buscarVariantesPrecios, type PrecioBusqueda } from "@/lib/actions/productos";

export function PreciosView() {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<PrecioBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscoAlgunaVez, setBuscoAlgunaVez] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const timer = setTimeout(async () => {
      const res = await buscarVariantesPrecios(query);
      setResultados(res);
      setBuscando(false);
      setBuscoAlgunaVez(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Precios</h1>
          <p>Consultá el precio de cualquier variante en todos los medios de pago, sin registrar una venta.</p>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <input
          autoFocus
          placeholder="Buscar por nombre, color, código de barras u observación..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            height: 52,
            fontSize: 18,
            padding: "0 18px",
            borderRadius: 12,
          }}
        />
      </div>

      {buscando && <p className="empty">Buscando...</p>}

      {!buscando && query.trim() && resultados.length === 0 && buscoAlgunaVez && (
        <p className="empty">No encontré ninguna variante que coincida con &quot;{query}&quot;.</p>
      )}

      {!buscando && resultados.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {resultados.map((r) => (
            <VarianteCard key={r.id} variante={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function VarianteCard({ variante: r }: { variante: PrecioBusqueda }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{r.nombre}</div>
          {r.stock <= 0 ? (
            <span className="out-stock">Sin stock</span>
          ) : r.stock <= 2 ? (
            <span className="low-stock">{r.stock} en stock</span>
          ) : (
            <span className="hint">{r.stock} en stock</span>
          )}
        </div>
        <div className="hint" style={{ marginTop: 2 }}>
          {r.color || "—"} · Talle {r.talle || "Único"} {r.marca && `· ${r.marca}`}
        </div>
        {r.codigo && <div className="hint" style={{ fontFamily: "var(--font-mono, monospace)" }}>Código: {r.codigo}</div>}
        {r.observaciones && <div className="hint" style={{ marginTop: 2, fontStyle: "italic" }}>{r.observaciones}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
        {r.precios.map((p) => (
          <div
            key={p.medio}
            style={{
              background: "var(--surface-soft)",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            <div className="hint" style={{ fontSize: 11 }}>{p.medio}</div>
            <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{fmt(p.precio)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
