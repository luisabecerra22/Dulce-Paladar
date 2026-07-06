"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const menuAdmin = [
  { href: "/dashboard", label: "Inicio", icono: "🏠" },
  { href: "/pos", label: "POS - Ventas", icono: "🛒" },
  { href: "/catalogo", label: "Catálogo", icono: "📋" },
  { href: "/cocina", label: "Comandas", icono: "👨‍🍳" },
  { href: "/inventario", label: "Inventario", icono: "📦" },
  { href: "/finanzas", label: "Finanzas", icono: "💰" },
];

const menuVendedor = [
  { href: "/dashboard", label: "Inicio", icono: "🏠" },
  { href: "/pos", label: "POS - Ventas", icono: "🛒" },
  { href: "/cocina", label: "Comandas", icono: "👨‍🍳" },
];

const menuCocina = [
  { href: "/cocina", label: "Comandas", icono: "👨‍🍳" },
];

function getMenu(rol: string) {
  switch (rol) {
    case "admin":
      return menuAdmin;
    case "vendedor":
      return menuVendedor;
    case "cocina":
      return menuCocina;
    default:
      return [];
  }
}

export default function Sidebar({ nombre, rol }: { nombre: string; rol: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = getMenu(rol);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primario to-secundario flex items-center justify-center">
            <span className="text-white text-sm font-bold">DP</span>
          </div>
          <div>
            <h2 className="font-bold text-primario font-[family-name:var(--font-principal)]">
              Dulce Paladar
            </h2>
            <p className="text-xs text-gray-500 capitalize">{rol}</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3 space-y-1">
        {menu.map((item) => {
          const activo = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activo
                  ? "bg-primario/10 text-primario"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="text-lg">{item.icono}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Usuario y logout */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700 truncate mb-2">{nombre}</p>
        <button
          onClick={handleLogout}
          className="w-full text-sm text-gray-500 hover:text-red-600 text-left transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
