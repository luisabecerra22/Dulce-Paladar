"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  pos_x: number;
  pos_y: number;
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

const ESTADO_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; dot: string; color: string }> = {
  libre:      { label: "Libre",      bg: "bg-emerald-50",  border: "border-emerald-300", text: "text-emerald-700", dot: "bg-emerald-500", color: "#22c55e" },
  ocupada:    { label: "Ocupada",    bg: "bg-primario/8",  border: "border-primario/40", text: "text-primario",    dot: "bg-primario",    color: "#C264FA" },
  preparando: { label: "Preparando", bg: "bg-blue-50",     border: "border-blue-300",    text: "text-blue-700",   dot: "bg-blue-500",    color: "#3b82f6" },
  lista:      { label: "Lista",      bg: "bg-amber-50",    border: "border-amber-300",   text: "text-amber-700",  dot: "bg-amber-500",   color: "#f59e0b" },
};

const CARD_W = 128;
const CARD_H = 140;
const CANVAS_W = 1600;
const CANVAS_H = 900;

function obtenerEstadoMesa(mesa: Mesa, pedidos: PedidoActivo[]): string {
  const mesaNum = parseInt(mesa.nombre.replace(/\D/g, "")) || 0;
  const pedido = pedidos.find((p) => p.tipo === "mesa" && p.mesa_numero === mesaNum);
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

function FormaMesa({ tipo, color }: { tipo: string; color: string }) {
  if (tipo === "mesa") {
    return (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <rect x="32" y="32" width="56" height="56" rx="8" fill={color} opacity="0.18" stroke={color} strokeWidth="2" />
        <rect x="46" y="12" width="28" height="10" rx="5" fill={color} opacity="0.4" stroke={color} strokeWidth="1.5" />
        <rect x="46" y="98" width="28" height="10" rx="5" fill={color} opacity="0.4" stroke={color} strokeWidth="1.5" />
        <rect x="12" y="46" width="10" height="28" rx="5" fill={color} opacity="0.4" stroke={color} strokeWidth="1.5" />
        <rect x="98" y="46" width="10" height="28" rx="5" fill={color} opacity="0.4" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (tipo === "barra") {
    return (
      <svg viewBox="0 0 160 100" className="w-full h-full">
        <rect x="10" y="20" width="140" height="30" rx="6" fill={color} opacity="0.18" stroke={color} strokeWidth="2" />
        <circle cx="35" cy="72" r="10" fill={color} opacity="0.35" stroke={color} strokeWidth="1.5" />
        <circle cx="65" cy="72" r="10" fill={color} opacity="0.35" stroke={color} strokeWidth="1.5" />
        <circle cx="95" cy="72" r="10" fill={color} opacity="0.35" stroke={color} strokeWidth="1.5" />
        <circle cx="125" cy="72" r="10" fill={color} opacity="0.35" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  if (tipo === "caja") {
    return (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <rect x="15" y="20" width="90" height="30" rx="4" fill={color} opacity="0.18" stroke={color} strokeWidth="2" />
        <rect x="75" y="20" width="30" height="60" rx="4" fill={color} opacity="0.12" stroke={color} strokeWidth="2" />
        <rect x="30" y="28" width="20" height="14" rx="2" fill={color} opacity="0.3" />
      </svg>
    );
  }
  if (tipo === "domicilio") {
    return (
      <svg viewBox="0 0 120 100" className="w-full h-full">
        <circle cx="35" cy="60" r="18" fill={color} opacity="0.12" stroke={color} strokeWidth="1.5" />
        <circle cx="85" cy="60" r="18" fill={color} opacity="0.12" stroke={color} strokeWidth="1.5" />
        <path d="M35 60 L55 35 L75 35 L85 60" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="48" y="25" width="24" height="12" rx="3" fill={color} opacity="0.25" stroke={color} strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 100" className="w-full h-full">
      <rect x="20" y="25" width="80" height="50" rx="8" fill={color} opacity="0.12" stroke={color} strokeWidth="2" />
      <rect x="35" y="15" width="50" height="15" rx="4" fill={color} opacity="0.22" stroke={color} strokeWidth="1.5" />
      <path d="M50 50 L55 60 L70 40" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MapaMesas({
  mesasIniciales,
  pedidosActivos: pedidosInit,
}: {
  mesasIniciales: Mesa[];
  pedidosActivos: PedidoActivo[];
}) {
  const [mesas, setMesas] = useState(mesasIniciales);
  const [pedidos, setPedidos] = useState(pedidosInit);
  const [posiciones, setPosiciones] = useState<Record<string, { x: number; y: number }>>({});
  const [arrastrando, setArrastrando] = useState<{ id: string; offX: number; offY: number } | null>(null);
  const [guardandoPos, setGuardandoPos] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [detalleMesa, setDetalleMesa] = useState<Mesa | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormMesa>({ nombre: "", tipo: "mesa", capacidad: 4, zona: "principal" });
  const [modalTransferir, setModalTransferir] = useState(false);
  const [mesaDestino, setMesaDestino] = useState<string>("");
  const [transfiriendo, setTransfiriendo] = useState(false);
  const [, setTick] = useState(0);
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Inicializar posiciones desde la base de datos
  useEffect(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    mesas.forEach((m) => {
      pos[m.id] = { x: m.pos_x ?? 50, y: m.pos_y ?? 50 };
    });
    setPosiciones(pos);
  }, [mesas]);

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

  // --- Drag handlers sobre el canvas ---
  function onMouseDownMesa(e: React.MouseEvent, mesaId: string) {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scrollLeft = canvas.scrollLeft ?? 0;
    const scrollTop = canvas.scrollTop ?? 0;
    const mouseX = e.clientX - rect.left + scrollLeft;
    const mouseY = e.clientY - rect.top + scrollTop;
    const pos = posiciones[mesaId] ?? { x: 0, y: 0 };
    setArrastrando({ id: mesaId, offX: mouseX - pos.x, offY: mouseY - pos.y });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!arrastrando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scrollLeft = canvas.scrollLeft ?? 0;
    const scrollTop = canvas.scrollTop ?? 0;
    const mouseX = e.clientX - rect.left + scrollLeft;
    const mouseY = e.clientY - rect.top + scrollTop;
    const newX = Math.max(0, Math.min(CANVAS_W - CARD_W, mouseX - arrastrando.offX));
    const newY = Math.max(0, Math.min(CANVAS_H - CARD_H, mouseY - arrastrando.offY));
    setPosiciones((prev) => ({ ...prev, [arrastrando.id]: { x: newX, y: newY } }));
  }

  async function onMouseUp() {
    if (!arrastrando) return;
    const pos = posiciones[arrastrando.id];
    if (pos) {
      setGuardandoPos(arrastrando.id);
      await supabase.from("mesas").update({ pos_x: Math.round(pos.x), pos_y: Math.round(pos.y) }).eq("id", arrastrando.id);
      setGuardandoPos(null);
    }
    setArrastrando(null);
  }

  // Touch support
  function onTouchStart(e: React.TouchEvent, mesaId: string) {
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = touch.clientX - rect.left + canvas.scrollLeft;
    const mouseY = touch.clientY - rect.top + canvas.scrollTop;
    const pos = posiciones[mesaId] ?? { x: 0, y: 0 };
    setArrastrando({ id: mesaId, offX: mouseX - pos.x, offY: mouseY - pos.y });
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!arrastrando) return;
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = touch.clientX - rect.left + canvas.scrollLeft;
    const mouseY = touch.clientY - rect.top + canvas.scrollTop;
    const newX = Math.max(0, Math.min(CANVAS_W - CARD_W, mouseX - arrastrando.offX));
    const newY = Math.max(0, Math.min(CANVAS_H - CARD_H, mouseY - arrastrando.offY));
    setPosiciones((prev) => ({ ...prev, [arrastrando.id]: { x: newX, y: newY } }));
  }

  async function onTouchEnd() {
    await onMouseUp();
  }

  const resumen = useMemo(() => {
    let libres = 0, ocupadas = 0;
    mesas.forEach((m) => {
      if (m.tipo !== "mesa" && m.tipo !== "barra") return;
      const est = obtenerEstadoMesa(m, pedidos);
      if (est === "libre") libres++;
      else ocupadas++;
    });
    return { libres, ocupadas, total: mesas.length };
  }, [mesas, pedidos]);

  const mesasFiltradas = useMemo(() => {
    if (!filtroEstado) return mesas;
    return mesas.filter((m) => obtenerEstadoMesa(m, pedidos) === filtroEstado);
  }, [mesas, pedidos, filtroEstado]);

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
    const datos = { nombre: form.nombre.trim(), tipo: form.tipo, capacidad: form.capacidad, zona: form.zona };

    if (editandoId) {
      const { error: err } = await supabase.from("mesas").update(datos).eq("id", editandoId);
      if (err) { setError("Error: " + err.message); setGuardando(false); return; }
    } else {
      const maxOrden = Math.max(0, ...mesas.map((m) => m.orden));
      // Posición inicial: esquina superior izquierda libre
      const usedPositions = Object.values(posiciones);
      let newX = 40, newY = 40;
      const step = 170;
      let found = false;
      for (let row = 0; row < 10 && !found; row++) {
        for (let col = 0; col < 8 && !found; col++) {
          const cx = col * step + 40;
          const cy = row * step + 40;
          const ocupado = usedPositions.some((p) => Math.abs(p.x - cx) < CARD_W && Math.abs(p.y - cy) < CARD_H);
          if (!ocupado) { newX = cx; newY = cy; found = true; }
        }
      }
      const { error: err } = await supabase.from("mesas").insert({ ...datos, orden: maxOrden + 1, pos_x: newX, pos_y: newY });
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

  const mesasLibres = useMemo(() => {
    if (!detalleMesa) return [];
    return mesas.filter((m) => m.id !== detalleMesa.id && m.tipo === "mesa" && obtenerEstadoMesa(m, pedidos) === "libre");
  }, [mesas, pedidos, detalleMesa]);

  async function transferirPedido() {
    if (!detalleMesa || !mesaDestino) return;
    const pedido = obtenerPedidoMesa(detalleMesa, pedidos);
    if (!pedido) return;
    setTransfiriendo(true);
    const nuevoNum = parseInt(mesaDestino.replace(/\D/g, "")) || 0;
    const { error: err } = await supabase.from("pedidos").update({ mesa_numero: nuevoNum }).eq("id", pedido.id);
    if (err) { setError("Error al transferir: " + err.message); setTransfiriendo(false); return; }
    setTransfiriendo(false);
    setModalTransferir(false);
    setMesaDestino("");
    setDetalleMesa(null);
    await recargar();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-cafe-oscuro">
            Mapa del local
          </h1>
          <p className="text-sm text-cafe mt-0.5">
            {resumen.total} elementos · {resumen.libres} libres · {resumen.ocupadas} ocupadas · arrastra para reposicionar
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario/90 transition-colors text-sm shadow-sm"
        >
          + Nueva mesa
        </button>
      </div>

      {/* Leyenda / filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => {
          let count = 0;
          mesas.forEach((m) => { if (obtenerEstadoMesa(m, pedidos) === key) count++; });
          const activo = filtroEstado === key;
          return (
            <button
              key={key}
              onClick={() => setFiltroEstado(activo ? null : key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                activo
                  ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-primario shadow`
                  : `${cfg.bg} ${cfg.border} opacity-75 hover:opacity-100`
              } ${cfg.text}`}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dot} ${key !== "libre" && count > 0 ? "animate-pulse" : ""}`} />
              {cfg.label}: {count}
            </button>
          );
        })}
        {filtroEstado && (
          <button
            onClick={() => setFiltroEstado(null)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-500 hover:border-gray-400 text-sm transition-all"
          >
            ✕ Ver todas
          </button>
        )}
      </div>

      {/* Canvas libre */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-auto rounded-2xl border border-gray-200 shadow-inner select-none"
        style={{
          minHeight: 500,
          background: "white",
          backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          cursor: arrastrando ? "grabbing" : "default",
        }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Tamaño interno del canvas */}
        <div style={{ width: CANVAS_W, height: CANVAS_H, position: "relative" }}>
          {mesasFiltradas.map((mesa) => {
            const estado = obtenerEstadoMesa(mesa, pedidos);
            const cfg = ESTADO_CONFIG[estado];
            const pedido = obtenerPedidoMesa(mesa, pedidos);
            const pos = posiciones[mesa.id] ?? { x: mesa.pos_x ?? 50, y: mesa.pos_y ?? 50 };
            const esDragging = arrastrando?.id === mesa.id;
            const guardandoEsta = guardandoPos === mesa.id;

            return (
              <div
                key={mesa.id}
                className={`absolute rounded-2xl border-2 overflow-hidden transition-shadow group ${cfg.border} ${cfg.bg} ${
                  esDragging ? "shadow-2xl ring-2 ring-primario ring-offset-2 z-30 scale-105" : "shadow-md hover:shadow-xl z-10"
                }`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: CARD_W,
                  height: CARD_H,
                  cursor: esDragging ? "grabbing" : "grab",
                  transition: esDragging ? "none" : "box-shadow 0.15s, transform 0.15s",
                }}
                onMouseDown={(e) => onMouseDownMesa(e, mesa.id)}
                onTouchStart={(e) => onTouchStart(e, mesa.id)}
                onClick={(e) => {
                  if (!arrastrando && !esDragging) { e.stopPropagation(); setDetalleMesa(mesa); }
                }}
              >
                {/* Badge estado */}
                <div className="absolute top-1.5 right-1.5 z-20">
                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/85 ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${estado !== "libre" ? "animate-pulse" : ""}`} />
                    {cfg.label}
                  </span>
                </div>

                {/* Indicador guardando */}
                {guardandoEsta && (
                  <div className="absolute top-1.5 left-1.5 z-20">
                    <svg className="w-3 h-3 text-primario animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>
                )}

                {/* SVG forma */}
                <div className="w-full px-3 pt-5 pb-1" style={{ height: 84 }}>
                  <FormaMesa tipo={mesa.tipo} color={cfg.color} />
                </div>

                {/* Info */}
                <div className="bg-white/80 px-2 py-1.5 border-t border-white/60" style={{ height: 56 }}>
                  <p className="font-bold text-cafe-oscuro text-xs leading-tight truncate">{mesa.nombre}</p>
                  {pedido ? (
                    <>
                      <p className="text-[10px] text-primario font-semibold">{formatoCOP(pedido.total)}</p>
                      <p className="text-[10px] text-cafe">{tiempoTranscurrido(pedido.creado_en)}</p>
                    </>
                  ) : (
                    <p className="text-[10px] text-cafe">
                      {mesa.capacidad > 0 ? `${mesa.capacidad} pers.` : TIPOS.find(t => t.value === mesa.tipo)?.label}
                    </p>
                  )}
                </div>

                {/* Acciones hover — editar / eliminar */}
                <div
                  className="absolute bottom-14 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); abrirEditar(mesa); }}
                    className="w-6 h-6 rounded-lg bg-white shadow text-blue-600 flex items-center justify-center hover:bg-blue-50"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); eliminarMesa(mesa.id, mesa.nombre); }}
                    className="w-6 h-6 rounded-lg bg-white shadow text-red-500 flex items-center justify-center hover:bg-red-50"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Detalle de mesa */}
      {detalleMesa && !modalTransferir && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDetalleMesa(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
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
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                      </span>
                    </div>
                    <button onClick={() => setDetalleMesa(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                  </div>

                  <div className="text-sm text-cafe space-y-1 mb-4">
                    <p>Tipo: <span className="font-medium text-cafe-oscuro capitalize">{detalleMesa.tipo}</span></p>
                    {detalleMesa.capacidad > 0 && <p>Capacidad: <span className="font-medium text-cafe-oscuro">{detalleMesa.capacidad} personas</span></p>}
                    <p>Zona: <span className="font-medium text-cafe-oscuro capitalize">{detalleMesa.zona}</span></p>
                  </div>

                  {pedido ? (
                    <div className="bg-crema rounded-xl p-4 mb-4">
                      <div className="flex justify-between items-center mb-2">
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
                      <div className="border-t border-crema-oscuro pt-2 flex justify-between">
                        <span className="text-sm text-cafe font-medium">Total</span>
                        <span className="font-bold text-primario text-lg">{formatoCOP(pedido.total)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 rounded-xl p-4 mb-4 text-center">
                      <p className="text-sm text-emerald-700 font-medium">Mesa libre — sin pedido activo</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link
                      href="/pos"
                      onClick={() => setDetalleMesa(null)}
                      className="flex-1 py-2.5 bg-primario text-white rounded-lg font-semibold text-sm text-center hover:bg-primario/90 transition-colors"
                    >
                      {pedido ? "Ver en POS" : "Nuevo pedido"}
                    </Link>
                    {pedido && mesasLibres.length > 0 && (
                      <button
                        onClick={() => { setMesaDestino(""); setModalTransferir(true); }}
                        className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Cambiar mesa
                      </button>
                    )}
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

      {/* Modal: Cambiar mesa */}
      {modalTransferir && detalleMesa && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-cafe-oscuro mb-1">Cambiar mesa</h3>
            <p className="text-sm text-cafe mb-4">
              Mover pedido #{obtenerPedidoMesa(detalleMesa, pedidos)?.numero} de <strong>{detalleMesa.nombre}</strong> a:
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {mesasLibres.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMesaDestino(m.nombre)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    mesaDestino === m.nombre
                      ? "border-primario bg-primario/5 text-primario"
                      : "border-crema-oscuro text-cafe hover:border-cafe"
                  }`}
                >
                  <div className="w-10 h-10 mx-auto mb-1">
                    <FormaMesa tipo="mesa" color={mesaDestino === m.nombre ? "#C264FA" : "#22c55e"} />
                  </div>
                  <span className="text-xs font-semibold">{m.nombre}</span>
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={transferirPedido}
                disabled={!mesaDestino || transfiriendo}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
              >
                {transfiriendo ? "Moviendo..." : `Mover a ${mesaDestino || "..."}`}
              </button>
              <button
                onClick={() => { setModalTransferir(false); setError(""); }}
                className="px-4 py-2.5 border border-crema-oscuro rounded-lg font-semibold text-cafe hover:bg-crema transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar mesa */}
      {modalForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-cafe-oscuro mb-4">
              {editandoId ? "Editar mesa" : "Nueva mesa"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cafe mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-crema-oscuro rounded-lg focus:outline-none focus:ring-2 focus:ring-primario bg-crema/30"
                  placeholder="Ej: Mesa 4"
                  autoFocus
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
                      className={`p-2 rounded-xl text-center text-xs font-medium border-2 transition-colors ${
                        form.tipo === t.value
                          ? "border-primario bg-primario/5 text-primario"
                          : "border-crema-oscuro text-cafe hover:border-cafe"
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
                  className="flex-1 py-2.5 bg-primario text-white rounded-lg font-semibold hover:bg-primario/90 transition-colors disabled:opacity-50"
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
