import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { formatoCOP } from "@/lib/formato";

export default async function Home() {
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("activa", true)
    .order("orden");

  const { data: productos } = await supabase
    .from("productos")
    .select("*, categorias(nombre), variaciones(*)")
    .eq("activo", true)
    .eq("visible_web", true)
    .order("nombre");

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <header className="bg-gradient-to-br from-primario to-secundario text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-3xl font-bold font-[family-name:var(--font-principal)]">
              DP
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold font-[family-name:var(--font-principal)] mb-3">
            Dulce Paladar
          </h1>
          <p className="text-lg text-white/80 max-w-md mx-auto mb-8">
            Repostería artesanal hecha con amor. Tortas, postres y mucho más.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="https://wa.me/573156192968?text=Hola%2C%20quiero%20hacer%20un%20pedido"
              target="_blank"
              className="px-6 py-3 bg-white text-primario rounded-lg font-semibold hover:bg-white/90 transition-colors inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.604-1.207A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.16 0-4.16-.68-5.804-1.837l-.416-.247-2.726.715.727-2.654-.272-.432A9.72 9.72 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z" />
              </svg>
              Pedir por WhatsApp
            </Link>
            <Link
              href="https://www.instagram.com/dulce.paladar27/"
              target="_blank"
              className="px-6 py-3 border-2 border-white/40 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Síguenos en Instagram
            </Link>
          </div>
        </div>
      </header>

      {/* Catálogo */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold font-[family-name:var(--font-principal)] text-gray-900 text-center mb-2">
          Nuestro Catálogo
        </h2>
        <p className="text-gray-500 text-center mb-10">
          Elige lo que se te antoje y pídelo por WhatsApp
        </p>

        {/* Categorías */}
        {categorias && categorias.length > 0 && (
          <div className="flex gap-2 justify-center mb-8 flex-wrap">
            {categorias.map((cat) => {
              const count = productos?.filter((p) => p.categoria_id === cat.id).length || 0;
              if (count === 0) return null;
              return (
                <a
                  key={cat.id}
                  href={`#cat-${cat.id}`}
                  className="px-4 py-1.5 bg-primario/10 text-primario rounded-full text-sm font-medium hover:bg-primario/20 transition-colors"
                >
                  {cat.nombre}
                </a>
              );
            })}
          </div>
        )}

        {/* Productos por categoría */}
        {!productos || productos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Próximamente nuestro catálogo completo</p>
          </div>
        ) : (
          <div className="space-y-12">
            {categorias
              ?.filter((cat) => productos.some((p) => p.categoria_id === cat.id))
              .map((cat) => {
                const productosCat = productos.filter((p) => p.categoria_id === cat.id);
                return (
                  <div key={cat.id} id={`cat-${cat.id}`}>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 font-[family-name:var(--font-principal)]">
                      {cat.nombre}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {productosCat.map((producto) => (
                        <div
                          key={producto.id}
                          className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                        >
                          <div className="h-48 bg-gray-100 flex items-center justify-center">
                            {producto.foto_url ? (
                              <img
                                src={producto.foto_url}
                                alt={producto.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-5xl">🧁</span>
                            )}
                          </div>
                          <div className="p-4">
                            <h4 className="font-bold text-gray-900 mb-1">
                              {producto.nombre}
                            </h4>
                            {producto.descripcion && (
                              <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                {producto.descripcion}
                              </p>
                            )}

                            {producto.tipo === "simple" && (
                              <p className="text-xl font-bold text-primario">
                                {formatoCOP(producto.precio_base)}
                              </p>
                            )}
                            {producto.tipo === "variaciones" && producto.variaciones?.length > 0 && (
                              <div>
                                <p className="text-sm text-primario font-semibold mb-1">
                                  Desde {formatoCOP(Math.min(...(producto.variaciones as { precio: number }[]).map((v) => v.precio)))}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {(producto.variaciones as { nombre: string; precio: number }[]).map((v, i) => (
                                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                      {v.nombre}: {formatoCOP(v.precio)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {producto.tipo === "personalizado" && (
                              <p className="text-sm text-secundario font-semibold">
                                Precio a cotizar
                              </p>
                            )}

                            <Link
                              href={`https://wa.me/573156192968?text=${encodeURIComponent(`Hola, me interesa: ${producto.nombre}`)}`}
                              target="_blank"
                              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                              </svg>
                              Pedir
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h3 className="text-xl font-bold font-[family-name:var(--font-principal)] mb-3">
            Dulce Paladar
          </h3>
          <p className="text-gray-400 mb-4">
            Repostería artesanal · Tortas · Postres · Panadería
          </p>
          <div className="flex justify-center gap-4 mb-6">
            <Link
              href="https://wa.me/573156192968"
              target="_blank"
              className="text-green-400 hover:text-green-300 transition-colors text-sm"
            >
              WhatsApp
            </Link>
            <Link
              href="https://www.instagram.com/dulce.paladar27/"
              target="_blank"
              className="text-pink-400 hover:text-pink-300 transition-colors text-sm"
            >
              Instagram
            </Link>
          </div>
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Dulce Paladar. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
