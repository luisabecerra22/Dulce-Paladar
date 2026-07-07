import { createClient } from "@/lib/supabase-server";
import { formatoCOP } from "@/lib/formato";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol")
    .eq("user_id", user!.id)
    .single();

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  const { data: pedidosHoy } = await supabase
    .from("pedidos")
    .select("total, estado, medio_pago")
    .gte("creado_en", hoy + "T00:00:00-05:00")
    .lte("creado_en", hoy + "T23:59:59-05:00")
    .in("estado", ["pendiente", "preparacion", "listo", "entregado"]);

  const { data: pedidosActivos } = await supabase
    .from("pedidos")
    .select("id")
    .in("estado", ["pendiente", "preparacion"]);

  const { data: ultimosPedidos } = await supabase
    .from("pedidos")
    .select("numero, tipo, mesa_numero, total, estado, medio_pago, creado_en, clientes(nombre)")
    .order("creado_en", { ascending: false })
    .limit(8);

  const { data: alertasStock } = await supabase
    .from("insumos")
    .select("nombre, stock_actual, stock_minimo, unidad")
    .eq("activo", true);

  const ventasHoy = (pedidosHoy || []).reduce((s, p) => s + p.total, 0);
  const numPedidosHoy = pedidosHoy?.length || 0;
  const pendientes = pedidosActivos?.length || 0;
  const insumoBajo = (alertasStock || []).filter(
    (i) => i.stock_actual <= i.stock_minimo
  );

  const ESTADO_BADGE: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-700",
    preparacion: "bg-blue-100 text-blue-700",
    listo: "bg-green-100 text-green-700",
    entregado: "bg-gray-100 text-gray-500",
    cancelado: "bg-red-100 text-red-600",
  };

  const TIPO_ICON: Record<string, string> = {
    mesa: "🪑",
    recoger: "🛍️",
    domicilio: "🛵",
    encargo: "📋",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900 mb-2">
        Bienvenida, {perfil?.nombre?.split(" ")[0] || "Admin"} 👋
      </h1>
      <p className="text-gray-500 mb-8">
        {new Date().toLocaleDateString("es-CO", {
          timeZone: "America/Bogota",
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Ventas hoy</p>
          <p className="text-2xl font-bold text-primario mt-1">{formatoCOP(ventasHoy)}</p>
          <p className="text-xs text-gray-400 mt-1">{numPedidosHoy} pedidos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Pedidos activos</p>
          <p className="text-2xl font-bold text-secundario mt-1">{pendientes}</p>
          <p className="text-xs text-gray-400 mt-1">
            {pendientes === 0 ? "Todo al día" : "En preparación o pendientes"}
          </p>
        </div>
        {perfil?.rol === "admin" && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Alertas de stock</p>
              <p className={`text-2xl font-bold mt-1 ${insumoBajo.length > 0 ? "text-red-500" : "text-green-600"}`}>
                {insumoBajo.length}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {insumoBajo.length === 0 ? "Todo abastecido" : "Insumos bajo mínimo"}
              </p>
            </div>
            <Link href="/finanzas" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <p className="text-sm text-gray-500">Ver finanzas</p>
              <p className="text-2xl font-bold text-primario mt-1">{formatoCOP(ventasHoy)}</p>
              <p className="text-xs text-gray-400 mt-1">Ir al detalle →</p>
            </Link>
          </>
        )}
      </div>

      {/* Alertas de stock bajo */}
      {insumoBajo.length > 0 && perfil?.rol === "admin" && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-red-700 mb-2">⚠️ Stock bajo</h3>
          <div className="flex flex-wrap gap-2">
            {insumoBajo.map((i) => (
              <span key={i.nombre} className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                {i.nombre}: {i.stock_actual} {i.unidad}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Últimos pedidos */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Últimos pedidos</h2>
          <Link href="/pos" className="text-sm text-primario font-medium hover:underline">
            Ir al POS →
          </Link>
        </div>

        {!ultimosPedidos || ultimosPedidos.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-400 text-sm">
              Aún no hay pedidos. Empieza tomando pedidos desde el POS.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Cliente</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Pago</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ultimosPedidos.map((p) => (
                  <tr key={p.numero} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900">#{p.numero}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {TIPO_ICON[p.tipo] || ""} {p.tipo}
                      {p.mesa_numero ? ` ${p.mesa_numero}` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {(p.clientes as unknown as { nombre: string } | null)?.nombre || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatoCOP(p.total)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 capitalize">
                      {p.medio_pago || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[p.estado] || ""}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {new Date(p.creado_en).toLocaleTimeString("es-CO", {
                        timeZone: "America/Bogota",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
