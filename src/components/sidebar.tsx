"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useState } from "react";

const menuAdmin = [
  { href: "/dashboard", label: "Dashboard", icono: "dashboard" },
  { href: "/mesas", label: "Mesas", icono: "mesas" },
  { href: "/pos", label: "Ventas / POS", icono: "pos" },
  { href: "/catalogo", label: "Productos", icono: "productos" },
  { href: "/cocina", label: "Comandas", icono: "comandas" },
  { href: "/inventario", label: "Inventario", icono: "inventario" },
  { href: "/finanzas", label: "Contabilidad", icono: "finanzas" },
];

const menuVendedor = [
  { href: "/dashboard", label: "Dashboard", icono: "dashboard" },
  { href: "/mesas", label: "Mesas", icono: "mesas" },
  { href: "/pos", label: "Ventas / POS", icono: "pos" },
  { href: "/cocina", label: "Comandas", icono: "comandas" },
];

const menuCocina = [
  { href: "/cocina", label: "Comandas", icono: "comandas" },
];

function getMenu(rol: string) {
  switch (rol) {
    case "admin": return menuAdmin;
    case "vendedor": return menuVendedor;
    case "cocina": return menuCocina;
    default: return [];
  }
}

function Icono({ tipo, className }: { tipo: string; className?: string }) {
  const cls = className || "w-5 h-5";
  switch (tipo) {
    case "mesas":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 6v8a2 2 0 002 2h12a2 2 0 002-2V6M8 16v4m8-4v4M6 6V4h12v2" />
        </svg>
      );
    case "dashboard":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case "pos":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    case "productos":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "comandas":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case "inventario":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    case "finanzas":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    default:
      return <div className={cls} />;
  }
}

export default function Sidebar({ nombre, rol }: { nombre: string; rol: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = getMenu(rol);
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`${
        collapsed ? "w-[72px]" : "w-60"
      } bg-cafe-oscuro flex flex-col transition-all duration-200 ease-in-out`}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primario to-secundario flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">DP</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h2 className="font-bold text-white text-sm font-[family-name:var(--font-principal)] leading-tight">
              Dulce Paladar
            </h2>
            <p className="text-[10px] text-cafe-claro uppercase tracking-wider">
              {rol}
            </p>
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="mx-3 h-px bg-white/10" />

      {/* Menú */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {menu.map((item) => {
          const activo = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activo
                  ? "bg-primario text-white shadow-lg shadow-primario/20"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              }`}
            >
              <Icono tipo={item.icono} className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-white/40 hover:text-white/70 text-xs transition-colors rounded-lg hover:bg-white/5"
        >
          <svg className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>

      {/* Usuario y logout */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-8 h-8 rounded-full bg-primario/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primario text-xs font-bold">
              {nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{nombre}</p>
              <button
                onClick={handleLogout}
                className="text-xs text-white/40 hover:text-red-400 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
