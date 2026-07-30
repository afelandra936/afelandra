import Link from "next/link";
import { fmt } from "@/lib/format";
import { BarChart } from "@/components/charts/BarChart";
import type { ChartEntry } from "@/lib/reports";

const OPCIONES = [
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
  { key: "todo", label: "Todo" },
];

type Data = {
  ventasTotales: number;
  costoMercaderia: number;
  ganancia: number;
  margen: number;
  porProducto: ChartEntry[];
  porProveedor: ChartEntry[];
};

type ComisionVendedor = { vendedor: string; totalComision: number; totalGeneral: number };

export function RentabilidadView({
  data,
  comisiones,
  periodoActivo,
}: {
  data: Data;
  comisiones: ComisionVendedor[];
  periodoActivo: string;
}) {
  return (
    <div className="view active">
      <header className="view-head">
        <div>
          <h1>Rentabilidad</h1>
          <p>Ganancia real después de costo y medio de pago.</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {OPCIONES.map((o) => (
            <Link
              key={o.key}
              href={`/rentabilidad?periodo=${o.key}`}
              className={`btn small ${o.key === periodoActivo ? "" : "ghost"}`}
            >
              {o.label}
            </Link>
          ))}
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
    </div>
  );
}
