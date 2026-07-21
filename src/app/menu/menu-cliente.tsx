"use client";

import { useState, useMemo } from "react";

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

type ItemCarrito = {
  key: string;
  productoId: string;
  nombre: string;
  variacionNombre?: string;
  precio: number;
  cantidad: number;
};

function formatCOP(valor: number) {
  return "$ " + valor.toLocaleString("es-CO");
}

// ── CARRITO DRAWER ──
function CarritoDrawer({
  items,
  onCerrar,
  onCambiarCantidad,
  onEliminar,
  telefono,
  negocio,
}: {
  items: ItemCarrito[];
  onCerrar: () => void;
  onCambiarCantidad: (key: string, delta: number) => void;
  onEliminar: (key: string) => void;
  telefono: string;
  negocio: string;
}) {
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  function enviarWhatsApp() {
    const lineas = items.map(
      (i) =>
        `• ${i.cantidad}x ${i.nombre}${i.variacionNombre ? ` (${i.variacionNombre})` : ""} — ${formatCOP(i.precio * i.cantidad)}`
    );
    const mensaje = [
      `Hola ${negocio}! Me gustaría hacer el siguiente pedido:`,
      "",
      ...lineas,
      "",
      `*Total estimado: ${formatCOP(total)}*`,
      "",
      "¿Tienen disponibilidad?",
    ].join("\n");

    const num = telefono.replace(/\D/g, "");
    window.open(`https://wa.me/57${num}?text=${encodeURIComponent(mensaje)}`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Fondo oscuro */}
      <div className="flex-1 bg-black/40" onClick={onCerrar} />

      {/* Panel */}
      <div className="w-full max-w-sm bg-white flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">Mi pedido</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🛒</p>
              <p className="font-medium">Tu pedido está vacío</p>
              <p className="text-sm mt-1">Agrega productos del menú</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.key} className="flex items-center gap-3 bg-[#fdf8ff] rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.nombre}</p>
                  {item.variacionNombre && (
                    <p className="text-xs text-gray-500">{item.variacionNombre}</p>
                  )}
                  <p className="text-sm font-bold text-[#C273E0] mt-0.5">{formatCOP(item.precio)}</p>
                </div>
                {/* Controles cantidad */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onCambiarCantidad(item.key, -1)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm transition-colors"
                  >−</button>
                  <span className="w-5 text-center font-bold text-gray-900 text-sm">{item.cantidad}</span>
                  <button
                    onClick={() => onCambiarCantidad(item.key, 1)}
                    className="w-7 h-7 rounded-full bg-[#C273E0]/20 hover:bg-[#C273E0]/30 flex items-center justify-center text-[#C273E0] font-bold text-sm transition-colors"
                  >+</button>
                </div>
                <button
                  onClick={() => onEliminar(item.key)}
                  className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Total estimado</span>
              <span className="text-xl font-bold text-[#F400A1]">{formatCOP(total)}</span>
            </div>
            <button
              onClick={enviarWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white font-bold py-3.5 rounded-xl transition-colors text-base shadow-md"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Enviar pedido por WhatsApp
            </button>
            <p className="text-center text-xs text-gray-400">
              Te contactaremos para confirmar disponibilidad y pago
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MODAL VARIACIONES ──
function ModalVariaciones({
  producto,
  onAgregar,
  onCerrar,
}: {
  producto: Producto;
  onAgregar: (variacion: Variacion) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl">
        <h3 className="font-bold text-gray-900 mb-1">{producto.nombre}</h3>
        <p className="text-sm text-gray-500 mb-4">Elige una opción:</p>
        <div className="space-y-2">
          {producto.variaciones.map((v) => (
            <button
              key={v.id}
              onClick={() => onAgregar(v)}
              className="w-full flex justify-between items-center px-4 py-3 rounded-xl border-2 border-gray-100 hover:border-[#C273E0] hover:bg-[#fdf0f8] transition-all text-left"
            >
              <span className="font-medium text-gray-800">{v.nombre}</span>
              <span className="font-bold text-[#C273E0]">{formatCOP(v.precio)}</span>
            </button>
          ))}
        </div>
        <button onClick={onCerrar} className="w-full mt-3 py-2 text-sm text-gray-400 hover:text-gray-600">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── TARJETA PRODUCTO ──
function TarjetaProducto({
  producto,
  esMasVendido,
  onAgregar,
}: {
  producto: Producto;
  esMasVendido: boolean;
  onAgregar: (producto: Producto, variacion?: Variacion) => void;
}) {
  const [mostrarVariaciones, setMostrarVariaciones] = useState(false);

  const precioMin =
    producto.tipo === "variaciones" && producto.variaciones.length > 0
      ? Math.min(...producto.variaciones.map((v) => v.precio))
      : null;

  const precioConDescuento =
    producto.en_promocion && producto.precio_base && producto.descuento_porcentaje > 0
      ? Math.round(producto.precio_base * (1 - producto.descuento_porcentaje / 100))
      : null;

  function handleAgregar() {
    if (producto.tipo === "variaciones") {
      setMostrarVariaciones(true);
    } else {
      onAgregar(producto);
    }
  }

  return (
    <>
      <div className={`rounded-2xl overflow-hidden bg-white shadow-sm border transition-all duration-200 hover:shadow-lg ${producto.en_promocion ? "border-[#F400A1]/30" : "border-gray-100"}`}>
        {/* Imagen */}
        <div className="relative h-44 bg-gradient-to-br from-[#fdf0f8] to-[#f3e8ff]">
          {producto.foto_url ? (
            <img src={producto.foto_url} alt={producto.nombre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🧁</div>
          )}
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
            <p className="text-gray-500 text-sm mb-3 line-clamp-2 leading-relaxed">{producto.descripcion}</p>
          )}

          {/* Precio */}
          <div className="mb-4">
            {producto.tipo === "simple" && (
              <div className="flex items-baseline gap-2">
                <span className={`text-xl font-bold ${precioConDescuento ? "text-[#F400A1]" : "text-[#C273E0]"}`}>
                  {formatCOP(precioConDescuento ?? producto.precio_base ?? 0)}
                </span>
                {precioConDescuento && (
                  <span className="text-sm text-gray-400 line-through">{formatCOP(producto.precio_base ?? 0)}</span>
                )}
              </div>
            )}
            {producto.tipo === "variaciones" && precioMin !== null && (
              <span className="text-lg font-bold text-[#C273E0]">Desde {formatCOP(precioMin)}</span>
            )}
            {producto.tipo === "personalizado" && (
              <span className="text-base font-semibold text-[#C273E0]">Precio a cotizar</span>
            )}
          </div>

          {/* Botón agregar */}
          <button
            onClick={handleAgregar}
            className="w-full flex items-center justify-center gap-2 bg-[#F400A1] hover:bg-[#d4008a] active:scale-95 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {producto.tipo === "variaciones" ? "Elegir opción" : "Agregar al pedido"}
          </button>
        </div>
      </div>

      {mostrarVariaciones && (
        <ModalVariaciones
          producto={producto}
          onAgregar={(v) => { onAgregar(producto, v); setMostrarVariaciones(false); }}
          onCerrar={() => setMostrarVariaciones(false)}
        />
      )}
    </>
  );
}

// ── PÁGINA PRINCIPAL ──
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
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  const telefono = config?.telefono || "3156192968";
  const nombre = config?.nombre || "Dulce Paladar";

  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);

  function agregarAlCarrito(producto: Producto, variacion?: Variacion) {
    const precio = variacion
      ? variacion.precio
      : producto.en_promocion && producto.precio_base && producto.descuento_porcentaje > 0
      ? Math.round(producto.precio_base * (1 - producto.descuento_porcentaje / 100))
      : producto.precio_base ?? 0;

    const key = variacion ? `${producto.id}-${variacion.id}` : producto.id;

    setCarrito((prev) => {
      const existe = prev.find((i) => i.key === key);
      if (existe) return prev.map((i) => i.key === key ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, {
        key,
        productoId: producto.id,
        nombre: producto.nombre,
        variacionNombre: variacion?.nombre,
        precio,
        cantidad: 1,
      }];
    });
  }

  function cambiarCantidad(key: string, delta: number) {
    setCarrito((prev) =>
      prev
        .map((i) => i.key === key ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter((i) => i.cantidad > 0)
    );
  }

  function eliminarItem(key: string) {
    setCarrito((prev) => prev.filter((i) => i.key !== key));
  }

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
            <img src={config.logo_url} alt={nombre} className="w-32 h-32 object-contain mx-auto mb-4 drop-shadow-xl" />
          ) : (
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center text-5xl">🎂</div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-principal)" }}>
            {nombre}
          </h1>
          <p className="text-white/80 text-sm md:text-base mb-6">
            Repostería artesanal hecha con amor 🩷{config?.ciudad && ` · ${config.ciudad}`}
          </p>
          <div className="flex justify-center">
            <a
              href={`https://wa.me/57${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${nombre}! Me gustaría hacer un pedido.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20b858] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-md"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contactar por WhatsApp
            </a>
          </div>
        </div>
      </header>

      {/* ── BANNER PROMOCIONES ── */}
      {enPromocion.length > 0 && (
        <div className="bg-[#F400A1] text-white text-center py-3 px-4 text-sm font-semibold">
          🏷️ {enPromocion.length === 1
            ? `¡${enPromocion[0].nombre} está en promoción!`
            : `¡Tenemos ${enPromocion.length} productos en promoción!`}
        </div>
      )}

      {/* ── CONTENIDO ── */}
      <main className="max-w-5xl mx-auto px-4 py-8 pb-28">
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
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setCategoriaActiva(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${!categoriaActiva ? "bg-[#C273E0] text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:border-[#C273E0]"}`}
          >
            Todos ({productos.length})
          </button>
          {categoriasConProductos.map((cat) => {
            const count = productos.filter((p) => p.categorias?.id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id === categoriaActiva ? null : cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${categoriaActiva === cat.id ? "bg-[#C273E0] text-white shadow-md" : "bg-white text-gray-600 border border-gray-200 hover:border-[#C273E0]"}`}
              >
                {cat.nombre} ({count})
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-500 font-medium">No encontramos productos</p>
            <button onClick={() => { setCategoriaActiva(null); setBusqueda(""); }} className="mt-3 text-[#F400A1] text-sm hover:underline">
              Ver todos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {productosFiltrados.map((producto) => (
              <TarjetaProducto
                key={producto.id}
                producto={producto}
                esMasVendido={producto.id === masVendidoId}
                onAgregar={agregarAlCarrito}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1a0535] text-white py-10 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-bold text-lg mb-1" style={{ fontFamily: "var(--font-principal)" }}>{nombre}</p>
          {config?.direccion && (
            <p className="text-white/60 text-sm mb-4">📍 {config.direccion}{config.ciudad ? `, ${config.ciudad}` : ""}</p>
          )}
          <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
            <a href={`https://wa.me/57${telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#25D366] hover:text-[#20b858] text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              WhatsApp
            </a>
            <a href="https://www.instagram.com/dulce.paladar27/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#C273E0] hover:text-[#F400A1] text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              @dulce.paladar27
            </a>
          </div>
          <p className="text-white/30 text-xs">Hecho con 💜 · {new Date().getFullYear()}</p>
        </div>
      </footer>

      {/* ── FAB CARRITO ── */}
      {totalItems > 0 && (
        <button
          onClick={() => setCarritoAbierto(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 bg-[#F400A1] hover:bg-[#d4008a] text-white font-bold px-5 py-3.5 rounded-2xl shadow-2xl transition-all active:scale-95"
        >
          <span className="text-lg">🛒</span>
          <span className="text-sm">Ver pedido</span>
          <span className="bg-white text-[#F400A1] text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
            {totalItems}
          </span>
        </button>
      )}

      {/* ── DRAWER CARRITO ── */}
      {carritoAbierto && (
        <CarritoDrawer
          items={carrito}
          onCerrar={() => setCarritoAbierto(false)}
          onCambiarCantidad={cambiarCantidad}
          onEliminar={eliminarItem}
          telefono={telefono}
          negocio={nombre}
        />
      )}
    </div>
  );
}
