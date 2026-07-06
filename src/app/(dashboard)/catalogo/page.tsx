import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { formatoCOP } from "@/lib/formato";
import EliminarProductoBtn from "./eliminar-btn";

export default async function CatalogoPage() {
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .eq("activa", true)
    .order("orden");

  const { data: productos } = await supabase
    .from("productos")
    .select("*, categorias(nombre), variaciones(*)")
    .order("nombre");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900">
            Catálogo
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {productos?.length || 0} productos
          </p>
        </div>
        <Link
          href="/catalogo/nuevo"
          className="px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
        >
          + Nuevo producto
        </Link>
      </div>

      {/* Filtros por categoría */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categorias?.map((cat) => {
          const count = productos?.filter((p) => p.categoria_id === cat.id).length || 0;
          return (
            <span
              key={cat.id}
              className="px-3 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-600"
            >
              {cat.nombre} ({count})
            </span>
          );
        })}
      </div>

      {/* Lista de productos */}
      {!productos || productos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">No hay productos aún</p>
          <p className="text-gray-400 text-sm mb-4">
            Empieza agregando tu primer producto al catálogo
          </p>
          <Link
            href="/catalogo/nuevo"
            className="px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
          >
            + Crear primer producto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {productos.map((producto) => (
            <div
              key={producto.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Foto */}
              <div className="h-40 bg-gray-100 flex items-center justify-center">
                {producto.foto_url ? (
                  <img
                    src={producto.foto_url}
                    alt={producto.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">🧁</span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {producto.nombre}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      producto.activo
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {producto.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-2">
                  {(producto.categorias as { nombre: string })?.nombre} · {producto.tipo}
                </p>

                {/* Precio */}
                {producto.tipo === "simple" && (
                  <p className="text-lg font-bold text-primario">
                    {formatoCOP(producto.precio_base)}
                  </p>
                )}
                {producto.tipo === "variaciones" && producto.variaciones && (
                  <p className="text-sm text-primario font-semibold">
                    Desde{" "}
                    {formatoCOP(
                      Math.min(
                        ...(producto.variaciones as { precio: number }[]).map(
                          (v) => v.precio
                        )
                      )
                    )}
                  </p>
                )}
                {producto.tipo === "personalizado" && (
                  <p className="text-sm text-secundario font-semibold">
                    Precio a cotizar
                  </p>
                )}

                {/* Acciones */}
                <div className="flex gap-2 mt-3">
                  <Link
                    href={`/catalogo/${producto.id}`}
                    className="flex-1 text-center px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Editar
                  </Link>
                  <EliminarProductoBtn id={producto.id} nombre={producto.nombre} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
