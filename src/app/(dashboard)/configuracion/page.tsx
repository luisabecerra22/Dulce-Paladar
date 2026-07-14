import Link from "next/link";

const modulos = [
  {
    href: "/configuracion/negocio",
    titulo: "Información del negocio",
    descripcion: "Nombre, dirección, teléfono, NIT y datos generales del negocio.",
    icono: "🏪",
  },
  {
    href: "/configuracion/usuarios",
    titulo: "Usuarios y roles",
    descripcion: "Gestiona los usuarios del sistema y sus permisos de acceso.",
    icono: "👥",
  },
  {
    href: "/configuracion/mesas",
    titulo: "Configuración de mesas",
    descripcion: "Zonas, capacidad y distribución del espacio del local.",
    icono: "🪑",
  },
];

export default function ConfiguracionPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900">
          Configuración
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Administra los módulos y ajustes del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modulos.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-primario hover:shadow-md transition-all group"
          >
            <div className="text-3xl mb-3">{m.icono}</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-primario transition-colors">
              {m.titulo}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{m.descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
