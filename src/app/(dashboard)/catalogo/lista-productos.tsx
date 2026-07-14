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
  en_promocion: boolean;
  descuento_porcentaje: number;
  categorias: { nombre: string } | null;
  variaciones: { precio: number }[];
};

function BadgeMasVendido() {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-amber-900 shadow-sm">
      ⭐ Más vendido
    </span>
  );
}

function BadgePromocion({ pct }: { pct: number }) {
  return (
    <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-[#F400A1] text-white shadow-sm">
      🏷️ -{pct}%
    </span>
  );
}

function TarjetaProducto({
  producto,
  esMasVendido,
}: {
  producto: ProductoConRelaciones;
  esMasVendido: boolean;
}) {
  const inactivo = !producto.activo;
  const precioConDescuento =
    producto.en_promocion && producto.precio_base && producto.descuento_porcentaje > 0
      ? Math.round(producto.precio_base * (1 - producto.descuento_porcentaje / 100))
      : null;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-shadow relative ${
        inactivo
          ? "bg-gray-50 border-gray-200 opacity-60"
          : producto.en_promocion
          ? "bg-white border-[#F400A1]/40 hover:shadow-md ring-1 ring-[#F400A1]/20"
          : "bg-white border-gray-200 hover:shadow-md"
      }`}
    >
      {/* Badges superpuestos sobre la imagen */}
      {(esMasVendido || producto.en_promocion) && (
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {esMasVendido && <BadgeMasVendido />}
          {producto.en_promocion && producto.descuento_porcentaje > 0 && (
            <BadgePromocion pct={producto.descuento_porcentaje} />
          )}
        </div>
      )}

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
        <div className="flex items-start justify-between mb-1 gap-1">
          <h3 className={`font-semibold text-sm ${inactivo ? "text-gray-500" : "text-gray-900"}`}>
            {producto.nombre}
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${
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
          <div>
            {precioConDescuento ? (
              <div className="flex items-baseline gap-2">
                <p className={`text-lg font-bold text-[#F400A1]`}>
                  {formatoCOP(precioConDescuento)}
                </p>
                <p className="text-sm text-gray-400 line-through">
                  {formatoCOP(producto.precio_base)}
                </p>
              </div>
            ) : (
              <p className={`text-lg font-bold ${inactivo ? "text-gray-400" : "text-primario"}`}>
                {formatoCOP(producto.precio_base)}
              </p>
            )}
          </div>
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

type Vista = "todos" | "promociones";

export default function ListaProductos({
  categorias,
  productos,
  masVendidoId,
}: {
  categorias: Categoria[];
  productos: ProductoConRelaciones[];
  masVendidoId: string | null;
}) {
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("todos");

  const filtradosPorVista = useMemo(() => {
    if (vista === "promociones") return productos.filter((p) => p.en_promocion);
    return productos;
  }, [vista, productos]);

  const filtrados = useMemo(() => {
    if (!categoriaFiltro) return filtradosPorVista;
    return filtradosPorVista.filter((p) => p.categoria_id === categoriaFiltro);
  }, [categoriaFiltro, filtradosPorVista]);

  const activos = filtrados.filter((p) => p.activo);
  const inactivos = filtrados.filter((p) => !p.activo);
  const totalPromocion = productos.filter((p) => p.en_promocion).length;

  function toggleCategoria(id: string) {
    setCategoriaFiltro((prev) => (prev === id ? null : id));
  }

  return (
    <>
      {/* Tabs: Todos / Promociones */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setVista("todos"); setCategoriaFiltro(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            vista === "todos"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Todos los productos
        </button>
        <button
          onClick={() => { setVista("promociones"); setCategoriaFiltro(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            vista === "promociones"
              ? "bg-[#F400A1] text-white shadow-sm"
              : "text-gray-500 hover:text-[#F400A1]"
          }`}
        >
          🏷️ Promociones
          {totalPromocion > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              vista === "promociones" ? "bg-white/20 text-white" : "bg-[#F400A1]/10 text-[#F400A1]"
            }`}>
              {totalPromocion}
            </span>
          )}
        </button>
      </div>

      {/* Filtros por categoría */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {categorias.map((cat) => {
          const count = filtradosPorVista.filter(
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
          {vista === "promociones" ? (
            <>
              <p className="text-3xl mb-3">🏷️</p>
              <p className="text-gray-500 font-medium mb-1">No hay productos en promoción</p>
              <p className="text-gray-400 text-sm">
                Edita un producto y activa la opción &quot;En promoción&quot; para que aparezca aquí.
              </p>
            </>
          ) : (
            <div>
              <p className="text-gray-400 text-lg mb-2">
                {categoriaFiltro ? "No hay productos en esta categoría" : "No hay productos aún"}
              </p>
              {!categoriaFiltro && (
                <Link
                  href="/catalogo/nuevo"
                  className="inline-block px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
                >
                  + Crear primer producto
                </Link>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Productos activos */}
          {activos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activos.map((producto) => (
                <TarjetaProducto
                  key={producto.id}
                  producto={producto}
                  esMasVendido={producto.id === masVendidoId}
                />
              ))}
            </div>
          )}

          {/* Productos inactivos / sin stock */}
          {inactivos.length > 0 && (
            <div className={activos.length > 0 ? "mt-10" : ""}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-500">Sin stock / Inactivos</h2>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-gray-400">
                  {inactivos.length} {inactivos.length === 1 ? "producto" : "productos"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inactivos.map((producto) => (
                  <TarjetaProducto
                    key={producto.id}
                    producto={producto}
                    esMasVendido={producto.id === masVendidoId}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
