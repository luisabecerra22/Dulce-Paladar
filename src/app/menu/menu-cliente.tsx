"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

type Config = {
  nombre: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  logo_url: string | null;
  pagina_web: string | null;
  email: string | null;
};

type Categoria = { id: string; nombre: string; orden: number };

type Variacion = { id: string; nombre: string; precio: number };

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  precio_base: number | null;
  foto_url: string | null;
  en_promocion: boolean;
  descuento_porcentaje: number;
  categorias: { nombre: string; id: string } | null;
  variaciones: Variacion[];
};

function formatCOP(valor: number | null) {
  if (!valor) return "$ 0";
  return "$ " + valor.toLocaleString("es-CO");
}

function WhatsAppBtn({ telefono, texto }: { telefono: string; texto: string }) {
  const num = telefono.replace(/\D/g, "");
  const url = `https://wa.me/57${num}?text=${encodeURIComponent(texto)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-md"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      Pedir por WhatsApp
    </a>
  );
}

function TarjetaProducto({
  producto,
  esMasVendido,
  telefono,
}: {
  producto: Producto;
  esMasVendido: boolean;
  telefono: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const precioMin =
    producto.tipo === "variaciones" && producto.variaciones.length > 0
      ? Math.min(...producto.variaciones.map((v) => v.precio))
      : null;

  const precioConDescuento =
    producto.en_promocion && producto.precio_base && producto.descuento_porcentaje > 0
      ? Math.round(producto.precio_base * (1 - producto.descuento_porcentaje / 100))
      : null;

  const mensajeWA = `Hola, me interesa pedir *${producto.nombre}*${precioConDescuento ? ` (promoción ${producto.descuento_porcentaje}% off)` : ""}. ¿Tiene disponibilidad?`;

  return (
    <div
      className={`rounded-2xl overflow-hidden bg-white shadow-sm border transition-all duration-200 hover:shadow-lg ${
        producto.en_promocion ? "border-[#F400A1]/30" : "border-gray-100"
      }`}
    >
      {/* Imagen */}
      <div className="relative h-48 bg-gradient-to-br from-[#fdf0f8] to-[#f3e8ff]">
        {producto.foto_url ? (
          <img
            src={producto.foto_url}
            alt={producto.nombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🧁</div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {esMasVendido && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-900 shadow-sm">
              ⭐ Más vendido
            </span>
          )}
          {producto.en_promocion && producto.descuento_porcentaje > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F400A1] text-white shadow-sm">
              🏷️ -{producto.descuento_porcentaje}% OFF
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base mb-1">{producto.nombre}</h3>

        {producto.descripcion && (
          <p className="text-gray-500 text-sm mb-3 leading-relaxed line-clamp-2">
            {producto.descripcion}
          </p>
        )}

        {/* Precio */}
        <div className="mb-3">
          {producto.tipo === "simple" && (
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-bold ${producto.en_promocion && precioConDescuento ? "text-[#F400A1]" : "text-[#C273E0]"}`}>
                {formatCOP(precioConDescuento ?? producto.precio_base)}
              </span>
              {precioConDescuento && (
                <span className="text-sm text-gray-400 line-through">
                  {formatCOP(producto.precio_base)}
                </span>
              )}
            </div>
          )}
          {producto.tipo === "variaciones" && precioMin !== null && (
            <div>
              <span className="text-lg font-bold text-[#C273E0]">
                Desde {formatCOP(precioMin)}
              </span>
              <button
                onClick={() => setExpanded(!expanded)}
                className="block text-xs text-[#F400A1] mt-1 hover:underline"
              >
                {expanded ? "Ocultar opciones ▲" : "Ver opciones ▼"}
              </button>
              {expanded && (
                <div className="mt-2 space-y-1">
                  {producto.variaciones.map((v) => (
                    <div key={v.id} className="flex justify-between text-sm bg-[#fdf0f8] rounded-lg px-3 py-1.5">
                      <span className="text-gray-700">{v.nombre}</span>
                      <span className="font-semibold text-[#C273E0]">{formatCOP(v.precio)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {producto.tipo === "personalizado" && (
            <span className="text-base font-semibold text-[#C273E0]">Precio a cotizar</span>
          )}
        </div>

        {/* Botón WhatsApp */}
        <a
          href={`https://wa.me/57${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(mensajeWA)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 bg-[#F400A1] hover:bg-[#d4008a] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Pedir este producto
        </a>
      </div>
    </div>
  );
}

export default function MenuCliente({
  config,
  categorias,
  productos,
  masVendidoId,
}: {
  config: Config | null;
  categorias: Categoria[];
  productos: Producto[];
  masVendidoId: string | null;
}) {
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const productosFiltrados = useMemo(() => {
    let lista = productos;
    if (categoriaActiva) lista = lista.filter((p) => p.categorias?.id === categoriaActiva);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter((p) => p.nombre.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q));
    }
    return lista;
  }, [productos, categoriaActiva, busqueda]);

  const enPromocion = productos.filter((p) => p.en_promocion);
  const telefono = config?.telefono || "3156192968";
  const nombre = config?.nombre || "Dulce Paladar";

  const categoriasConProductos = categorias.filter((cat) =>
    productos.some((p) => p.categorias?.id === cat.id)
  );

  return (
    <div className="min-h-screen bg-[#fdf8ff]" style={{ fontFamily: "var(--font-secundaria)" }}>

      {/* ── HEADER ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#3b0764] via-[#6b21a8] to-[#C273E0]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-[#F400A1] blur-3xl" />
          <div className="absolute bottom-0 right-10 w-56 h-56 rounded-full bg-[#FFD700] blur-3xl" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 text-center">
          {config?.logo_url ? (
            <img
              src={config.logo_url}
              alt={nombre}
              className="w-24 h-24 object-contain mx-auto mb-4 drop-shadow-xl rounded-full bg-white/10 p-1"
            />
          ) : (
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center text-5xl">
              🎂
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-principal)" }}>
            {nombre}
          </h1>
          <p className="text-white/80 text-sm md:text-base mb-6">
            Repostería artesanal hecha con amor 🩷
            {config?.ciudad && ` · ${config.ciudad}`}
          </p>
          <WhatsAppBtn
            telefono={telefono}
            texto={`Hola ${nombre}! Me gustaría hacer un pedido.`}
          />
        </div>
      </header>

      {/* ── BANNER PROMOCIONES ── */}
      {enPromocion.length > 0 && (
        <div className="bg-[#F400A1] text-white text-center py-3 px-4 text-sm font-semibold">
          🏷️ {enPromocion.length === 1
            ? `¡${enPromocion[0].nombre} está en promoción!`
            : `¡Tenemos ${enPromocion.length} productos en promoción!`
          } · Desplázate para verlos
        </div>
      )}

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* Búsqueda */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C273E0] text-sm"
          />
        </div>

        {/* Categorías */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setCategoriaActiva(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !categoriaActiva
                ? "bg-[#C273E0] text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:border-[#C273E0]"
            }`}
          >
            Todos ({productos.length})
          </button>
          {categoriasConProductos.map((cat) => {
            const count = productos.filter((p) => p.categorias?.id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id === categoriaActiva ? null : cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  categoriaActiva === cat.id
                    ? "bg-[#C273E0] text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-[#C273E0]"
                }`}
              >
                {cat.nombre} ({count})
              </button>
            );
          })}
        </div>

        {/* Grid de productos */}
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 font-medium">No encontramos productos</p>
            <button onClick={() => { setCategoriaActiva(null); setBusqueda(""); }} className="mt-3 text-[#F400A1] text-sm hover:underline">
              Ver todos los productos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {productosFiltrados.map((producto) => (
              <TarjetaProducto
                key={producto.id}
                producto={producto}
                esMasVendido={producto.id === masVendidoId}
                telefono={telefono}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1a0535] text-white mt-16 py-10 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-bold text-lg mb-1" style={{ fontFamily: "var(--font-principal)" }}>
            {nombre}
          </p>
          {config?.direccion && (
            <p className="text-white/60 text-sm mb-4">
              📍 {config.direccion}{config.ciudad ? `, ${config.ciudad}` : ""}
            </p>
          )}
          <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
            <a
              href={`https://wa.me/57${telefono.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#25D366] hover:text-[#20b858] text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            <a
              href="https://www.instagram.com/dulce.paladar27/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#C273E0] hover:text-[#F400A1] text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              @dulce.paladar27
            </a>
          </div>
          <p className="text-white/30 text-xs">
            Hecho con 💜 · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
