"use client";

import { useEffect, useState, useTransition } from "react";
import { IconTrash } from "@tabler/icons-react";
import { fmt, fmtDate } from "@/lib/format";
import { MEDIOS, precioUnitario, factorPromocion, calcularMontoResto, resolverCoeficientes } from "@/lib/pricing";
import { registrarVentaCarrito, eliminarVenta, type ItemCarrito } from "@/lib/actions/ventas";
import { buscarVoucherPorCodigo } from "@/lib/actions/vouchers";
import { buscarNotaCreditoPorCliente } from "@/lib/actions/cambios";
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
  observaciones: string | null;
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
  pagos: { medio: string; monto: number }[];
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
  vendedoresNombres: string[];
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
      <td>
        {venta.pagos.length > 1 ? (
          <span className="num" style={{ fontSize: 12.5 }} title={venta.medioPago}>
            {venta.pagos.map((p) => `${p.medio} ${fmt(p.monto)}`).join(" + ")}
          </span>
        ) : (
          venta.medioPago
        )}
      </td>
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

type PorItem = {
  id: string;
  pagos: { medio: string; monto: number; voucherId?: string; notaCreditoId?: string }[];
  total: number;
};

/** Un crédito (voucher o nota de crédito) aplicado como un medio de pago más dentro del
 * "resto automático": refMedio es el medio con el que se tasa su costo cubierto (para un
 * voucher, el medio con el que se compró — así $100.000 de un voucher comprado en
 * Efectivo cubre exactamente lo mismo que $100.000 pagados hoy en Efectivo), mientras que
 * medio/campo/refId son solo para cómo queda guardado el pago (etiqueta + referencia). */
type CreditoAplicado = {
  monto: number;
  refMedio: string;
  medio: string;
  campo: "voucherId" | "notaCreditoId";
  refId: string;
};

/**
 * Igual que el "resto automático" de una venta simple, pero usando el costo de
 * TODOS los productos del carrito como base — así seguir cobrando en 3 cuotas o en
 * efectivo sigue "valiendo" lo mismo en términos de costo cubierto, sin importar
 * cuántos productos distintos haya. Los créditos (voucher/nota de crédito) entran a
 * este mismo cálculo como un pago más — se convierten a costo cubierto con SU PROPIO
 * medio de referencia (no con el medio del resto), exactamente igual que cualquier
 * otro medio ingresado a mano. Después, cada producto se lleva su parte proporcional
 * a su costo, y recién ahí se le aplica su propia promoción (si tiene).
 */
