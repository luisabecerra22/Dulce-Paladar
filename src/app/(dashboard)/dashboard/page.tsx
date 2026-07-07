import { createClient } from "@/lib/supabase-server";
import { formatoCOP } from "@/lib/formato";
import Link from "next/link";

function KpiCard({
  titulo,
  valor,
  subtitulo,
  icono,
  variante,
}: {
  titulo: string;
  valor: string;
  subtitulo: string;
  icono: React.ReactNode;
  variante: "rosa" | "lila" | "verde" | "azul" | "cafe";
}) {
  const bg: Record<string, string> = {
    rosa: "bg-rosa-suave",
    lila: "bg-secundario-claro/20",
    verde: "bg-green-50",
    azul: "bg-blue-50",
    cafe: "bg-crema-oscuro",
  };
  const iconBg: Record<string, string> = {
    rosa: "bg-primario/10 text-primario",
    lila: "bg-secundario/10 text-secundario",
    verde: "bg-green-100 text-green-600",
    azul: "bg-blue-100 text-blue-600",
    cafe: "bg-cafe/10 text-cafe",
  };

  return (
    <div className="bg-white rounded-2xl border border-crema-oscuro p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-cafe">{titulo}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg[variante]}`}>
          {icono}
        </div>
      </div>
      <p className="text-3xl font-bold text-cafe-oscuro tracking-tight">{valor}</p>
      <div className={`mt-3 px-3 py-1.5 rounded-lg inline-block ${bg[variante]}`}>
        <p className="text-xs font-medium text-cafe">{subtitulo}</p>
      </div>
    </div>
  );
}

function ChartCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-crema-oscuro p-5">
      <h3 className="text-sm font-semibold text-cafe-oscuro mb-4">{titulo}</h3>
      {children}
    </div>
  );
}

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
    .limit(10);

  const { data: alertasStock } = await supabase
    .from("insumos")
    .select("nombre, stock_actual, stock_minimo, unidad")
    .eq("activo", true);

  const { data: productosActivos } = await supabase
    .from("productos")
    .select("id")
    .eq("activo", true);

  const completados = (pedidosHoy || []).filter((p) => p.estado !== "cancelado");
  const ventasHoy = completados.reduce((s, p) => s + p.total, 0);
  const efectivoHoy = completados.filter((p) => p.medio_pago === "efectivo").reduce((s, p) => s + p.total, 0);
  const transferenciaHoy = completados.filter((p) => p.medio_pago === "transferencia").reduce((s, p) => s + p.total, 0);
  const pendientes = pedidosActivos?.length || 0;
  const insumoBajo = (alertasStock || []).filter((i) => i.stock_actual <= i.stock_minimo);

  const ESTADO: Record<string, { label: string; clase: string }> = {
    pendiente: { label: "Pendiente", clase: "bg-amber-100 text-amber-700" },
    preparacion: { label: "Preparando", clase: "bg-blue-100 text-blue-700" },
    listo: { label: "Listo", clase: "bg-green-100 text-green-700" },
    entregado: { label: "Entregado", clase: "bg-gray-100 text-gray-500" },
    cancelado: { label: "Cancelado", clase: "bg-red-100 text-red-600" },
  };

  const TIPO_LABEL: Record<string, string> = {
    mesa: "Mesa",
    recoger: "Recoger",
    domicilio: "Domicilio",
    encargo: "Encargo",
  };

  return (
    <div>
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-cafe-oscuro">
          Bienvenida, {perfil?.nombre?.split(" ")[0] || "Admin"}
        </h1>
        <p className="text-sm text-cafe mt-1">
          Resumen del negocio para hoy
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          titulo="Ventas del día"
          valor={formatoCOP(ventasHoy)}
          subtitulo={`${completados.length} pedidos completados`}
          variante="rosa"
          icono={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          titulo="Pedidos activos"
          valor={String(pendientes)}
          subtitulo={pendientes === 0 ? "Sin pedidos pendientes" : "En preparación o por despachar"}
          variante="lila"
          icono={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <KpiCard
          titulo="Productos activos"
          valor={String(productosActivos?.length || 0)}
          subtitulo={`${insumoBajo.length} insumos con stock bajo`}
          variante={insumoBajo.length > 0 ? "cafe" : "verde"}
          icono={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        {perfil?.rol === "admin" && (
          <KpiCard
            titulo="Efectivo / Transfer."
            valor={formatoCOP(efectivoHoy)}
            subtitulo={`Transferencias: ${formatoCOP(transferenciaHoy)}`}
            variante="azul"
            icono={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        )}
      </div>

      {/* Fila de gráficas / resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Accesos rápidos */}
        <ChartCard titulo="Acciones rápidas">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/pos"
              className="flex items-center gap-2 p-3 rounded-xl bg-primario/5 hover:bg-primario/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primario/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-primario" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-cafe-oscuro">Nuevo pedido</span>
            </Link>
            <Link
              href="/catalogo/nuevo"
              className="flex items-center gap-2 p-3 rounded-xl bg-secundario/5 hover:bg-secundario/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-secundario/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-secundario" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-cafe-oscuro">Nuevo producto</span>
            </Link>
            <Link
              href="/cocina"
              className="flex items-center gap-2 p-3 rounded-xl bg-crema-oscuro hover:bg-crema-oscuro/70 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-cafe/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-cafe" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-cafe-oscuro">Ver comandas</span>
            </Link>
            {perfil?.rol === "admin" && (
              <Link
                href="/finanzas"
                className="flex items-center gap-2 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-cafe-oscuro">Finanzas</span>
              </Link>
            )}
          </div>
        </ChartCard>

        {/* Ventas por medio de pago */}
        <ChartCard titulo="Ventas por medio de pago">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-cafe">Efectivo</span>
                <span className="font-semibold text-cafe-oscuro">{formatoCOP(efectivoHoy)}</span>
              </div>
              <div className="h-2 bg-crema-oscuro rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: ventasHoy > 0 ? `${(efectivoHoy / ventasHoy) * 100}%` : "0%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-cafe">Transferencia</span>
                <span className="font-semibold text-cafe-oscuro">{formatoCOP(transferenciaHoy)}</span>
              </div>
              <div className="h-2 bg-crema-oscuro rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: ventasHoy > 0 ? `${(transferenciaHoy / ventasHoy) * 100}%` : "0%" }}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-crema-oscuro">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-cafe">Total</span>
                <span className="font-bold text-primario text-lg">{formatoCOP(ventasHoy)}</span>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Alertas */}
        <ChartCard titulo="Alertas del negocio">
          <div className="space-y-2">
            {insumoBajo.length > 0 ? (
              insumoBajo.map((i) => (
                <div key={i.nombre} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700 flex-1">
                    <span className="font-semibold">{i.nombre}</span>: {i.stock_actual} {i.unidad}
                  </span>
                </div>
              ))
            ) : pendientes > 0 ? (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-sm text-amber-700">
                  {pendientes} pedido{pendientes > 1 ? "s" : ""} en espera
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-sm text-green-700 font-medium">
                  Todo al día — sin alertas
                </span>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Tabla de últimos pedidos */}
      <div className="bg-white rounded-2xl border border-crema-oscuro overflow-hidden">
        <div className="px-5 py-4 flex justify-between items-center border-b border-crema-oscuro">
          <h3 className="font-semibold text-cafe-oscuro">Últimos pedidos</h3>
          <Link href="/pos" className="text-sm text-primario font-medium hover:underline">
            Ir al POS →
          </Link>
        </div>

        {!ultimosPedidos || ultimosPedidos.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-cafe text-sm">Aún no hay pedidos. Crea uno desde el POS.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-crema/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-cafe text-xs uppercase tracking-wider">Pedido</th>
                  <th className="text-left px-4 py-3 font-semibold text-cafe text-xs uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-cafe text-xs uppercase tracking-wider">Cliente</th>
                  <th className="text-right px-4 py-3 font-semibold text-cafe text-xs uppercase tracking-wider">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-cafe text-xs uppercase tracking-wider">Pago</th>
                  <th className="text-center px-4 py-3 font-semibold text-cafe text-xs uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 py-3 font-semibold text-cafe text-xs uppercase tracking-wider">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crema-oscuro">
                {ultimosPedidos.map((p) => (
                  <tr key={p.numero} className="hover:bg-crema/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-cafe-oscuro">#{p.numero}</td>
                    <td className="px-4 py-3 text-cafe">
                      {TIPO_LABEL[p.tipo] || p.tipo}
                      {p.mesa_numero ? ` ${p.mesa_numero}` : ""}
                    </td>
                    <td className="px-4 py-3 text-cafe">
                      {(p.clientes as unknown as { nombre: string } | null)?.nombre || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-cafe-oscuro">
                      {formatoCOP(p.total)}
                    </td>
                    <td className="px-4 py-3 text-center text-cafe capitalize text-xs">
                      {p.medio_pago || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO[p.estado]?.clase || ""}`}>
                        {ESTADO[p.estado]?.label || p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-cafe text-xs">
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
