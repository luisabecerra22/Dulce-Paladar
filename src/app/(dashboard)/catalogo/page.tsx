import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import ListaProductos from "./lista-productos";

export default async function CatalogoPage() {
  const supabase = await createClient();

  const [{ data: categorias }, { data: productos }, { data: itemsVentas }] =
    await Promise.all([
      supabase.from("categorias").select("id, nombre").eq("activa", true).order("orden"),
      supabase.from("productos").select("*, categorias(nombre), variaciones(*)").order("nombre"),
      supabase.from("pedido_items").select("producto_id, cantidad"),
    ]);

  // Calcular el producto más vendido
  let masVendidoId: string | null = null;
  if (itemsVentas && itemsVentas.length > 0) {
    const conteo: Record<string, number> = {};
    for (const item of itemsVentas) {
      if (item.producto_id) {
        conteo[item.producto_id] = (conteo[item.producto_id] || 0) + (item.cantidad || 1);
      }
    }
    const top = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
    if (top) masVendidoId = top[0];
  }

  const activos = productos?.filter((p) => p.activo).length || 0;
  const inactivos = productos?.filter((p) => !p.activo).length || 0;
  const enPromocion = productos?.filter((p) => p.en_promocion).length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900">
            Catálogo
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {activos} activos · {inactivos} sin stock
            {enPromocion > 0 && (
              <span className="ml-2 text-[#F400A1] font-medium">· {enPromocion} en promoción</span>
            )}
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
        masVendidoId={masVendidoId}
      />
    </div>
  );
}
