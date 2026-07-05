import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      {/* Espacio para el logo — se reemplazará cuando esté listo */}
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primario to-secundario flex items-center justify-center mb-6">
        <span className="text-white text-4xl font-bold font-[family-name:var(--font-principal)]">
          DP
        </span>
      </div>

      <h1 className="text-4xl font-bold font-[family-name:var(--font-principal)] text-primario mb-2">
        Dulce Paladar
      </h1>
      <p className="text-lg text-gray-500 mb-8 max-w-md">
        Repostería artesanal hecha con amor. Tortas, postres y mucho más.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="https://wa.me/573156192968?text=Hola%2C%20quiero%20hacer%20un%20pedido"
          target="_blank"
          className="px-6 py-3 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors"
        >
          Pedir por WhatsApp
        </Link>
        <Link
          href="https://www.instagram.com/dulce.paladar27/"
          target="_blank"
          className="px-6 py-3 border-2 border-secundario text-secundario rounded-lg font-semibold hover:bg-secundario hover:text-white transition-colors"
        >
          Síguenos en Instagram
        </Link>
      </div>

      <footer className="mt-16 text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Dulce Paladar. Todos los derechos reservados.</p>
      </footer>
    </main>
  );
}
