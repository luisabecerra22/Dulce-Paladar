"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatoCOP } from "@/lib/formato";
import EliminarProductoBtn from "./eliminar-btn";

type Categoria = { id: string; nombre: string };

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

export default function ListaProductos({
  categorias,
  productos,
}: {
  categorias: Categoria[];
  productos: ProductoConRelaciones[];
}) {
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    if (!categoriaFiltro) return productos;
    return productos.filter((p) => p.categoria_id === categoriaFiltro);
  }, [categoriaFiltro, productos]);

  const activos = filtrados.filter((p) => p.activo);
  const inactivos = filtrados.filter((p) => !p.activo);

  function toggleCategoria(id: string) {
    setCategoriaFiltro((prev) => (prev === id ? null : id));
  }

  return (
    <>
      {/* Filtros por categoría */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {categorias.map((cat) => {
          const count = productos.filter(
            (p) => p.categoria_id === cat.id && p.activo
          ).length;
          const seleccionada = categoriaFiltro === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategoria(cat.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors cursor-pointer ${
                seleccionada
                  ? "bg-primario text-white border border-primario font-semibold"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-primario hover:text-primario"
              }`}
            >
              {cat.nombre} ({count})
            </button>
          );
        })}
        {categoriaFiltro && (
          <button
            onClick={() => setCategoriaFiltro(null)}
            className="ml-auto px-3 py-1 rounded-full text-sm text-gray-500 hover:text-primario hover:bg-primario/5 transition-colors flex items-center gap-1"
          >
            ✕ Limpiar filtro
          </button>
        )}
      </div>

      {/* Sin resultados */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">
            {categoriaFiltro
              ? "No hay productos en esta categoría"
              : "No hay productos aún"}
          </p>
          {categoriaFiltro ? (
            <button
              onClick={() => setCategoriaFiltro(null)}
              className="text-primario text-sm font-medium hover:underline"
            >
              Ver todos los productos
            </button>
          ) : (
            <Link
              href="/catalogo/nuevo"
              className="inline-block px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
            >
              + Crear primer producto
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Productos activos */}
          {activos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activos.map((producto) => (
                <TarjetaProducto key={producto.id} producto={producto} />
              ))}
            </div>
          )}

          {/* Productos inactivos / sin stock */}
          {inactivos.length > 0 && (
            <div className={activos.length > 0 ? "mt-10" : ""}>
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
                  <TarjetaProducto key={producto.id} producto={producto} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
