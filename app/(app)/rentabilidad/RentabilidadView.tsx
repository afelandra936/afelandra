import Link from "next/link";
import { fmt, fmtDate } from "@/lib/format";
import { MEDIOS } from "@/lib/pricing";
import { BarChart } from "@/components/charts/BarChart";
import type { ChartEntry } from "@/lib/reports";

function haceDiasISO(hoy: Date, n: number): string {
  return new Date(hoy.getTime() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

type Data = {
  ventasTotales: number;
  costoMercaderia: number;
  ganancia: number;
  margen: number;
  porProducto: ChartEntry[];
  porProveedor: ChartEntry[];
};

type ComisionVendedor = { vendedor: string; totalComision: number; totalGeneral: number };
type VentaPorDia = { fecha: string; porMedio: Record<string, number>; total: number };

export function RentabilidadView({
  data,
  comisiones,
  ventasPorDia,
  desde,
  hasta,
}: {
  data: Data;
  comisiones: ComisionVendedor[];
  ventasPorDia: VentaPorDia[];
  desde: string;
  hasta: string;
}) {
  const hoy = new Date();
  const hoyISO = hoy.toISOString().slice(0, 10);
  const OPCIONES = [
    { key: "7", label: "7 días", desde: haceDiasISO(hoy, 7), hasta: hoyISO },
    { key: "30", label: "30 días", desde: haceDiasISO(hoy, 30), hasta: hoyISO },
    { key: "90", label: "90 días", desde: haceDiasISO(hoy, 90), hasta: hoyISO },
    { key: "todo", label: "Todo", desde: "2000-01-01", hasta: hoyISO },
  ];
  const opcionActiva = OPCIONES.find((o) => o.desde === desde && o.hasta === hasta)?.key ?? null;

  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Rentabilidad</h1>
          <p>
            Ganancia real después de costo y medio de pago. Del {fmtDate(`${desde}T12:00:00`)} al {fmtDate(`${hasta}T12:00:00`)}.
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <form action="/rentabilidad" method="get" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div className="field">
              <label htmlFor="rp-desde">Desde</label>
              <input id="rp-desde" type="date" name="desde" defaultValue={desde} max={hasta} />
            </div>
            <div className="field">
              <label htmlFor="rp-hasta">Hasta</label>
              <input id="rp-hasta" type="date" name="hasta" defaultValue={hasta} min={desde} />
            </div>
            <button className="btn small" type="submit">Ver</button>
          </form>
          <div style={{ display: "flex", gap: 6 }}>
            {OPCIONES.map((o) => (
              <Link
                key={o.key}
                href={`/rentabilidad?desde=${o.desde}&hasta=${o.hasta}`}
                className={`btn small ${o.key === opcionActiva ? "" : "ghost"}`}
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="grid-metrics">
        <div className="metric">
          <div className="label">Ventas totales</div>
          <div className="value">{fmt(data.ventasTotales)}</div>
        </div>
        <div className="metric">
          <div className="label">Costo de mercadería</div>
          <div className="value">{fmt(data.costoMercaderia)}</div>
        </div>
        <div className="metric">
          <div className="label">Ganancia</div>
          <div className={`value ${data.ganancia >= 0 ? "pos" : "neg"}`}>{fmt(data.ganancia)}</div>
        </div>
        <div className="metric">
          <div className="label">Margen promedio</div>
          <div className="value">{data.margen.toFixed(1)}%</div>
        </div>
      </div>

      <div className="cols-2">
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 14 }}>Ganancia por producto</h3>
          <BarChart entries={data.porProducto} />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 14 }}>Ganancia por proveedor</h3>
          <BarChart entries={data.porProveedor} />
        </div>
      </div>

      <div className="section-title">Ventas por vendedor</div>
      <div className="card">
        <p className="hint" style={{ marginBottom: 12 }}>
          Base de comisión: solo lo cobrado en efectivo o transferencia.
        </p>
        {comisiones.length === 0 ? (
          <p className="empty">No hay ventas en este período.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Efectivo + Transferencia</th>
                <th>Total general</th>
              </tr>
            </thead>
            <tbody>
              {comisiones.map((c) => (
                <tr key={c.vendedor}>
                  <td>{c.vendedor}</td>
                  <td className="num">{fmt(c.totalComision)}</td>
                  <td className="num">{fmt(c.totalGeneral)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section-title">Ventas por día</div>
      <div className="card">
        {ventasPorDia.length === 0 ? (
          <p className="empty">No hay ventas en este período.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                {MEDIOS.map((m) => <th key={m}>{m}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventasPorDia.map((d) => (
                <tr key={d.fecha}>
                  <td>{fmtDate(`${d.fecha}T12:00:00`)}</td>
                  {MEDIOS.map((m) => (
                    <td key={m} className="num">{d.porMedio[m] ? fmt(d.porMedio[m]) : "—"}</td>
                  ))}
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
