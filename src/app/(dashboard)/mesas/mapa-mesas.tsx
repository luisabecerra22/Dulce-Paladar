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

function IconoMesa({ tipo }: { tipo: string }) {
  if (tipo === "mesa") {
    return (
      <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
        <rect x="8" y="12" width="24" height="16" rx="3" fill="currentColor" opacity="0.15" />
        <rect x="8" y="12" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <line x1="12" y1="28" x2="12" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="28" x2="28" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="12" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="28" y1="12" x2="28" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (tipo === "barra") {
    return (
      <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="16" width="28" height="8" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="6" y="16" width="28" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="13" cy="30" r="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="20" cy="30" r="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="27" cy="30" r="2" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (tipo === "caja") {
    return (
      <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
        <rect x="8" y="10" width="24" height="20" rx="3" fill="currentColor" opacity="0.15" />
        <rect x="8" y="10" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="14" width="16" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <line x1="12" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (tipo === "domicilio") {
    return (
      <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="16" r="6" fill="currentColor" opacity="0.15" />
        <circle cx="20" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14 26h12l2 8H12l2-8z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8" viewBox="0 0 40 40" fill="none">
      <rect x="10" y="10" width="20" height="20" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 20h8M20 16v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

  const zonas = useMemo(() => {
    const z: Record<string, Mesa[]> = {};
    mesas.forEach((m) => {
      if (!z[m.zona]) z[m.zona] = [];
      z[m.zona].push(m);
    });
    return z;
  }, [mesas]);

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

      {/* Resumen rápido */}
      <div className="flex gap-3 mb-6">
        {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => {
          let count = 0;
          mesas.forEach((m) => { if (obtenerEstadoMesa(m, pedidos) === key) count++; });
          return (
            <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cfg.bg} border ${cfg.border}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              <span className={`text-sm font-medium ${cfg.text}`}>{cfg.label}: {count}</span>
            </div>
          );
        })}
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

                return (
                  <div
                    key={mesa.id}
                    onClick={() => setDetalleMesa(mesa)}
                    className={`relative bg-white rounded-2xl border-2 ${cfg.border} p-4 cursor-pointer hover:shadow-lg transition-all group`}
                  >
                    {/* Badge estado */}
                    <div className="absolute top-3 right-3">
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Icono */}
                    <div className={`${cfg.text} mb-3`}>
                      <IconoMesa tipo={mesa.tipo} />
                    </div>

                    {/* Nombre */}
                    <h3 className="font-bold text-cafe-oscuro text-sm">{mesa.nombre}</h3>
                    <p className="text-xs text-cafe mt-0.5">
                      {mesa.capacidad > 0 ? `${mesa.capacidad} personas` : TIPOS.find((t) => t.value === mesa.tipo)?.label}
                    </p>

                    {/* Info del pedido activo */}
                    {pedido && (
                      <div className="mt-3 pt-2 border-t border-crema-oscuro">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-cafe-oscuro">
                            Pedido #{pedido.numero}
                          </span>
                          <span className="text-[10px] text-cafe">
                            {tiempoTranscurrido(pedido.creado_en)}
                          </span>
                        </div>
                        {(pedido.clientes as unknown as { nombre: string } | null)?.nombre && (
                          <p className="text-[10px] text-cafe mb-1">
                            👤 {(pedido.clientes as unknown as { nombre: string }).nombre}
                          </p>
                        )}
                        <p className="text-sm font-bold text-primario">
                          {formatoCOP(pedido.total)}
                        </p>
                      </div>
                    )}

                    {/* Acciones hover */}
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); abrirEditar(mesa); }}
                        className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); eliminarMesa(mesa.id, mesa.nombre); }}
                        className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
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
