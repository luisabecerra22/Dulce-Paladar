"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatoCOP } from "@/lib/formato";

const IVA_TASA = 0.19;
const ICA_TASA_DEFAULT = 0.00414; // 4.14‰ — tarifa mínima Barranquilla

type PedidoImp = {
  id: string;
  numero: number;
  total: number;
  estado: string;
  creado_en: string;
  medio_pago: string | null;
};

type GastoImp = {
  id: string;
  categoria: string;
  descripcion: string | null;
  monto: number;
  fecha: string;
};

type Periodo = {
  label: string;
  desde: string;
  hasta: string;
};

function calcularIVA(totalConIva: number) {
  const base = totalConIva / (1 + IVA_TASA);
  const iva = totalConIva - base;
  return { base, iva };
}

function periodos(): Periodo[] {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth();

  const mesActual = new Date(año, mes, 1).toISOString().slice(0, 10);
  const mesActualFin = new Date(año, mes + 1, 0).toISOString().slice(0, 10);

  const mesAnterior = new Date(año, mes - 1, 1).toISOString().slice(0, 10);
  const mesAnteriorFin = new Date(año, mes, 0).toISOString().slice(0, 10);

  // Bimestres (Colombia bimestral)
  const bimActualInicio = Math.floor(mes / 2) * 2;
  const bimDesde = new Date(año, bimActualInicio, 1).toISOString().slice(0, 10);
  const bimHasta = new Date(año, bimActualInicio + 2, 0).toISOString().slice(0, 10);

  const bimAntInicio = bimActualInicio - 2;
  const bimAntDesde = new Date(año, bimAntInicio, 1).toISOString().slice(0, 10);
  const bimAntHasta = new Date(año, bimAntInicio + 2, 0).toISOString().slice(0, 10);

  const añoDesde = `${año}-01-01`;
  const añoHasta = `${año}-12-31`;

  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return [
    { label: `Mes actual (${meses[mes]} ${año})`, desde: mesActual, hasta: mesActualFin },
    { label: `Mes anterior (${meses[mes - 1 < 0 ? 11 : mes - 1]} ${mes === 0 ? año - 1 : año})`, desde: mesAnterior, hasta: mesAnteriorFin },
    { label: `Bimestre actual (${meses[bimActualInicio]}-${meses[bimActualInicio + 1]} ${año})`, desde: bimDesde, hasta: bimHasta },
    { label: `Bimestre anterior`, desde: bimAntDesde, hasta: bimAntHasta },
    { label: `Año ${año}`, desde: añoDesde, hasta: añoHasta },
  ];
}

