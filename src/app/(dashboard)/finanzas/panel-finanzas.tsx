"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { formatoCOP } from "@/lib/formato";

type PedidoResumen = { total: number; medio_pago?: string | null; estado: string; creado_en?: string };
type Gasto = {
  id: string;
  categoria: string;
  descripcion: string | null;
  monto: number;
  fecha: string;
  recurrente: boolean;
};
type CuentaPagar = {
  id: string;
  acreedor: string;
  concepto: string | null;
  monto: number;
  fecha_vencimiento: string;
  estado: string;
  tipo: string;
};

const CATEGORIAS_GASTO = [
  "Arriendo",
  "Servicios públicos",
  "Salarios",
  "Materia prima",
  "Transporte",
  "Publicidad",
  "Mantenimiento",
  "Otro",
];

export default function PanelFinanzas({
  pedidosHoy,
  pedidosMes,
  gastosIniciales,
  cuentasIniciales,
  fechaHoy,
}: {
  pedidosHoy: PedidoResumen[];
  pedidosMes: PedidoResumen[];
  gastosIniciales: Gasto[];
  cuentasIniciales: CuentaPagar[];
  fechaHoy: string;
}) {
  const [tab, setTab] = useState<"resumen" | "gastos" | "cuentas">("resumen");
  const [gastos, setGastos] = useState(gastosIniciales);
  const [cuentas, setCuentas] = useState(cuentasIniciales);
  const [modalGasto, setModalGasto] = useState(false);
  const [modalCuenta, setModalCuenta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [formGasto, setFormGasto] = useState({
    categoria: "Materia prima",
    descripcion: "",
    monto: 0,
    fecha: fechaHoy,
    recurrente: false,
  });
  const [formCuenta, setFormCuenta] = useState({
    acreedor: "",
    concepto: "",
    monto: 0,
    fecha_vencimiento: fechaHoy,
    tipo: "proveedor" as "proveedor" | "gasto_fijo",
  });

  const router = useRouter();
  const supabase = createClient();

  // Cálculos del día
  const pedidosCompletados = pedidosHoy.filter((p) => p.estado !== "cancelado");
  const ventasHoy = pedidosCompletados.reduce((s, p) => s + p.total, 0);
  const efectivoHoy = pedidosCompletados
    .filter((p) => p.medio_pago === "efectivo")
    .reduce((s, p) => s + p.total, 0);
  const transferenciaHoy = pedidosCompletados
    .filter((p) => p.medio_pago === "transferencia")
    .reduce((s, p) => s + p.total, 0);
  const gastosHoyTotal = gastos
    .filter((g) => g.fecha === fechaHoy)
    .reduce((s, g) => s + g.monto, 0);

  // Cálculos del mes
  const ventasMes = pedidosMes.reduce((s, p) => s + p.total, 0);
  const gastosMes = gastos
    .filter((g) => g.fecha.startsWith(fechaHoy.substring(0, 7)))
    .reduce((s, g) => s + g.monto, 0);

  // Cuentas pendientes
  const cuentasPendientes = cuentas.filter((c) => c.estado === "pendiente");
  const totalPendiente = cuentasPendientes.reduce((s, c) => s + c.monto, 0);

  async function guardarGasto() {
    if (formGasto.monto <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    setGuardando(true);
    setError("");

    const { error: err } = await supabase.from("gastos").insert({
      categoria: formGasto.categoria,
      descripcion: formGasto.descripcion.trim() || null,
      monto: formGasto.monto,
      fecha: formGasto.fecha,
      recurrente: formGasto.recurrente,
    });

    if (err) {
      setError("Error: " + err.message);
      setGuardando(false);
      return;
    }

    const { data } = await supabase
      .from("gastos")
      .select("*")
      .order("fecha", { ascending: false });
    if (data) setGastos(data);

    setGuardando(false);
    setModalGasto(false);
    router.refresh();
  }

  async function guardarCuenta() {
    if (!formCuenta.acreedor.trim()) {
      setError("El acreedor es obligatorio");
      return;
    }
    if (formCuenta.monto <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    setGuardando(true);
    setError("");

    const { error: err } = await supabase.from("cuentas_pagar").insert({
      acreedor: formCuenta.acreedor.trim(),
      concepto: formCuenta.concepto.trim() || null,
      monto: formCuenta.monto,
      fecha_vencimiento: formCuenta.fecha_vencimiento,
      tipo: formCuenta.tipo,
    });

    if (err) {
      setError("Error: " + err.message);
      setGuardando(false);
      return;
    }

    const { data } = await supabase
      .from("cuentas_pagar")
      .select("*")
      .order("fecha_vencimiento");
    if (data) setCuentas(data);

    setGuardando(false);
    setModalCuenta(false);
    router.refresh();
  }

  async function marcarPagada(id: string) {
    await supabase
      .from("cuentas_pagar")
      .update({ estado: "pagada", pagada_en: new Date().toISOString() })
      .eq("id", id);

    const { data } = await supabase
      .from("cuentas_pagar")
      .select("*")
      .order("fecha_vencimiento");
    if (data) setCuentas(data);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900">
            Finanzas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date(fechaHoy + "T12:00:00").toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "resumen", label: "Resumen del día" },
          { key: "gastos", label: "Gastos" },
          { key: "cuentas", label: "Cuentas por pagar" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Resumen */}
      {tab === "resumen" && (
        <div className="space-y-6">
          {/* Tarjetas del día */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Ventas hoy</p>
              <p className="text-2xl font-bold text-primario">{formatoCOP(ventasHoy)}</p>
              <p className="text-xs text-gray-400 mt-1">{pedidosCompletados.length} pedidos</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Efectivo</p>
              <p className="text-2xl font-bold text-green-600">{formatoCOP(efectivoHoy)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Transferencias</p>
              <p className="text-2xl font-bold text-blue-600">{formatoCOP(transferenciaHoy)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">Gastos hoy</p>
              <p className="text-2xl font-bold text-red-500">{formatoCOP(gastosHoyTotal)}</p>
            </div>
          </div>

          {/* Resumen del mes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Resumen del mes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Ingresos</p>
                <p className="text-xl font-bold text-primario">{formatoCOP(ventasMes)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gastos</p>
                <p className="text-xl font-bold text-red-500">{formatoCOP(gastosMes)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Utilidad estimada</p>
                <p className={`text-xl font-bold ${ventasMes - gastosMes >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatoCOP(ventasMes - gastosMes)}
                </p>
              </div>
            </div>
          </div>

          {/* Cuentas pendientes */}
          {cuentasPendientes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-amber-700 mb-2">
                ⚠️ Cuentas pendientes: {formatoCOP(totalPendiente)}
              </h3>
              <div className="space-y-1">
                {cuentasPendientes.slice(0, 5).map((c) => (
                  <p key={c.id} className="text-sm text-amber-600">
                    <span className="font-semibold">{c.acreedor}</span>: {formatoCOP(c.monto)} — vence{" "}
                    {new Date(c.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Gastos */}
      {tab === "gastos" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setFormGasto({
                  categoria: "Materia prima",
                  descripcion: "",
                  monto: 0,
                  fecha: fechaHoy,
                  recurrente: false,
                });
                setError("");
                setModalGasto(true);
              }}
              className="px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
            >
              + Registrar gasto
            </button>
          </div>

          {gastos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400 text-lg mb-2">No hay gastos registrados</p>
              <p className="text-gray-400 text-sm">Registra tus gastos para ver la utilidad del negocio</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Categoría</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Descripción</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gastos.map((gasto) => (
                      <tr key={gasto.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(gasto.fecha + "T12:00:00").toLocaleDateString("es-CO", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">
                            {gasto.categoria}
                          </span>
                          {gasto.recurrente && (
                            <span className="ml-1 text-xs text-blue-500">🔄</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{gasto.descripcion || "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                          {formatoCOP(gasto.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Cuentas por pagar */}
      {tab === "cuentas" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setFormCuenta({
                  acreedor: "",
                  concepto: "",
                  monto: 0,
                  fecha_vencimiento: fechaHoy,
                  tipo: "proveedor",
                });
                setError("");
                setModalCuenta(true);
              }}
              className="px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
            >
              + Nueva cuenta
            </button>
          </div>

          {cuentas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400 text-lg mb-2">No hay cuentas por pagar</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Acreedor</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Concepto</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Monto</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Vencimiento</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-600">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cuentas.map((cuenta) => {
                      const vencida =
                        cuenta.estado === "pendiente" &&
                        cuenta.fecha_vencimiento < fechaHoy;
                      return (
                        <tr key={cuenta.id} className={`hover:bg-gray-50 ${vencida ? "bg-red-50/50" : ""}`}>
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {cuenta.acreedor}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{cuenta.concepto || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {formatoCOP(cuenta.monto)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={vencida ? "text-red-600 font-semibold" : "text-gray-500"}>
                              {new Date(cuenta.fecha_vencimiento + "T12:00:00").toLocaleDateString("es-CO", {
                                day: "numeric",
                                month: "short",
                              })}
                              {vencida && " ⚠️"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                cuenta.estado === "pagada"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {cuenta.estado === "pagada" ? "Pagada" : "Pendiente"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {cuenta.estado === "pendiente" && (
                              <button
                                onClick={() => marcarPagada(cuenta.id)}
                                className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                              >
                                Marcar pagada
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Registrar gasto */}
      {modalGasto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Registrar gasto</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={formGasto.categoria}
                  onChange={(e) => setFormGasto({ ...formGasto, categoria: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                >
                  {CATEGORIAS_GASTO.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  value={formGasto.descripcion}
                  onChange={(e) => setFormGasto({ ...formGasto, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="Ej: Pago de luz"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto (COP) *</label>
                  <input
                    type="number"
                    value={formGasto.monto || ""}
                    onChange={(e) => setFormGasto({ ...formGasto, monto: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formGasto.fecha}
                    onChange={(e) => setFormGasto({ ...formGasto, fecha: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formGasto.recurrente}
                  onChange={(e) => setFormGasto({ ...formGasto, recurrente: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primario focus:ring-primario"
                />
                <span className="text-sm text-gray-700">Gasto recurrente</span>
              </label>

              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={guardarGasto}
                  disabled={guardando}
                  className="flex-1 py-2.5 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Registrar gasto"}
                </button>
                <button
                  onClick={() => setModalGasto(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva cuenta por pagar */}
      {modalCuenta && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nueva cuenta por pagar</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acreedor *</label>
                <input
                  type="text"
                  value={formCuenta.acreedor}
                  onChange={(e) => setFormCuenta({ ...formCuenta, acreedor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="Ej: Proveedor XYZ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                <input
                  type="text"
                  value={formCuenta.concepto}
                  onChange={(e) => setFormCuenta({ ...formCuenta, concepto: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="Ej: Factura harina mayo"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto (COP) *</label>
                  <input
                    type="number"
                    value={formCuenta.monto || ""}
                    onChange={(e) => setFormCuenta({ ...formCuenta, monto: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento</label>
                  <input
                    type="date"
                    value={formCuenta.fecha_vencimiento}
                    onChange={(e) => setFormCuenta({ ...formCuenta, fecha_vencimiento: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex gap-2">
                  {[
                    { value: "proveedor", label: "Proveedor" },
                    { value: "gasto_fijo", label: "Gasto fijo" },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormCuenta({ ...formCuenta, tipo: t.value as typeof formCuenta.tipo })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formCuenta.tipo === t.value
                          ? "bg-primario/10 text-primario border border-primario"
                          : "bg-gray-50 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={guardarCuenta}
                  disabled={guardando}
                  className="flex-1 py-2.5 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Crear cuenta"}
                </button>
                <button
                  onClick={() => setModalCuenta(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
