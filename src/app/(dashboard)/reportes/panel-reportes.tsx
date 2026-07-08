"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { formatoCOP } from "@/lib/formato";

type ItemPedido = {
  cantidad: number;
  precio_unitario: number;
  productos: { nombre: string; categorias: { nombre: string } | null } | null;
};

type Pedido = {
  id: string;
  numero: number;
  total: number;
  estado: string;
  medio_pago: string;
  tipo: string;
  creado_en: string;
  pedido_items: ItemPedido[];
};

type Gasto = {
  monto: number;
  categoria: string;
  fecha: string;
};

type Rango = "7d" | "15d" | "30d";

const COLORES = ["#F400A1", "#C273E0", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

const MEDIO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  nequi: "Nequi",
  daviplata: "Daviplata",
};

function formatFecha(iso: string, modo: "dia" | "hora" = "dia"): string {
  const d = new Date(iso);
  if (modo === "hora") return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" });
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" });
}

function fechaLocal(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota" });
}

export default function PanelReportes({
  pedidosIniciales,
  gastosIniciales,
}: {
  pedidosIniciales: Pedido[];
  gastosIniciales: Gasto[];
}) {
  const [rango, setRango] = useState<Rango>("30d");
  const [tab, setTab] = useState<"ventas" | "productos" | "gastos">("ventas");

  const dias = rango === "7d" ? 7 : rango === "15d" ? 15 : 30;

  const pedidos = useMemo(() => {
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    return pedidosIniciales.filter((p) => new Date(p.creado_en) >= desde);
  }, [pedidosIniciales, dias]);

  const gastos = useMemo(() => {
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);
    return gastosIniciales.filter((g) => new Date(g.fecha) >= desde);
  }, [gastosIniciales, dias]);

  // KPIs
  const totalVentas = pedidos.reduce((s, p) => s + (p.total || 0), 0);
  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const utilidad = totalVentas - totalGastos;
  const ticketPromedio = pedidos.length ? totalVentas / pedidos.length : 0;

  // Ventas por día
  const ventasPorDia = useMemo(() => {
    const mapa: Record<string, number> = {};
    pedidos.forEach((p) => {
      const dia = fechaLocal(p.creado_en);
      mapa[dia] = (mapa[dia] || 0) + p.total;
    });
    return Object.entries(mapa)
      .map(([fecha, total]) => ({ fecha: formatFecha(new Date(fecha.split("/").reverse().join("-")).toISOString()), total }))
      .slice(-dias);
  }, [pedidos, dias]);

  // Por medio de pago
  const porMedioPago = useMemo(() => {
    const mapa: Record<string, number> = {};
    pedidos.forEach((p) => {
      const m = p.medio_pago || "otro";
      mapa[m] = (mapa[m] || 0) + p.total;
    });
    return Object.entries(mapa).map(([medio, total]) => ({
      medio: MEDIO_LABEL[medio] || medio,
      total,
      pct: totalVentas ? Math.round((total / totalVentas) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [pedidos, totalVentas]);

  // Productos más vendidos
  const topProductos = useMemo(() => {
    const mapa: Record<string, { nombre: string; cantidad: number; total: number }> = {};
    pedidos.forEach((p) => {
      p.pedido_items?.forEach((item) => {
        const nombre = item.productos?.nombre || "Sin nombre";
        if (!mapa[nombre]) mapa[nombre] = { nombre, cantidad: 0, total: 0 };
        mapa[nombre].cantidad += item.cantidad;
        mapa[nombre].total += item.cantidad * (item.precio_unitario || 0);
      });
    });
    return Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  }, [pedidos]);

  // Gastos por categoría
  const gastosPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    gastos.forEach((g) => {
      mapa[g.categoria] = (mapa[g.categoria] || 0) + g.monto;
    });
    return Object.entries(mapa)
      .map(([cat, monto]) => ({ cat, monto }))
      .sort((a, b) => b.monto - a.monto);
  }, [gastos]);

  // Export PDF
  async function exportarPDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const hoy = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota" });

    // Encabezado
    doc.setFillColor(244, 0, 161);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Dulce Paladar — Reporte de Ventas", 14, 13);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: últimos ${dias} días · Generado: ${hoy}`, 14, 22);

    // KPIs
    doc.setTextColor(50, 30, 10);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen", 14, 38);
    autoTable(doc, {
      startY: 42,
      head: [["Indicador", "Valor"]],
      body: [
        ["Total ventas", formatoCOP(totalVentas)],
        ["Total gastos", formatoCOP(totalGastos)],
        ["Utilidad estimada", formatoCOP(utilidad)],
        ["Pedidos entregados", String(pedidos.length)],
        ["Ticket promedio", formatoCOP(ticketPromedio)],
      ],
      headStyles: { fillColor: [244, 0, 161] },
      alternateRowStyles: { fillColor: [253, 246, 238] },
      styles: { fontSize: 10 },
    });

    // Ventas por día
    const afterKpis = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.text("Ventas por día", 14, afterKpis);
    autoTable(doc, {
      startY: afterKpis + 4,
      head: [["Fecha", "Total"]],
      body: ventasPorDia.map((v) => [v.fecha, formatoCOP(v.total)]),
      headStyles: { fillColor: [194, 115, 224] },
      styles: { fontSize: 9 },
    });

    // Productos más vendidos
    const afterVentas = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.text("Productos más vendidos", 14, afterVentas);
    autoTable(doc, {
      startY: afterVentas + 4,
      head: [["Producto", "Unidades", "Total"]],
      body: topProductos.map((p) => [p.nombre, String(p.cantidad), formatoCOP(p.total)]),
      headStyles: { fillColor: [244, 0, 161] },
      styles: { fontSize: 9 },
    });

    doc.save(`dulce-paladar-reporte-${dias}d-${hoy.replace(/\//g, "-")}.pdf`);
  }

  const tabs = [
    { id: "ventas", label: "Ventas" },
    { id: "productos", label: "Productos" },
    { id: "gastos", label: "Gastos" },
  ] as const;

  const rangos: { id: Rango; label: string }[] = [
    { id: "7d", label: "7 días" },
    { id: "15d", label: "15 días" },
    { id: "30d", label: "30 días" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-cafe-oscuro">
            Reportes
          </h1>
          <p className="text-sm text-cafe mt-1">Análisis de ventas, productos y gastos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Selector rango */}
          <div className="flex gap-1 bg-crema-oscuro/40 rounded-xl p-1">
            {rangos.map((r) => (
              <button
                key={r.id}
                onClick={() => setRango(r.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  rango === r.id
                    ? "bg-white text-cafe-oscuro shadow-sm"
                    : "text-cafe hover:text-cafe-oscuro"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportarPDF}
            className="flex items-center gap-2 px-4 py-2 bg-primario text-white rounded-xl text-sm font-semibold hover:bg-primario/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total ventas", valor: formatoCOP(totalVentas), icon: "💰", color: "text-primario", bg: "bg-primario/5 border-primario/20" },
          { label: "Utilidad estimada", valor: formatoCOP(utilidad), icon: "📈", color: utilidad >= 0 ? "text-green-600" : "text-red-500", bg: utilidad >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200" },
          { label: "Pedidos", valor: String(pedidos.length), icon: "🧾", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "Ticket promedio", valor: formatoCOP(ticketPromedio), icon: "🎫", color: "text-secundario", bg: "bg-secundario/5 border-secundario/20" },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{k.icon}</span>
            </div>
            <p className={`text-xl font-bold ${k.color}`}>{k.valor}</p>
            <p className="text-xs text-cafe mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-crema-oscuro/30 rounded-xl p-1 mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white text-cafe-oscuro shadow-sm"
                : "text-cafe hover:text-cafe-oscuro"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Ventas */}
      {tab === "ventas" && (
        <div className="space-y-6">
          {/* Ventas por día */}
          <div className="bg-white rounded-2xl border border-crema-oscuro p-5">
            <h2 className="font-bold text-cafe-oscuro mb-4">Ventas por día</h2>
            {ventasPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={ventasPorDia} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5ead8" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#8b6f47" }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#8b6f47" }} />
                  <Tooltip
                    formatter={(v) => [formatoCOP(Number(v)), "Ventas"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #f5ead8", fontSize: 12 }}
                  />
                  <Bar dataKey="total" fill="#F400A1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-cafe py-12">Sin ventas en este período</p>
            )}
          </div>

          {/* Medios de pago */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-crema-oscuro p-5">
              <h2 className="font-bold text-cafe-oscuro mb-4">Por medio de pago</h2>
              {porMedioPago.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={porMedioPago}
                      dataKey="total"
                      nameKey="medio"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name} ${totalVentas ? Math.round((Number(value) / totalVentas) * 100) : 0}%`}
                      labelLine={true}
                    >
                      {porMedioPago.map((_, i) => (
                        <Cell key={i} fill={COLORES[i % COLORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatoCOP(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-cafe py-12">Sin datos</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-crema-oscuro p-5">
              <h2 className="font-bold text-cafe-oscuro mb-4">Detalle medios de pago</h2>
              <div className="space-y-3">
                {porMedioPago.map((m, i) => (
                  <div key={m.medio} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORES[i % COLORES.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-cafe-oscuro">{m.medio}</span>
                        <span className="text-sm font-bold text-cafe-oscuro">{formatoCOP(m.total)}</span>
                      </div>
                      <div className="h-1.5 bg-crema-oscuro rounded-full">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: `${m.pct}%`, backgroundColor: COLORES[i % COLORES.length] }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-cafe w-8 text-right">{m.pct}%</span>
                  </div>
                ))}
                {porMedioPago.length === 0 && <p className="text-cafe text-sm">Sin datos</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Productos */}
      {tab === "productos" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-crema-oscuro p-5">
            <h2 className="font-bold text-cafe-oscuro mb-4">Productos más vendidos (unidades)</h2>
            {topProductos.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={topProductos}
                  layout="vertical"
                  margin={{ top: 4, right: 60, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5ead8" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#8b6f47" }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={130}
                    tick={{ fontSize: 11, fill: "#5c4a2f" }}
                  />
                  <Tooltip
                    formatter={(v, name) => [v, name === "cantidad" ? "Unidades" : "Total"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #f5ead8", fontSize: 12 }}
                  />
                  <Bar dataKey="cantidad" fill="#C273E0" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 11, fill: "#5c4a2f" }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-cafe py-12">Sin datos de productos en este período</p>
            )}
          </div>

          {/* Tabla detalle */}
          <div className="bg-white rounded-2xl border border-crema-oscuro overflow-hidden">
            <div className="px-5 py-4 border-b border-crema-oscuro">
              <h2 className="font-bold text-cafe-oscuro">Tabla de productos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-crema/50">
                  <tr>
                    <th className="text-left px-5 py-3 text-cafe font-semibold">#</th>
                    <th className="text-left px-5 py-3 text-cafe font-semibold">Producto</th>
                    <th className="text-right px-5 py-3 text-cafe font-semibold">Unidades</th>
                    <th className="text-right px-5 py-3 text-cafe font-semibold">Total vendido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-crema-oscuro/40">
                  {topProductos.map((p, i) => (
                    <tr key={p.nombre} className="hover:bg-crema/30 transition-colors">
                      <td className="px-5 py-3 text-cafe">{i + 1}</td>
                      <td className="px-5 py-3 font-medium text-cafe-oscuro">{p.nombre}</td>
                      <td className="px-5 py-3 text-right font-semibold text-cafe-oscuro">{p.cantidad}</td>
                      <td className="px-5 py-3 text-right font-bold text-primario">{formatoCOP(p.total)}</td>
                    </tr>
                  ))}
                  {topProductos.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-cafe">Sin datos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Gastos */}
      {tab === "gastos" && (
        <div className="space-y-6">
          {/* KPI gastos vs ventas */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total ventas", valor: formatoCOP(totalVentas), color: "text-green-600", bg: "bg-green-50 border-green-200" },
              { label: "Total gastos", valor: formatoCOP(totalGastos), color: "text-red-500", bg: "bg-red-50 border-red-200" },
              { label: "Utilidad estimada", valor: formatoCOP(utilidad), color: utilidad >= 0 ? "text-primario" : "text-red-600", bg: "bg-crema border-crema-oscuro" },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
                <p className={`text-lg font-bold ${k.color}`}>{k.valor}</p>
                <p className="text-xs text-cafe mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {gastosPorCategoria.length > 0 ? (
            <div className="bg-white rounded-2xl border border-crema-oscuro p-5">
              <h2 className="font-bold text-cafe-oscuro mb-4">Gastos por categoría</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={gastosPorCategoria} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5ead8" />
                  <XAxis dataKey="cat" tick={{ fontSize: 11, fill: "#8b6f47" }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#8b6f47" }} />
                  <Tooltip formatter={(v) => [formatoCOP(Number(v)), "Gasto"]} contentStyle={{ borderRadius: 12, border: "1px solid #f5ead8", fontSize: 12 }} />
                  <Bar dataKey="monto" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-crema-oscuro p-12 text-center">
              <p className="text-cafe">Sin gastos registrados en este período</p>
              <p className="text-xs text-cafe-claro mt-1">Registra gastos en el módulo de Finanzas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
