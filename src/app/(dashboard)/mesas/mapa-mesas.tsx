"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { formatoCOP } from "@/lib/formato";
import Link from "next/link";

type Mesa = {
  id: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  zona: string;
  orden: number;
  activa: boolean;
};

type ItemPedido = {
  cantidad: number;
  productos: { nombre: string } | null;
  variaciones: { nombre: string } | null;
};

type PedidoActivo = {
  id: string;
  numero: number;
  mesa_numero: number | null;
  tipo: string;
  estado: string;
  total: number;
  abono: number;
  saldo_pendiente: number;
  creado_en: string;
  clientes: { nombre: string } | null;
  pedido_items: ItemPedido[];
};

type FormMesa = {
  nombre: string;
  tipo: string;
  capacidad: number;
  zona: string;
};

const TIPOS = [
  { value: "mesa", label: "Mesa", icono: "🪑" },
  { value: "barra", label: "Barra", icono: "🍸" },
  { value: "caja", label: "Caja", icono: "💳" },
  { value: "domicilio", label: "Domicilio", icono: "🛵" },
  { value: "punto_entrega", label: "Punto de entrega", icono: "📦" },
];

const ZONAS = ["principal", "barra", "caja", "domicilios", "terraza"];

const ESTADO_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; dot: string }> = {
  libre: { label: "Libre", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500" },
  ocupada: { label: "Ocupada", bg: "bg-primario/5", border: "border-primario/30", text: "text-primario", dot: "bg-primario" },
  preparando: { label: "Preparando", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  lista: { label: "Lista", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
};

function obtenerEstadoMesa(mesa: Mesa, pedidos: PedidoActivo[]): string {
  const mesaNum = parseInt(mesa.nombre.replace(/\D/g, "")) || 0;
  const pedido = pedidos.find(
    (p) => p.tipo === "mesa" && p.mesa_numero === mesaNum
  );
  if (!pedido) return "libre";
  if (pedido.estado === "listo") return "lista";
  if (pedido.estado === "preparacion") return "preparando";
  return "ocupada";
}

function obtenerPedidoMesa(mesa: Mesa, pedidos: PedidoActivo[]): PedidoActivo | null {
  const mesaNum = parseInt(mesa.nombre.replace(/\D/g, "")) || 0;
  return pedidos.find((p) => p.tipo === "mesa" && p.mesa_numero === mesaNum) || null;
}

function tiempoTranscurrido(fecha: string): string {
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function FormaMesa({ tipo, capacidad, color }: { tipo: string; capacidad: number; color: string }) {
  const fill = color;
  const silla = color;

  if (tipo === "mesa" && capacidad <= 2) {
    return (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        {/* Mesa redonda pequeña */}
        <circle cx="60" cy="60" r="22" fill={fill} opacity="0.15" stroke={fill} strokeWidth="2" />
        {/* 2 sillas */}
        <rect x="50" y="18" width="20" height="10" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
        <rect x="50" y="92" width="20" height="10" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
      </svg>
    );
  }

  if (tipo === "mesa" && capacidad <= 4) {
    return (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        {/* Mesa cuadrada */}
        <rect x="32" y="32" width="56" height="56" rx="8" fill={fill} opacity="0.15" stroke={fill} strokeWidth="2" />
        {/* 4 sillas */}
        <rect x="46" y="12" width="28" height="10" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
        <rect x="46" y="98" width="28" height="10" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
        <rect x="12" y="46" width="10" height="28" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
        <rect x="98" y="46" width="10" height="28" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
      </svg>
    );
  }

  if (tipo === "mesa") {
    return (
      <svg viewBox="0 0 140 120" className="w-full h-full">
        {/* Mesa rectangular grande */}
        <rect x="22" y="30" width="96" height="60" rx="8" fill={fill} opacity="0.15" stroke={fill} strokeWidth="2" />
        {/* 6 sillas: 3 arriba, 3 abajo */}
        <rect x="28" y="10" width="24" height="10" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
        <rect x="58" y="10" width="24" height="10" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
        <rect x="88" y="10" width="24" height="10" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
        <rect x="28" y="100" width="24" height="10" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
        <rect x="58" y="100" width="24" height="10" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
        <rect x="88" y="100" width="24" height="10" rx="5" fill={silla} opacity="0.35" stroke={silla} strokeWidth="1.5" />
      </svg>
    );
  }

  if (tipo === "barra") {
    return (
      <svg viewBox="0 0 160 100" className="w-full h-full">
        {/* Barra larga */}
        <rect x="10" y="20" width="140" height="30" rx="6" fill={fill} opacity="0.15" stroke={fill} strokeWidth="2" />
        {/* Banquetas abajo */}
        <circle cx="35" cy="72" r="10" fill={silla} opacity="0.3" stroke={silla} strokeWidth="1.5" />
        <circle cx="65" cy="72" r="10" fill={silla} opacity="0.3" stroke={silla} strokeWidth="1.5" />
        <circle cx="95" cy="72" r="10" fill={silla} opacity="0.3" stroke={silla} strokeWidth="1.5" />
        <circle cx="125" cy="72" r="10" fill={silla} opacity="0.3" stroke={silla} strokeWidth="1.5" />
      </svg>
    );
  }

  if (tipo === "caja") {
    return (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        {/* Mostrador en L */}
        <rect x="15" y="20" width="90" height="30" rx="4" fill={fill} opacity="0.15" stroke={fill} strokeWidth="2" />
        <rect x="75" y="20" width="30" height="60" rx="4" fill={fill} opacity="0.1" stroke={fill} strokeWidth="2" />
        {/* Pantalla/caja */}
        <rect x="30" y="28" width="20" height="14" rx="2" fill={fill} opacity="0.25" stroke={fill} strokeWidth="1" />
      </svg>
    );
  }

  if (tipo === "domicilio") {
    return (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        {/* Moto/bicicleta estilizada */}
        <circle cx="35" cy="60" r="18" fill={fill} opacity="0.1" stroke={fill} strokeWidth="1.5" />
        <circle cx="85" cy="60" r="18" fill={fill} opacity="0.1" stroke={fill} strokeWidth="1.5" />
        <path d="M35 60 L55 35 L75 35 L85 60" stroke={fill} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="48" y="25" width="24" height="12" rx="3" fill={fill} opacity="0.2" stroke={fill} strokeWidth="1.5" />
      </svg>
    );
  }

  // punto_entrega
  return (
    <svg viewBox="0 0 120 100" className="w-full h-full">
      <rect x="20" y="25" width="80" height="50" rx="8" fill={fill} opacity="0.1" stroke={fill} strokeWidth="2" />
      <rect x="35" y="15" width="50" height="15" rx="4" fill={fill} opacity="0.2" stroke={fill} strokeWidth="1.5" />
      <path d="M50 50 L55 60 L70 40" stroke={fill} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ESTADO_COLORES: Record<string, string> = {
  libre: "#22c55e",
  ocupada: "#F400A1",
  preparando: "#3b82f6",
  lista: "#f59e0b",
};

export default function MapaMesas({
  mesasIniciales,
  pedidosActivos: pedidosInit,
}: {
  mesasIniciales: Mesa[];
  pedidosActivos: PedidoActivo[];
}) {
  const [mesas, setMesas] = useState(mesasIniciales);
  const [pedidos, setPedidos] = useState(pedidosInit);
  const [modalForm, setModalForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [detalleMesa, setDetalleMesa] = useState<Mesa | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormMesa>({
    nombre: "",
    tipo: "mesa",
    capacidad: 4,
    zona: "principal",
  });
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const router = useRouter();
  const supabase = createClient();

  const recargar = useCallback(async () => {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from("mesas").select("*").eq("activa", true).order("orden"),
      supabase
        .from("pedidos")
        .select("id, numero, mesa_numero, tipo, estado, total, abono, saldo_pendiente, creado_en, clientes(nombre), pedido_items(cantidad, productos(nombre), variaciones(nombre))")
        .in("estado", ["pendiente", "preparacion", "listo"])
        .order("creado_en", { ascending: true }),
    ]);
    if (m) setMesas(m as Mesa[]);
    if (p) setPedidos(p as unknown as PedidoActivo[]);
  }, [supabase]);

  useEffect(() => {
    const canal = supabase
      .channel("mesas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => recargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "mesas" }, () => recargar())
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [supabase, recargar]);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const mesasFiltradas = useMemo(() => {
    if (!filtroEstado) return mesas;
    return mesas.filter((m) => obtenerEstadoMesa(m, pedidos) === filtroEstado);
  }, [mesas, pedidos, filtroEstado]);

  const zonas = useMemo(() => {
    const z: Record<string, Mesa[]> = {};
    mesasFiltradas.forEach((m) => {
      if (!z[m.zona]) z[m.zona] = [];
      z[m.zona].push(m);
    });
    return z;
  }, [mesasFiltradas]);

  const resumen = useMemo(() => {
    let libres = 0, ocupadas = 0;
    mesas.filter((m) => m.tipo === "mesa" || m.tipo === "barra").forEach((m) => {
      const est = obtenerEstadoMesa(m, pedidos);
      if (est === "libre") libres++;
      else ocupadas++;
    });
    return { libres, ocupadas, total: mesas.length };
  }, [mesas, pedidos]);

  const ZONA_LABEL: Record<string, string> = {
    principal: "Mesas principales",
    barra: "Barra",
    caja: "Caja",
    domicilios: "Domicilios / Entregas",
    terraza: "Terraza",
  };

  function abrirNueva() {
    setEditandoId(null);
    setForm({ nombre: "", tipo: "mesa", capacidad: 4, zona: "principal" });
    setError("");
    setModalForm(true);
  }

  function abrirEditar(mesa: Mesa) {
    setEditandoId(mesa.id);
    setForm({ nombre: mesa.nombre, tipo: mesa.tipo, capacidad: mesa.capacidad, zona: mesa.zona });
    setError("");
    setModalForm(true);
  }

  async function guardarMesa() {
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setGuardando(true);
    setError("");

    const datos = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      capacidad: form.capacidad,
      zona: form.zona,
    };

    if (editandoId) {
      const { error: err } = await supabase.from("mesas").update(datos).eq("id", editandoId);
      if (err) { setError("Error: " + err.message); setGuardando(false); return; }
    } else {
      const maxOrden = Math.max(0, ...mesas.map((m) => m.orden));
      const { error: err } = await supabase.from("mesas").insert({ ...datos, orden: maxOrden + 1 });
      if (err) { setError("Error: " + err.message); setGuardando(false); return; }
    }

    setGuardando(false);
    setModalForm(false);
    await recargar();
    router.refresh();
  }

  async function eliminarMesa(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    await supabase.from("mesas").update({ activa: false }).eq("id", id);
    await recargar();
    router.refresh();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-cafe-oscuro">
            Organización de Mesas
          </h1>
          <p className="text-sm text-cafe mt-1">
            {resumen.total} zonas · {resumen.libres} libres · {resumen.ocupadas} ocupadas · se actualiza en tiempo real
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
        >
          + Nueva
        </button>
      </div>

      {/* Resumen rápido — filtros clickeables */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => {
          let count = 0;
          mesas.forEach((m) => { if (obtenerEstadoMesa(m, pedidos) === key) count++; });
          const activo = filtroEstado === key;
          return (
            <button
              key={key}
              onClick={() => setFiltroEstado(activo ? null : key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                activo
                  ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-primario shadow-md scale-105`
                  : `${cfg.bg} ${cfg.border} opacity-80 hover:opacity-100 hover:shadow`
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}: {count}</span>
            </button>
          );
        })}
        {filtroEstado && (
          <button
            onClick={() => setFiltroEstado(null)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-all text-sm"
          >
            ✕ Limpiar filtro
          </button>
        )}
      </div>

      {/* Mapa por zonas */}
      <div className="space-y-8">
        {Object.entries(zonas).map(([zona, mesasZona]) => (
          <div key={zona}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-cafe-oscuro">
                {ZONA_LABEL[zona] || zona}
              </h2>
              <div className="flex-1 h-px bg-crema-oscuro" />
              <span className="text-xs text-cafe">{mesasZona.length} elementos</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {mesasZona.map((mesa) => {
                const estado = obtenerEstadoMesa(mesa, pedidos);
                const cfg = ESTADO_CONFIG[estado];
                const pedido = obtenerPedidoMesa(mesa, pedidos);

                const colorSvg = ESTADO_COLORES[estado] || ESTADO_COLORES.libre;

                return (
                  <div
                    key={mesa.id}
                    onClick={() => setDetalleMesa(mesa)}
                    className={`relative rounded-2xl border-2 ${cfg.border} cursor-pointer hover:shadow-lg transition-all group overflow-hidden ${cfg.bg}`}
                  >
                    {/* Forma de mesa visual */}
                    <div className="relative px-4 pt-4 pb-2">
                      {/* Badge estado */}
                      <div className="absolute top-2 right-2 z-10">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/80 backdrop-blur-sm ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${estado !== "libre" ? "animate-pulse" : ""}`} />
                          {cfg.label}
                        </span>
                      </div>

                      {/* SVG de mesa con sillas */}
                      <div className="w-full h-24 flex items-center justify-center">
                        <FormaMesa tipo={mesa.tipo} capacidad={mesa.capacidad} color={colorSvg} />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="bg-white/70 backdrop-blur-sm px-4 py-3 border-t border-white/50">
                      <h3 className="font-bold text-cafe-oscuro text-sm">{mesa.nombre}</h3>
                      <p className="text-[11px] text-cafe">
                        {mesa.capacidad > 0 ? `${mesa.capacidad} personas` : TIPOS.find((t) => t.value === mesa.tipo)?.label}
                      </p>

                      {pedido && (
                        <div className="mt-2 pt-2 border-t border-crema-oscuro/50">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-cafe-oscuro">
                              #{pedido.numero}
                              {(pedido.clientes as unknown as { nombre: string } | null)?.nombre && (
                                <span className="font-normal text-cafe"> · {(pedido.clientes as unknown as { nombre: string }).nombre}</span>
                              )}
                            </span>
                            <span className="text-[10px] text-cafe">{tiempoTranscurrido(pedido.creado_en)}</span>
                          </div>
                          <p className="text-sm font-bold text-primario mt-0.5">
                            {formatoCOP(pedido.total)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Acciones hover */}
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); abrirEditar(mesa); }}
                        className="w-7 h-7 rounded-lg bg-white/90 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition-colors shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); eliminarMesa(mesa.id, mesa.nombre); }}
                        className="w-7 h-7 rounded-lg bg-white/90 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Detalle de mesa */}
      {detalleMesa && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            {(() => {
              const estado = obtenerEstadoMesa(detalleMesa, pedidos);
              const cfg = ESTADO_CONFIG[estado];
              const pedido = obtenerPedidoMesa(detalleMesa, pedidos);

              return (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-cafe-oscuro">{detalleMesa.nombre}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <button onClick={() => setDetalleMesa(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                  </div>

                  <div className="text-sm text-cafe space-y-1 mb-4">
                    <p>Tipo: <span className="font-medium text-cafe-oscuro capitalize">{detalleMesa.tipo}</span></p>
                    {detalleMesa.capacidad > 0 && <p>Capacidad: <span className="font-medium text-cafe-oscuro">{detalleMesa.capacidad} personas</span></p>}
                    <p>Zona: <span className="font-medium text-cafe-oscuro capitalize">{detalleMesa.zona}</span></p>
                  </div>

                  {pedido ? (
                    <div className="bg-crema rounded-xl p-4 mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-cafe-oscuro">Pedido #{pedido.numero}</span>
                        <span className="text-xs text-cafe">{tiempoTranscurrido(pedido.creado_en)}</span>
                      </div>
                      {(pedido.clientes as unknown as { nombre: string } | null)?.nombre && (
                        <p className="text-sm text-cafe mb-2">👤 {(pedido.clientes as unknown as { nombre: string }).nombre}</p>
                      )}
                      <div className="space-y-1 mb-3">
                        {pedido.pedido_items.map((item, i) => (
                          <p key={i} className="text-sm text-cafe-oscuro">
                            <span className="font-semibold">{item.cantidad}x</span>{" "}
                            {(item.productos as unknown as { nombre: string } | null)?.nombre || "Producto"}
                            {(item.variaciones as unknown as { nombre: string } | null)?.nombre && (
                              <span className="text-cafe"> ({(item.variaciones as unknown as { nombre: string }).nombre})</span>
                            )}
                          </p>
                        ))}
                      </div>
                      <div className="border-t border-crema-oscuro pt-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-cafe">Total</span>
                          <span className="font-bold text-primario text-lg">{formatoCOP(pedido.total)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 rounded-xl p-4 mb-4 text-center">
                      <p className="text-sm text-green-700 font-medium">Mesa libre — sin pedido activo</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href="/pos"
                      onClick={() => setDetalleMesa(null)}
                      className="flex-1 py-2.5 bg-primario text-white rounded-lg font-semibold text-sm text-center hover:bg-primario-oscuro transition-colors"
                    >
                      {pedido ? "Ver en POS" : "Nuevo pedido"}
                    </Link>
                    <button
                      onClick={() => { setDetalleMesa(null); abrirEditar(detalleMesa); }}
                      className="px-4 py-2.5 border border-crema-oscuro rounded-lg text-sm font-medium text-cafe hover:bg-crema transition-colors"
                    >
                      Editar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal: Crear/Editar mesa */}
      {modalForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-cafe-oscuro mb-4">
              {editandoId ? "Editar zona" : "Nueva zona"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cafe mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-crema-oscuro rounded-lg focus:outline-none focus:ring-2 focus:ring-primario bg-crema/30"
                  placeholder="Ej: Mesa 9"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cafe mb-2">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, tipo: t.value })}
                      className={`p-2 rounded-xl text-center text-xs font-medium transition-colors border-2 ${
                        form.tipo === t.value
                          ? "border-primario bg-primario/5 text-primario"
                          : "border-crema-oscuro text-cafe hover:border-cafe-claro"
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{t.icono}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-cafe mb-1">Capacidad</label>
                  <input
                    type="number"
                    value={form.capacidad}
                    onChange={(e) => setForm({ ...form, capacidad: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-crema-oscuro rounded-lg focus:outline-none focus:ring-2 focus:ring-primario bg-crema/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-cafe mb-1">Zona</label>
                  <select
                    value={form.zona}
                    onChange={(e) => setForm({ ...form, zona: e.target.value })}
                    className="w-full px-3 py-2 border border-crema-oscuro rounded-lg focus:outline-none focus:ring-2 focus:ring-primario bg-crema/30"
                  >
                    {ZONAS.map((z) => (
                      <option key={z} value={z}>{z.charAt(0).toUpperCase() + z.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={guardarMesa}
                  disabled={guardando}
                  className="flex-1 py-2.5 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : editandoId ? "Guardar" : "Crear"}
                </button>
                <button
                  onClick={() => setModalForm(false)}
                  className="px-4 py-2.5 border border-crema-oscuro rounded-lg font-semibold text-cafe hover:bg-crema transition-colors"
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
