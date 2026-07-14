"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatoCOP } from "@/lib/formato";

type CuadreCaja = {
  id: string;
  numero: number;
  nombre_caja: string;
  responsable_nombre: string;
  estado: "abierto" | "cerrado";
  monto_inicial: number;
  monto_final_declarado: number | null;
  total_ventas: number;
  total_efectivo: number;
  total_transferencias: number;
  total_gastos: number;
  efectivo_esperado: number | null;
  diferencia: number | null;
  observaciones: string | null;
  abierto_en: string;
  cerrado_en: string | null;
};

type ResumenTurno = {
  total_ventas: number;
  total_efectivo: number;
  total_transferencias: number;
  total_gastos: number;
  pedidos_count: number;
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuracion(desde: string, hasta: string | null) {
  const inicio = new Date(desde);
  const fin = hasta ? new Date(hasta) : new Date();
  const mins = Math.floor((fin.getTime() - inicio.getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function CuadresCaja() {
  const supabase = createClient();

  const [cuadres, setCuadres] = useState<CuadreCaja[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Filtros
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Modales
  const [modalAbrir, setModalAbrir] = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [cuadreVer, setCuadreVer] = useState<CuadreCaja | null>(null);

  // Formularios
  const [formAbrir, setFormAbrir] = useState({ responsable_nombre: "", monto_inicial: 0 });
  const [formCerrar, setFormCerrar] = useState({ monto_final_declarado: 0, observaciones: "" });
  const [resumenTurno, setResumenTurno] = useState<ResumenTurno | null>(null);

  const cuadreActivo = cuadres.find((c) => c.estado === "abierto") ?? null;

  const cargarCuadres = useCallback(async () => {
    setCargando(true);
    const { data } = await supabase
      .from("cuadres_caja")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCuadres(data as CuadreCaja[]);
    setCargando(false);
  }, [supabase]);

  useEffect(() => {
    cargarCuadres();
  }, [cargarCuadres]);

  const cuadresFiltrados = cuadres.filter((c) => {
    if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false;
    if (filtroDesde && c.abierto_en < filtroDesde) return false;
    if (filtroHasta && c.abierto_en > filtroHasta + "T23:59:59") return false;
    return true;
  });

  async function abrirCaja() {
    if (!formAbrir.responsable_nombre.trim()) {
      setError("El responsable es obligatorio");
      return;
    }
    if (cuadreActivo) {
      setError("Ya hay una caja abierta. Debes cerrarla primero.");
      return;
    }
    setGuardando(true);
    setError("");
    const { error: err } = await supabase.from("cuadres_caja").insert({
      nombre_caja: "Caja Principal",
      responsable_nombre: formAbrir.responsable_nombre.trim(),
      monto_inicial: formAbrir.monto_inicial,
      estado: "abierto",
      abierto_en: new Date().toISOString(),
    });
    if (err) {
      setError("Error: " + err.message);
      setGuardando(false);
      return;
    }
    setGuardando(false);
    setModalAbrir(false);
    await cargarCuadres();
  }

  async function cargarResumenTurno(cuadre: CuadreCaja) {
    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("total, medio_pago, estado")
      .gte("creado_en", cuadre.abierto_en)
      .neq("estado", "cancelado");

    const lista = pedidos ?? [];
    const total_ventas = lista.reduce((s, p) => s + (p.total ?? 0), 0);
    const total_efectivo = lista
      .filter((p) => p.medio_pago === "efectivo")
      .reduce((s, p) => s + (p.total ?? 0), 0);
    const total_transferencias = lista
      .filter((p) => p.medio_pago !== "efectivo")
      .reduce((s, p) => s + (p.total ?? 0), 0);

    const fechaApertura = cuadre.abierto_en.substring(0, 10);
    const hoy = new Date().toISOString().substring(0, 10);
    const { data: gastos } = await supabase
      .from("gastos")
      .select("monto")
      .gte("fecha", fechaApertura)
      .lte("fecha", hoy);

    const total_gastos = (gastos ?? []).reduce((s, g) => s + (g.monto ?? 0), 0);

    setResumenTurno({
      total_ventas,
      total_efectivo,
      total_transferencias,
      total_gastos,
      pedidos_count: lista.length,
    });
  }

  async function cerrarCaja() {
    if (!cuadreActivo || !resumenTurno) return;
    setGuardando(true);
    setError("");

    const efectivo_esperado =
      cuadreActivo.monto_inicial + resumenTurno.total_efectivo - resumenTurno.total_gastos;
    const diferencia = formCerrar.monto_final_declarado - efectivo_esperado;

    const { error: err } = await supabase
      .from("cuadres_caja")
      .update({
        estado: "cerrado",
        cerrado_en: new Date().toISOString(),
        monto_final_declarado: formCerrar.monto_final_declarado,
        total_ventas: resumenTurno.total_ventas,
        total_efectivo: resumenTurno.total_efectivo,
        total_transferencias: resumenTurno.total_transferencias,
        total_gastos: resumenTurno.total_gastos,
        efectivo_esperado,
        diferencia,
        observaciones: formCerrar.observaciones.trim() || null,
      })
      .eq("id", cuadreActivo.id);

    if (err) {
      setError("Error: " + err.message);
      setGuardando(false);
      return;
    }
    setGuardando(false);
    setModalCerrar(false);
    await cargarCuadres();
  }

  async function exportarPDF(cuadre: CuadreCaja) {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    doc.setFillColor(194, 100, 250);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Dulce Paladar", 14, 14);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Cuadre de Caja #${cuadre.numero} — ${cuadre.nombre_caja}`, 14, 26);

    doc.setTextColor(0, 0, 0);

    autoTable(doc as typeof doc & { lastAutoTable: { finalY: number } }, {
      startY: 45,
      head: [["Detalle", "Valor"]],
      body: [
        ["Responsable", cuadre.responsable_nombre],
        ["Apertura", formatFecha(cuadre.abierto_en)],
        cuadre.cerrado_en
          ? ["Cierre", formatFecha(cuadre.cerrado_en)]
          : ["Estado", "ABIERTA"],
        ["Duración", formatDuracion(cuadre.abierto_en, cuadre.cerrado_en)],
        ["", ""],
        ["Monto inicial", formatoCOP(cuadre.monto_inicial)],
        ["Ventas totales", formatoCOP(cuadre.total_ventas)],
        ["  ↳ Efectivo ventas", formatoCOP(cuadre.total_efectivo)],
        ["  ↳ Transferencias", formatoCOP(cuadre.total_transferencias)],
        ["Gastos del turno", formatoCOP(cuadre.total_gastos)],
        ...(cuadre.efectivo_esperado !== null
          ? [["Efectivo esperado en caja", formatoCOP(cuadre.efectivo_esperado)]]
          : []),
        ...(cuadre.monto_final_declarado !== null
          ? [["Efectivo declarado", formatoCOP(cuadre.monto_final_declarado)]]
          : []),
        ...(cuadre.diferencia !== null
          ? [
              [
                "Diferencia",
                `${cuadre.diferencia >= 0 ? "+" : ""}${formatoCOP(cuadre.diferencia)} ${cuadre.diferencia >= 0 ? "(sobrante)" : "(faltante)"}`,
              ],
            ]
          : []),
        ...(cuadre.observaciones ? [["Observaciones", cuadre.observaciones]] : []),
      ],
      theme: "striped",
      headStyles: { fillColor: [194, 100, 250] },
      columnStyles: { 1: { halign: "right" } },
    });

    doc.save(`cuadre-caja-${cuadre.numero}.pdf`);
  }

  const efectivoEsperadoPreview =
    cuadreActivo && resumenTurno
      ? cuadreActivo.monto_inicial + resumenTurno.total_efectivo - resumenTurno.total_gastos
      : null;

  const diferenciaPreview =
    efectivoEsperadoPreview !== null && formCerrar.monto_final_declarado > 0
      ? formCerrar.monto_final_declarado - efectivoEsperadoPreview
      : null;

  return (
    <div>
      {/* Barra superior: filtros + acción principal */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario"
          />
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario"
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario"
          >
            <option value="todos">Todos los estados</option>
            <option value="abierto">Abiertos</option>
            <option value="cerrado">Cerrados</option>
          </select>
          {(filtroDesde || filtroHasta || filtroEstado !== "todos") && (
            <button
              onClick={() => {
                setFiltroDesde("");
                setFiltroHasta("");
                setFiltroEstado("todos");
              }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        {cuadreActivo ? (
          <button
            onClick={async () => {
              setFormCerrar({ monto_final_declarado: 0, observaciones: "" });
              setResumenTurno(null);
              setError("");
              setModalCerrar(true);
              await cargarResumenTurno(cuadreActivo);
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors text-sm"
          >
            Cerrar caja
          </button>
        ) : (
          <button
            onClick={() => {
              setFormAbrir({ responsable_nombre: "", monto_inicial: 0 });
              setError("");
              setModalAbrir(true);
            }}
            className="px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
          >
            + Abrir caja
          </button>
        )}
      </div>

      {/* Banner caja activa */}
      {cuadreActivo && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800">
                  {cuadreActivo.nombre_caja} — Turno abierto
                </p>
                <p className="text-sm text-green-600">
                  Responsable: <strong>{cuadreActivo.responsable_nombre}</strong> ·{" "}
                  Abierta hace {formatDuracion(cuadreActivo.abierto_en, null)} ·{" "}
                  Monto inicial: {formatoCOP(cuadreActivo.monto_inicial)}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
              ABIERTA
            </span>
          </div>
        </div>
      )}

      {/* Tabla de cuadres */}
      {cargando ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">Cargando cuadres...</p>
        </div>
      ) : cuadresFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">No hay cuadres de caja</p>
          <p className="text-gray-400 text-sm">Abre la caja para registrar el inicio del turno</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Responsable</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Apertura</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cierre</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">M. Inicial</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Ventas</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Gastos</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Diferencia</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cuadresFiltrados.map((cuadre) => (
                  <tr key={cuadre.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">#{cuadre.numero}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{cuadre.responsable_nombre}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatFecha(cuadre.abierto_en)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {cuadre.cerrado_en ? formatFecha(cuadre.cerrado_en) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatoCOP(cuadre.monto_inicial)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primario">
                      {formatoCOP(cuadre.total_ventas)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500">
                      {formatoCOP(cuadre.total_gastos)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {cuadre.diferencia !== null ? (
                        <span
                          className={`font-semibold ${
                            cuadre.diferencia >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {cuadre.diferencia >= 0 ? "+" : ""}
                          {formatoCOP(cuadre.diferencia)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          cuadre.estado === "abierto"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {cuadre.estado === "abierto" ? "Abierta" : "Cerrada"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setCuadreVer(cuadre)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          Ver
                        </button>
                        {cuadre.estado === "cerrado" && (
                          <button
                            onClick={() => exportarPDF(cuadre)}
                            className="px-2 py-1 text-xs bg-primario/10 text-primario rounded hover:bg-primario/20 transition-colors"
                          >
                            PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal: Abrir caja ──────────────────────────────────── */}
      {modalAbrir && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Abrir caja</h3>
            <p className="text-sm text-gray-500 mb-5">Inicia un nuevo turno de caja</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de caja</label>
                <input
                  value="Caja Principal"
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsable del turno *
                </label>
                <input
                  type="text"
                  value={formAbrir.responsable_nombre}
                  onChange={(e) =>
                    setFormAbrir({ ...formAbrir, responsable_nombre: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="Ej: María González"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto inicial en caja (efectivo)
                </label>
                <input
                  type="number"
                  value={formAbrir.monto_inicial || ""}
                  onChange={(e) =>
                    setFormAbrir({ ...formAbrir, monto_inicial: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="0"
                  min="0"
                />
                {formAbrir.monto_inicial > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{formatoCOP(formAbrir.monto_inicial)}</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={abrirCaja}
                  disabled={guardando}
                  className="flex-1 py-2.5 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors disabled:opacity-50"
                >
                  {guardando ? "Abriendo..." : "Abrir caja"}
                </button>
                <button
                  onClick={() => setModalAbrir(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cerrar caja ─────────────────────────────────── */}
      {modalCerrar && cuadreActivo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Cerrar caja</h3>
            <p className="text-sm text-gray-500 mb-5">
              {cuadreActivo.nombre_caja} ·{" "}
              Turno de {formatDuracion(cuadreActivo.abierto_en, null)}
            </p>

            {/* Resumen del turno */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Resumen del turno
              </p>
              {resumenTurno ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Ventas totales</p>
                      <p className="font-bold text-primario text-base">
                        {formatoCOP(resumenTurno.total_ventas)}
                      </p>
                      <p className="text-xs text-gray-400">{resumenTurno.pedidos_count} pedidos</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Gastos del día</p>
                      <p className="font-bold text-red-500 text-base">
                        {formatoCOP(resumenTurno.total_gastos)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Efectivo recibido</p>
                      <p className="font-semibold text-green-600">
                        {formatoCOP(resumenTurno.total_efectivo)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Transferencias</p>
                      <p className="font-semibold text-blue-600">
                        {formatoCOP(resumenTurno.total_transferencias)}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3 mt-1 flex justify-between text-sm">
                    <div>
                      <p className="text-gray-600 font-medium">Efectivo esperado en caja</p>
                      <p className="text-xs text-gray-400">
                        Inicial {formatoCOP(cuadreActivo.monto_inicial)} + efectivo −{" "}
                        gastos
                      </p>
                    </div>
                    <p className="font-bold text-gray-900 text-base">
                      {efectivoEsperadoPreview !== null
                        ? formatoCOP(efectivoEsperadoPreview)
                        : "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">
                  Calculando resumen del turno...
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Efectivo contado físicamente *
                </label>
                <input
                  type="number"
                  value={formCerrar.monto_final_declarado || ""}
                  onChange={(e) =>
                    setFormCerrar({
                      ...formCerrar,
                      monto_final_declarado: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="0"
                  min="0"
                  autoFocus
                />
                {formCerrar.monto_final_declarado > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatoCOP(formCerrar.monto_final_declarado)}
                  </p>
                )}
              </div>

              {diferenciaPreview !== null && (
                <div
                  className={`p-3 rounded-lg text-sm font-medium ${
                    diferenciaPreview >= 0
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  Diferencia:{" "}
                  {diferenciaPreview >= 0 ? "+" : ""}
                  {formatoCOP(diferenciaPreview)}{" "}
                  {diferenciaPreview >= 0 ? "✓ sobrante" : "⚠️ faltante"}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formCerrar.observaciones}
                  onChange={(e) =>
                    setFormCerrar({ ...formCerrar, observaciones: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario resize-none"
                  rows={2}
                  placeholder="Notas del turno (opcional)"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={cerrarCaja}
                  disabled={guardando || !resumenTurno}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {guardando ? "Cerrando..." : "Cerrar caja"}
                </button>
                <button
                  onClick={() => setModalCerrar(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Ver cuadre ──────────────────────────────────── */}
      {cuadreVer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Cuadre #{cuadreVer.numero}
                </h3>
                <p className="text-sm text-gray-500">{cuadreVer.nombre_caja}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  cuadreVer.estado === "abierto"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {cuadreVer.estado === "abierto" ? "ABIERTA" : "CERRADA"}
              </span>
            </div>

            {/* Info básica */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Responsable</p>
                <p className="font-semibold text-gray-900">{cuadreVer.responsable_nombre}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Duración</p>
                <p className="font-semibold text-gray-900">
                  {formatDuracion(cuadreVer.abierto_en, cuadreVer.cerrado_en)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Apertura</p>
                <p className="font-semibold text-gray-900 text-xs">
                  {formatFecha(cuadreVer.abierto_en)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Cierre</p>
                <p className="font-semibold text-gray-900 text-xs">
                  {cuadreVer.cerrado_en ? formatFecha(cuadreVer.cerrado_en) : "—"}
                </p>
              </div>
            </div>

            {/* Movimientos */}
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
              <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Movimientos del turno
              </div>
              {[
                {
                  label: "Monto inicial",
                  value: cuadreVer.monto_inicial,
                  color: "text-gray-700",
                },
                {
                  label: "Ventas totales",
                  value: cuadreVer.total_ventas,
                  color: "text-primario font-bold",
                },
                {
                  label: "↳ Efectivo",
                  value: cuadreVer.total_efectivo,
                  color: "text-green-600",
                  sub: true,
                },
                {
                  label: "↳ Transferencias",
                  value: cuadreVer.total_transferencias,
                  color: "text-blue-600",
                  sub: true,
                },
                {
                  label: "Gastos del turno",
                  value: cuadreVer.total_gastos,
                  color: "text-red-500",
                },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`flex justify-between px-4 py-2.5 text-sm border-t border-gray-100 ${
                    row.sub ? "pl-8 bg-gray-50/50" : ""
                  }`}
                >
                  <span className="text-gray-600">{row.label}</span>
                  <span className={row.color}>{formatoCOP(row.value)}</span>
                </div>
              ))}
            </div>

            {/* Cierre */}
            {cuadreVer.efectivo_esperado !== null && (
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Cierre de caja
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-600">Efectivo esperado</span>
                    <span className="font-semibold text-gray-900">
                      {formatoCOP(cuadreVer.efectivo_esperado)}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-600">Efectivo declarado</span>
                    <span className="font-semibold text-gray-900">
                      {formatoCOP(cuadreVer.monto_final_declarado ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between px-4 py-3 bg-gray-50">
                    <span className="font-semibold text-gray-700 text-sm">Diferencia</span>
                    <span
                      className={`font-bold text-base ${
                        (cuadreVer.diferencia ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {(cuadreVer.diferencia ?? 0) >= 0 ? "+" : ""}
                      {formatoCOP(cuadreVer.diferencia ?? 0)}{" "}
                      <span className="text-xs font-normal">
                        {(cuadreVer.diferencia ?? 0) >= 0 ? "(sobrante)" : "(faltante)"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {cuadreVer.observaciones && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4 text-sm text-amber-700">
                <span className="font-semibold">Observaciones: </span>
                {cuadreVer.observaciones}
              </div>
            )}

            <div className="flex gap-2">
              {cuadreVer.estado === "cerrado" && (
                <button
                  onClick={() => exportarPDF(cuadreVer)}
                  className="flex-1 py-2.5 bg-primario/10 text-primario rounded-lg font-semibold hover:bg-primario/20 transition-colors"
                >
                  Exportar PDF
                </button>
              )}
              <button
                onClick={() => setCuadreVer(null)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
