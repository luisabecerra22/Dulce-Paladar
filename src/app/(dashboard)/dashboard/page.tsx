import { createClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol")
    .eq("user_id", user!.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900 mb-2">
        Bienvenida, {perfil?.nombre?.split(" ")[0]} 👋
      </h1>
      <p className="text-gray-500 mb-8">
        Panel de control de Dulce Paladar
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo="Ventas hoy"
          valor="$0"
          descripcion="0 pedidos"
          color="primario"
        />
        <TarjetaResumen
          titulo="Pedidos pendientes"
          valor="0"
          descripcion="Sin pedidos activos"
          color="secundario"
        />
        <TarjetaResumen
          titulo="Producto más vendido"
          valor="—"
          descripcion="Sin datos aún"
          color="primario"
        />
        {perfil?.rol === "admin" && (
          <TarjetaResumen
            titulo="Ganancia del día"
            valor="$0"
            descripcion="Margen bruto"
            color="secundario"
          />
        )}
      </div>

      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimos pedidos</h2>
        <p className="text-gray-500 text-sm">
          Aún no hay pedidos. Empieza creando productos en el catálogo y tomando pedidos desde el POS.
        </p>
      </div>
    </div>
  );
}

function TarjetaResumen({
  titulo,
  valor,
  descripcion,
  color,
}: {
  titulo: string;
  valor: string;
  descripcion: string;
  color: "primario" | "secundario";
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className={`text-2xl font-bold mt-1 ${color === "primario" ? "text-primario" : "text-secundario"}`}>
        {valor}
      </p>
      <p className="text-xs text-gray-400 mt-1">{descripcion}</p>
    </div>
  );
}
