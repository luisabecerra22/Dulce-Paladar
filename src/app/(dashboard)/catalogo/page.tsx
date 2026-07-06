import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { formatoCOP } from "@/lib/formato";
import EliminarProductoBtn from "./eliminar-btn";

type ProductoConRelaciones = {
  id: string;
  categoria_id: string;
  nombre: string;
  tipo: string;
  precio_base: number | null;
  foto_url: string | null;
  activo: boolean;
  categorias: { nombre: string } | null;
  variaciones: { precio: number }[];
};

function TarjetaProducto({ producto }: { producto: ProductoConRelaciones }) {
  const inactivo = !producto.activo;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-shadow ${
        inactivo
          ? "bg-gray-50 border-gray-200 opacity-60"
          : "bg-white border-gray-200 hover:shadow-md"
      }`}
    >
      <div className={`h-40 flex items-center justify-center ${inactivo ? "bg-gray-100 grayscale" : "bg-gray-100"}`}>
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

      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className={`font-semibold text-sm ${inactivo ? "text-gray-500" : "text-gray-900"}`}>
            {producto.nombre}
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              producto.activo
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            }`}
          >
            {producto.activo ? "Activo" : "Sin stock"}
          </span>
        </div>

        <p className="text-xs text-gray-400 mb-2">
          {producto.categorias?.nombre} · {producto.tipo}
        </p>

        {producto.tipo === "simple" && (
          <p className={`text-lg font-bold ${inactivo ? "text-gray-400" : "text-primario"}`}>
            {formatoCOP(producto.precio_base)}
          </p>
        )}
        {producto.tipo === "variaciones" && producto.variaciones?.length > 0 && (
          <p className={`text-sm font-semibold ${inactivo ? "text-gray-400" : "text-primario"}`}>
            Desde {formatoCOP(Math.min(...producto.variaciones.map((v) => v.precio)))}
          </p>
        )}
        {producto.tipo === "personalizado" && (
          <p className={`text-sm font-semibold ${inactivo ? "text-gray-400" : "text-secundario"}`}>
            Precio a cotizar
          </p>
        )}

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
  );
}

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

  const activos = productos?.filter((p) => p.activo) || [];
  const inactivos = productos?.filter((p) => !p.activo) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900">
            Catálogo
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {activos.length} activos · {inactivos.length} sin stock
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
          const count = activos.filter((p) => p.categoria_id === cat.id).length;
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

      {/* Productos activos */}
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
        <>
          {activos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activos.map((producto) => (
                <TarjetaProducto key={producto.id} producto={producto as ProductoConRelaciones} />
              ))}
            </div>
          )}

          {inactivos.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-500">
                  Sin stock / Inactivos
                </h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-gray-400">
                  {inactivos.length} {inactivos.length === 1 ? "producto" : "productos"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inactivos.map((producto) => (
                  <TarjetaProducto key={producto.id} producto={producto as ProductoConRelaciones} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