export default function Impuestos() {
  const supabase = createClient();
  const listaPeridos = periodos();
  const [periodoIdx, setPeriodoIdx] = useState(0);
  const [pedidos, setPedidos] = useState<PedidoImp[]>([]);
  const [gastos, setGastos] = useState<GastoImp[]>([]);
  const [cargando, setCargando] = useState(false);
  const [icaTasa, setIcaTasa] = useState(ICA_TASA_DEFAULT);
  const [editandoIca, setEditandoIca] = useState(false);
  const [icaInput, setIcaInput] = useState("4.14");

  const periodo = listaPeridos[periodoIdx];

  const cargar = useCallback(async () => {
    setCargando(true);
    const [{ data: p }, { data: g }] = await Promise.all([
      supabase
        .from("pedidos")
        .select("id, numero, total, estado, creado_en, medio_pago")
        .neq("estado", "cancelado")
        .gte("creado_en", periodo.desde + "T00:00:00")
        .lte("creado_en", periodo.hasta + "T23:59:59")
        .order("creado_en", { ascending: false }),
      supabase
        .from("gastos")
        .select("id, categoria, descripcion, monto, fecha")
        .gte("fecha", periodo.desde)
        .lte("fecha", periodo.hasta)
        .order("fecha", { ascending: false }),
    ]);
    setPedidos((p || []) as PedidoImp[]);
    setGastos((g || []) as GastoImp[]);
    setCargando(false);
  }, [periodo.desde, periodo.hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  // Cálculos IVA ventas
  const totalVentas = pedidos.reduce((s, p) => s + p.total, 0);
  const { base: baseVentas, iva: ivaVentas } = calcularIVA(totalVentas);

  // IVA en compras — solo gastos de "Materia prima" (llevan IVA)
  const gastosMp = gastos.filter((g) => g.categoria === "Materia prima");
  const totalMp = gastosMp.reduce((s, g) => s + g.monto, 0);
  const { base: baseMp, iva: ivaDescontable } = calcularIVA(totalMp);

  // IVA neto a pagar
  const ivaAPagar = Math.max(0, ivaVentas - ivaDescontable);
  const ivaAFavor = ivaDescontable > ivaVentas ? ivaDescontable - ivaVentas : 0;

  // ICA
  const icaBase = baseVentas;
  const icaValor = icaBase * icaTasa;

  // Ventas por día para tabla
  const ventasPorDia = pedidos.reduce<Record<string, { total: number; cantidad: number }>>((acc, p) => {
    const dia = p.creado_en.slice(0, 10);
    if (!acc[dia]) acc[dia] = { total: 0, cantidad: 0 };
    acc[dia].total += p.total;
    acc[dia].cantidad += 1;
    return acc;
  }, {});

  async function exportarPDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    const morado: [number, number, number] = [194, 100, 250];
    const oscuro: [number, number, number] = [45, 27, 78];

    doc.setFillColor(...morado);
    doc.rect(0, 0, 210, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Dulce Paladar — Resumen Tributario", 14, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${periodo.label}`, 14, 22);
    doc.text(`Generado: ${new Date().toLocaleDateString("es-CO")}`, 14, 28);

    doc.setTextColor(...oscuro);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen IVA (19%)", 14, 44);

    autoTable(doc, {
      startY: 48,
      head: [["Concepto", "Valor"]],
      body: [
        ["Total ventas (con IVA)", formatoCOP(totalVentas)],
        ["Base gravable ventas", formatoCOP(baseVentas)],
        ["IVA generado en ventas", formatoCOP(ivaVentas)],
        ["", ""],
        ["Total compras materia prima (con IVA)", formatoCOP(totalMp)],
        ["Base gravable compras", formatoCOP(baseMp)],
        ["IVA descontable en compras", formatoCOP(ivaDescontable)],
        ["", ""],
        [ivaAFavor > 0 ? "IVA a favor" : "IVA a pagar (neto)", formatoCOP(ivaAFavor > 0 ? ivaAFavor : ivaAPagar)],
      ],
      headStyles: { fillColor: morado, textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: "right" } },
      styles: { fontSize: 9 },
    });

    const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("ICA (Industria y Comercio)", 14, y2);

    autoTable(doc, {
      startY: y2 + 4,
      head: [["Concepto", "Valor"]],
      body: [
        ["Base ICA (ventas sin IVA)", formatoCOP(icaBase)],
        [`Tarifa ICA (${(icaTasa * 1000).toFixed(2)}‰)`, `${(icaTasa * 1000).toFixed(2)} por mil`],
        ["ICA estimado", formatoCOP(icaValor)],
      ],
      headStyles: { fillColor: morado, textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: "right" } },
      styles: { fontSize: 9 },
    });

    const y3 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Ventas por día", 14, y3);

    autoTable(doc, {
      startY: y3 + 4,
      head: [["Fecha", "Pedidos", "Total ventas", "Base gravable", "IVA"]],
      body: Object.entries(ventasPorDia)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dia, v]) => {
          const { base, iva } = calcularIVA(v.total);
          return [
            new Date(dia + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
            v.cantidad,
            formatoCOP(v.total),
            formatoCOP(base),
            formatoCOP(iva),
          ];
        }),
      headStyles: { fillColor: morado, textColor: [255, 255, 255] },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      styles: { fontSize: 8 },
    });

    doc.save(`impuestos-${periodo.desde}-${periodo.hasta}.pdf`);
  }

  const tarjeta = (titulo: string, valor: number, sub?: string, color?: string) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">{titulo}</p>
      <p className={`text-xl font-bold ${color || "text-gray-900"}`}>{formatoCOP(valor)}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-600">Período:</span>
        <div className="flex gap-1 flex-wrap">
          {listaPeridos.map((p, i) => (
            <button
              key={i}
              onClick={() => setPeriodoIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                periodoIdx === i
                  ? "bg-primario text-white border-primario shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primario hover:text-primario"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={exportarPDF}
          className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg border border-primario text-primario text-sm font-medium hover:bg-primario hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar PDF para contador
        </button>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="w-6 h-6 animate-spin mr-2 text-primario" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Calculando...
        </div>
      ) : (
        <>
          {/* Sección IVA */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">IVA — Impuesto al Valor Agregado (19%)</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {tarjeta("Total ventas (con IVA)", totalVentas, `${pedidos.length} pedidos`)}
              {tarjeta("Base gravable ventas", baseVentas, "= Total ÷ 1.19", "text-gray-700")}
              {tarjeta("IVA generado", ivaVentas, "En ventas del período", "text-primario")}
              {tarjeta("Compras materia prima", totalMp, "Con IVA incluido")}
              {tarjeta("IVA descontable", ivaDescontable, "IVA pagado a proveedores", "text-blue-600")}
              {ivaAFavor > 0
                ? tarjeta("IVA a favor", ivaAFavor, "Saldo a recuperar", "text-emerald-600")
                : tarjeta("IVA a pagar", ivaAPagar, "IVA generado − descontable", "text-red-600")}
            </div>

            {/* Fórmula visual */}
            <div className="mt-3 bg-primario/5 border border-primario/20 rounded-xl p-4 flex items-center gap-3 flex-wrap text-sm">
              <span className="font-semibold text-primario">{formatoCOP(ivaVentas)}</span>
              <span className="text-gray-400">(IVA ventas)</span>
              <span className="text-gray-500">−</span>
              <span className="font-semibold text-blue-600">{formatoCOP(ivaDescontable)}</span>
              <span className="text-gray-400">(IVA compras)</span>
              <span className="text-gray-500">=</span>
              <span className={`font-bold text-lg ${ivaAFavor > 0 ? "text-emerald-600" : "text-red-600"}`}>
                {ivaAFavor > 0 ? `${formatoCOP(ivaAFavor)} a favor` : `${formatoCOP(ivaAPagar)} a pagar`}
              </span>
            </div>
          </div>

          {/* Sección ICA */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">ICA — Industria y Comercio</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tarjeta("Base ICA (ventas sin IVA)", icaBase, "Total ventas ÷ 1.19")}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Tarifa ICA</p>
                {editandoIca ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step="0.01"
                      value={icaInput}
                      onChange={(e) => setIcaInput(e.target.value)}
                      className="w-20 px-2 py-1 border border-primario rounded-lg text-sm font-bold text-gray-900 focus:outline-none"
                    />
                    <span className="text-sm text-gray-500">‰</span>
                    <button
                      onClick={() => { setIcaTasa(parseFloat(icaInput) / 1000); setEditandoIca(false); }}
                      className="px-2 py-1 bg-primario text-white rounded-lg text-xs font-medium"
                    >OK</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold text-gray-900">{(icaTasa * 1000).toFixed(2)}‰</span>
                    <button onClick={() => { setIcaInput((icaTasa * 1000).toFixed(2)); setEditandoIca(true); }} className="text-xs text-primario underline">
                      Cambiar
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">Tarifa municipal (por mil)</p>
              </div>
              {tarjeta("ICA estimado", icaValor, "Base × tarifa", "text-amber-600")}
            </div>
          </div>

          {/* Tabla ventas por día */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">Ventas del período por día</span>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">{pedidos.length} pedidos</span>
            </div>
            {Object.keys(ventasPorDia).length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
                <p className="text-3xl mb-2">📊</p>
                <p>No hay ventas registradas en este período</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600">Pedidos</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Total (con IVA)</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">Base gravable</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600">IVA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(ventasPorDia)
                        .sort((a, b) => b[0].localeCompare(a[0]))
                        .map(([dia, v]) => {
                          const { base, iva } = calcularIVA(v.total);
                          return (
                            <tr key={dia} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {new Date(dia + "T12:00:00").toLocaleDateString("es-CO", {
                                  weekday: "short", day: "numeric", month: "short",
                                })}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-500">{v.cantidad}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatoCOP(v.total)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{formatoCOP(base)}</td>
                              <td className="px-4 py-3 text-right text-primario font-medium">{formatoCOP(iva)}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot className="bg-primario/5 border-t-2 border-primario/20">
                      <tr>
                        <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900">{pedidos.length}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatoCOP(totalVentas)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-700">{formatoCOP(baseVentas)}</td>
                        <td className="px-4 py-3 text-right font-bold text-primario">{formatoCOP(ivaVentas)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Nota */}
          <p className="text-xs text-gray-400 pb-4">
            * IVA calculado descontando el 19% del precio de venta (precio incluye IVA). Los gastos de "Materia prima" se toman como compras con IVA descontable. Confirma las tarifas de ICA con tu contador según el municipio.
          </p>
        </>
      )}
    </div>
  );
}
