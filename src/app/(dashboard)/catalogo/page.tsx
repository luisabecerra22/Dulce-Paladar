import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import ListaProductos from "./lista-productos";

export default async function CatalogoPage() {
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("activa", true)
    .order("orden");

  const { data: productos } = await supabase
    .from("productos")
    .select("*, categorias(nombre), variaciones(*)")
    .order("nombre");

  const activos = productos?.filter((p) => p.activo).length || 0;
  const inactivos = productos?.filter((p) => !p.activo).length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900">
            Catálogo
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {activos} activos · {inactivos} sin stock
          </p>
        </div>
        <Link
          href="/catalogo/nuevo"
          className="px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
        >
          + Nuevo producto
        </Link>
      </div>

      <ListaProductos
        categorias={categorias || []}
        productos={productos || []}
      />
    </div>
  );
}
