"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";

type Item = {
  id: string;
  cantidad: number;
  notas: string | null;
  descripcion_personalizada: string | null;
  productos: { nombre: string } | null;
  variaciones: { nombre: string } | null;
};

type Pedido = {
  id: string;
  numero: number;
  tipo: string;
  mesa_numero: number | null;
  direccion_entrega: string | null;
  fecha_entrega: string | null;
  estado: string;
  notas: string | null;
  creado_en: string;
  clientes: { nombre: string } | null;
  pedido_items: Item[];
};

const COLUMNAS = [
  {
    estado: "pendiente",
    titulo: "Pendientes",
    icono: "🕐",
    color: "border-amber-300 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    estado: "preparacion",
    titulo: "En preparación",
    icono: "👨‍🍳",
    color: "border-blue-300 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    estado: "listo",
    titulo: "Listos",
    icono: "✅",
    color: "border-green-300 bg-green-50",
    badge: "bg-green-100 text-green-700",
  },
];

const TIPO_LABEL: Record<string, string> = {
  mesa: "🪑 Mesa",
  recoger: "🛍️ Recoger",
  domicilio: "🛵 Domicilio",
  encargo: "📋 Encargo",
};

function tiempoTranscurrido(fecha: string): string {
  const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `hace ${horas}h ${minutos % 60}min`;
}

export default function TableroComandas({
  pedidosIniciales,
}: {
  pedidosIniciales: Pedido[];
}) {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciales);
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const supabase = createClient();

  const recargarPedidos = useCallback(async () => {
    const { data } = await supabase
      .from("pedidos")
      .select(
        "*, clientes(nombre), pedido_items(*, productos(nombre), variaciones(nombre))"
      )
      .in("estado", ["pendiente", "preparacion", "listo"])
      .order("creado_en", { ascending: true });
    if (data) setPedidos(data as Pedido[]);
  }, [supabase]);

  // Suscripción en tiempo real: cuando entra o cambia un pedido, recargar
  useEffect(() => {
    const canal = supabase
      .channel("comandas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => recargarPedidos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, recargarPedidos]);

  // Refrescar el "hace X min" cada 30 segundos
  useEffect(() => {
    const intervalo = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(intervalo);
  }, []);

  async function cambiarEstado(pedidoId: string, nuevoEstado: string) {
    setActualizando(pedidoId);
    const pedido = pedidos.find((p) => p.id === pedidoId);

    const { error } = await supabase
      .from("pedidos")
      .update({ estado: nuevoEstado })
      .eq("id", pedidoId);

    if (error) {
      alert("Error al actualizar: " + error.message);
    } else {
      // Notificación push cuando el pedido está listo
      if (nuevoEstado === "listo" && pedido) {
        const destino = pedido.tipo === "mesa" ? `Mesa ${pedido.mesa_numero}` : TIPO_LABEL[pedido.tipo] || pedido.tipo;
        fetch("/api/notificaciones/enviar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: "🍰 Pedido listo",
            cuerpo: `Pedido #${pedido.numero} — ${destino} está listo para entregar`,
            url: "/mesas",
            tag: `pedido-listo-${pedido.id}`,
          }),
        }).catch(() => {});
      }
      await recargarPedidos();
    }
    setActualizando(null);
  }

  function siguienteAccion(pedido: Pedido) {
    switch (pedido.estado) {
      case "pendiente":
        return { estado: "preparacion", label: "Empezar preparación", clase: "bg-blue-600 hover:bg-blue-700" };
      case "preparacion":
        return { estado: "listo", label: "Marcar listo", clase: "bg-green-600 hover:bg-green-700" };
      case "listo":
        return { estado: "entregado", label: "Entregar", clase: "bg-primario hover:bg-primario-oscuro" };
      default:
        return null;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900">
            Comandas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {pedidos.length} {pedidos.length === 1 ? "pedido activo" : "pedidos activos"} · se actualiza en tiempo real
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {COLUMNAS.map((col) => {
          const pedidosCol = pedidos.filter((p) => p.estado === col.estado);
          return (
            <div key={col.estado} className={`rounded-xl border-2 ${col.color} p-3`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="font-bold text-gray-800 text-sm">
                  {col.icono} {col.titulo}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badge}`}>
                  {pedidosCol.length}
                </span>
              </div>

              <div className="space-y-3">
                {pedidosCol.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-6">
                    Sin pedidos
                  </p>
                )}
                {pedidosCol.map((pedido) => {
                  const accion = siguienteAccion(pedido);
                  return (
                    <div
                      key={pedido.id}
                      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
                    >
                      {/* Encabezado */}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-gray-900">
                            #{pedido.numero}
                          </p>
                          <p className="text-xs text-gray-500">
                            {TIPO_LABEL[pedido.tipo] || pedido.tipo}
                            {pedido.mesa_numero ? ` ${pedido.mesa_numero}` : ""}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {tiempoTranscurrido(pedido.creado_en)}
                        </span>
                      </div>

                      {/* Cliente */}
                      {pedido.clientes?.nombre && (
                        <p className="text-xs text-gray-500 mb-2">
                          👤 {pedido.clientes.nombre}
                        </p>
                      )}

                      {/* Items */}
                      <div className="border-t border-gray-100 pt-2 mb-2 space-y-1">
                        {pedido.pedido_items.map((item) => (
                          <div key={item.id} className="text-sm">
                            <span className="font-semibold text-gray-900">
                              {item.cantidad}x
                            </span>{" "}
                            <span className="text-gray-700">
                              {item.productos?.nombre ||
                                item.descripcion_personalizada ||
                                "Producto"}
                            </span>
                            {item.variaciones?.nombre && (
                              <span className="text-gray-400">
                                {" "}({item.variaciones.nombre})
                              </span>
                            )}
                            {item.notas && (
                              <p className="text-xs text-amber-600 ml-5">
                                ✏️ {item.notas}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Notas del pedido */}
                      {pedido.notas && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mb-2">
                          📝 {pedido.notas}
                        </p>
                      )}

                      {/* Fecha de entrega (encargos) */}
                      {pedido.fecha_entrega && (
                        <p className="text-xs text-purple-700 bg-purple-50 rounded-lg p-2 mb-2">
                          📅 Entrega:{" "}
                          {new Date(pedido.fecha_entrega).toLocaleString("es-CO", {
                            timeZone: "America/Bogota",
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      )}

                      {/* Acción */}
                      {accion && (
                        <button
                          onClick={() => cambiarEstado(pedido.id, accion.estado)}
                          disabled={actualizando === pedido.id}
                          className={`w-full py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 ${accion.clase}`}
                        >
                          {actualizando === pedido.id ? "..." : accion.label}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