function calcularDivisionCarrito(
  itemsValidos: ItemConProducto[],
  pagosParciales: { medio: string; monto: string }[],
  creditos: CreditoAplicado[],
  medioResto: string,
  config: ConfigDTO,
  coeficientesPorMarca: CoeficientesPorMarcaDTO,
  promociones: PromocionDTO[]
): {
  porItem: PorItem[];
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

  // Para el cálculo de costo cubierto, cada crédito entra con SU propio medio de
  // referencia (no con "Voucher"/"Nota de crédito", que no tienen coeficiente propio).
  const pagosParaCosto = [
    ...pagosNum,
    ...creditos.map((c) => ({ medio: c.refMedio, monto: c.monto })),
  ];
  const montoResto = calcularMontoResto(costoTotalCarrito, pagosParaCosto, medioResto, coefResto);

  // Para guardar, en cambio, cada crédito usa su propia etiqueta (Voucher/Nota de
  // crédito) y su id de referencia — así el pago queda identificado correctamente y
  // Cierre de caja lo puede excluir (esa plata ya se contó en otro momento).
  const pagosGlobal: { medio: string; monto: number; voucherId?: string; notaCreditoId?: string }[] = [
    ...pagosNum,
    ...creditos.map((c) => ({ medio: c.medio, monto: c.monto, [c.campo]: c.refId })),
    { medio: medioResto, monto: montoResto },
  ];

  let total = 0;
  const porItem = itemsValidos.map((it) => {
    const cantidad = Number(it.cantidad) || 0;
    const costoItem = it.producto.costo * cantidad;
    const share = costoTotalCarrito > 0 ? costoItem / costoTotalCarrito : 0;
    const promocion = promociones.find((p) => p.id === it.promocionId) ?? null;
    const factor = factorPromocion(promocion, cantidad);
    const pagos = pagosGlobal.map((p) => ({ ...p, monto: p.monto * share }));
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

  const [usarVoucher, setUsarVoucher] = useState(false);
  const [voucherCodigoInput, setVoucherCodigoInput] = useState("");
  const [voucherInfo, setVoucherInfo] = useState<{ id: string; codigo: string; saldo: number; medioPago: string } | null>(null);
  const [montoVoucherInput, setMontoVoucherInput] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [buscandoVoucher, startVoucherTransition] = useTransition();

  const [notaCreditoDetectada, setNotaCreditoDetectada] = useState<{ id: string; saldo: number; clienteNombre: string; medioPago: string } | null>(null);
  const [usarNotaCredito, setUsarNotaCredito] = useState(false);
  const [montoNotaCreditoInput, setMontoNotaCreditoInput] = useState("");

  const itemsValidos = items.filter((it): it is ItemConProducto => it.producto !== null);

  // Cada crédito entra al cálculo de costo con su PROPIO medio de referencia (con qué
  // se compró el voucher / con qué se tasó el cambio que generó la nota), exactamente
  // como si el cajero lo hubiera tipeado a mano en "Dividir el pago".
  const creditosActivos: CreditoAplicado[] = [];
  if (usarVoucher && voucherInfo) {
    const monto = Math.max(0, Math.min(Number(montoVoucherInput) || 0, voucherInfo.saldo));
    if (monto > 0) {
      creditosActivos.push({ monto, refMedio: voucherInfo.medioPago, medio: "Voucher", campo: "voucherId", refId: voucherInfo.id });
    }
  }
  if (usarNotaCredito && notaCreditoDetectada) {
    const monto = Math.max(0, Math.min(Number(montoNotaCreditoInput) || 0, notaCreditoDetectada.saldo));
    if (monto > 0) {
      creditosActivos.push({ monto, refMedio: notaCreditoDetectada.medioPago, medio: "Nota de crédito", campo: "notaCreditoId", refId: notaCreditoDetectada.id });
    }
  }

  const hayDivisionOCredito = dividido || creditosActivos.length > 0;
  const divisionCarrito = hayDivisionOCredito
    ? calcularDivisionCarrito(itemsValidos, pagosParciales, creditosActivos, medioResto, config, coeficientesPorMarca, props.promociones)
    : null;

  const porItemFinal: PorItem[] =
    divisionCarrito?.porItem ??
    itemsValidos.map((it) => {
      const cantidad = Number(it.cantidad) || 0;
      const promocion = props.promociones.find((p) => p.id === it.promocionId) ?? null;
      const factor = factorPromocion(promocion, cantidad);
      const coef = resolverCoeficientes(it.producto.marca, config, coeficientesPorMarca);
      const montoSinFactor = precioUnitario(it.producto.costo, it.medioPago, coef) * cantidad;
      return { id: it.id, total: montoSinFactor * factor, pagos: [{ medio: it.medioPago, monto: montoSinFactor }] };
    });

  const total = divisionCarrito ? divisionCarrito.total : porItemFinal.reduce((acc, it) => acc + it.total, 0);
  const montoResto = divisionCarrito?.montoResto ?? 0;

  useEffect(() => {
    const nombre = clienteNombre.trim();
    if (!nombre) {
      setNotaCreditoDetectada(null);
      setUsarNotaCredito(false);
      return;
    }
    const timer = setTimeout(async () => {
      const nota = await buscarNotaCreditoPorCliente(nombre);
      if (nota && nota.clienteNombre.toLowerCase() === nombre.toLowerCase()) {
        setNotaCreditoDetectada({ id: nota.id, saldo: nota.saldo, clienteNombre: nota.clienteNombre, medioPago: nota.medioPago });
      } else {
        setNotaCreditoDetectada(null);
        setUsarNotaCredito(false);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteNombre]);

  function buscarVoucher() {
    const codigo = voucherCodigoInput.trim();
    if (!codigo) return;
    setVoucherError(null);
    startVoucherTransition(async () => {
      const v = await buscarVoucherPorCodigo(codigo);
      if (!v) {
        setVoucherInfo(null);
        setVoucherError("No se encontró un voucher con ese código");
        return;
      }
      if (v.saldo <= 0) {
        setVoucherInfo(null);
        setVoucherError(`El voucher ${v.codigo} ya no tiene saldo`);
        return;
      }
      setVoucherInfo({ id: v.id, codigo: v.codigo, saldo: v.saldo, medioPago: v.medioPago });
      setMontoVoucherInput(String(v.saldo));
      setDividido(true);
    });
  }

  function quitarVoucher() {
    setUsarVoucher(false);
    setVoucherCodigoInput("");
    setVoucherInfo(null);
    setMontoVoucherInput("");
    setVoucherError(null);
  }

  function aplicarNotaCredito() {
    if (!notaCreditoDetectada) return;
    setUsarNotaCredito(true);
    setMontoNotaCreditoInput(String(notaCreditoDetectada.saldo));
    setDividido(true);
  }

  function quitarNotaCredito() {
    setUsarNotaCredito(false);
    setMontoNotaCreditoInput("");
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
    if (usarVoucher && !voucherInfo) {
      setError("Buscá un voucher válido o desmarcá 'Usar un voucher'");
      return;
    }
    if (usarNotaCredito && !notaCreditoDetectada) {
      setError("No hay una nota de crédito para aplicar");
      return;
    }

    const carritoItems: ItemCarrito[] = itemsValidos.map((it) => {
      const cantidadNum = Number(it.cantidad) || 0;
      const pagos = porItemFinal.find((p) => p.id === it.id)?.pagos;
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
      quitarVoucher();
      quitarNotaCredito();
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
        <input id="v-vendedor" value={vendedor} onChange={(e) => setVendedor(e.target.value)} list="vendedores-list" required />
        <datalist id="vendedores-list">
          {props.vendedoresNombres.map((n) => <option key={n} value={n} />)}
        </datalist>
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

      {creditosActivos.length > 0 && (
        <div className="field" style={{ marginTop: 16 }}>
          <label>Créditos aplicados</label>
          <div style={{ height: 36, display: "flex", alignItems: "center", fontSize: 18, color: "var(--leaf)" }} className="num">
            -{fmt(creditosActivos.reduce((acc, c) => acc + c.monto, 0))}
          </div>
        </div>
      )}

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

      {hayDivisionOCredito && (
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

      <div className="checkbox-row" style={{ flexBasis: "100%" }}>
        <input
          type="checkbox"
          id="v-usar-voucher"
          checked={usarVoucher}
          onChange={(e) => {
            setUsarVoucher(e.target.checked);
            if (!e.target.checked) quitarVoucher();
          }}
        />
        <label htmlFor="v-usar-voucher">Usar un voucher</label>
      </div>

      {usarVoucher && (
        <div style={{ flexBasis: "100%" }}>
          {!voucherInfo ? (
            <div className="pago-row">
              <input
                placeholder="Código de voucher"
                value={voucherCodigoInput}
                onChange={(e) => setVoucherCodigoInput(e.target.value)}
                style={{ width: 160 }}
              />
              <button type="button" className="btn ghost small" onClick={buscarVoucher} disabled={buscandoVoucher}>
                Buscar
              </button>
              {voucherError && <span style={{ color: "var(--danger)", fontSize: 13 }}>{voucherError}</span>}
            </div>
          ) : (
            <div className="pago-row">
              <span className="hint">
                Voucher <strong className="num">{voucherInfo.codigo}</strong> — saldo disponible: {fmt(voucherInfo.saldo)}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={voucherInfo.saldo}
                value={montoVoucherInput}
                onChange={(e) => setMontoVoucherInput(e.target.value)}
                style={{ width: 120 }}
              />
              <button type="button" className="btn ghost small" onClick={quitarVoucher}>
                Quitar voucher
              </button>
            </div>
          )}
        </div>
      )}

      {notaCreditoDetectada && !usarNotaCredito && (
        <div className="pago-row" style={{ flexBasis: "100%" }}>
          <span className="hint">
            {notaCreditoDetectada.clienteNombre} tiene una nota de crédito de {fmt(notaCreditoDetectada.saldo)}.
          </span>
          <button type="button" className="btn ghost small" onClick={aplicarNotaCredito}>
            Aplicar
          </button>
        </div>
      )}

      {usarNotaCredito && notaCreditoDetectada && (
        <div className="pago-row" style={{ flexBasis: "100%" }}>
          <span className="hint">
            Nota de crédito de {notaCreditoDetectada.clienteNombre} — saldo disponible: {fmt(notaCreditoDetectada.saldo)}
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            max={notaCreditoDetectada.saldo}
            value={montoNotaCreditoInput}
            onChange={(e) => setMontoNotaCreditoInput(e.target.value)}
            style={{ width: 120 }}
          />
          <button type="button" className="btn ghost small" onClick={quitarNotaCredito}>
            Quitar nota de crédito
          </button>
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
      {item.producto?.observaciones && (
        <div className="hint">Obs: {item.producto.observaciones}</div>
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
