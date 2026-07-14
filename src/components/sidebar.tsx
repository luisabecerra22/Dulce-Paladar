"use client";

import Link from "next/link";
import Image from "next/image";
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
  { href: "/reportes", label: "Reportes", icono: "reportes" },
];

const menuVendedor = [
  { href: "/dashboard", label: "Dashboard", icono: "dashboard" },
  { href: "/mesas", label: "Mesas", icono: "mesas" },
  { href: "/pos", label: "Ventas / POS", icono: "pos" },
  { href: "/cocina", label: "Comandas", icono: "comandas" },
];

const menuCocina = [{ href: "/cocina", label: "Comandas", icono: "comandas" }];

const menuConfiguracion = [
  { href: "/configuracion/negocio", label: "Información del negocio" },
  { href: "/configuracion/usuarios", label: "Usuarios y roles" },
  { href: "/configuracion/mesas", label: "Configuración mesas" },
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
    case "reportes":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    default:
      return <div className={cls} />;
  }
}

function LogoCake({ collapsed }: { collapsed?: boolean }) {
  return (
    <Image
      src="/icons/logo-dulce-paladar.png"
      alt="Dulce Paladar"
      width={collapsed ? 36 : 44}
      height={collapsed ? 36 : 44}
      className="object-contain drop-shadow-md"
      priority
    />
  );
}

function IconConfig({ className }: { className?: string }) {
  return (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default function Sidebar({ nombre, rol }: { nombre: string; rol: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const menu = getMenu(rol);
  const [collapsed, setCollapsed] = useState(false);
  const [configAbierto, setConfigAbierto] = useState(false);

  const esConfigActivo = pathname.startsWith("/configuracion");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={`${collapsed ? "w-[72px]" : "w-60"} flex flex-col transition-all duration-200 ease-in-out relative overflow-hidden flex-shrink-0`}
      style={{ background: "#100820" }}
    >
      {/* ── Textura mármol ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 240 900"
        aria-hidden="true"
      >
        <defs>
          <filter id="mv">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {/* venas mármol */}
        <path d="M0 180 C80 140 160 220 240 140" stroke="rgba(194,100,250,0.12)" strokeWidth="14" fill="none" filter="url(#mv)" />
        <path d="M0 380 C100 340 160 420 240 360" stroke="rgba(255,255,255,0.04)" strokeWidth="18" fill="none" filter="url(#mv)" />
        <path d="M60 0 C70 200 40 400 80 900" stroke="rgba(194,100,250,0.09)" strokeWidth="8" fill="none" filter="url(#mv)" />
        <path d="M180 0 C160 250 200 500 150 900" stroke="rgba(194,100,250,0.07)" strokeWidth="6" fill="none" filter="url(#mv)" />
        <path d="M0 600 C80 560 180 640 240 580" stroke="rgba(255,215,0,0.04)" strokeWidth="10" fill="none" filter="url(#mv)" />
        {/* blobs esquina superior */}
        <ellipse cx="30" cy="60" rx="90" ry="80" fill="rgba(194,100,250,0.14)" filter="url(#mv)" />
        <ellipse cx="-10" cy="30" rx="60" ry="55" fill="rgba(140,60,210,0.12)" filter="url(#mv)" />
        {/* blobs esquina inferior */}
        <ellipse cx="50" cy="840" rx="100" ry="90" fill="rgba(155,64,224,0.16)" filter="url(#mv)" />
        <ellipse cx="10" cy="880" rx="70" ry="65" fill="rgba(194,100,250,0.10)" filter="url(#mv)" />
        <ellipse cx="120" cy="870" rx="55" ry="50" fill="rgba(255,215,0,0.04)" filter="url(#mv)" />
      </svg>

      {/* ── Logo ── */}
      <div className="p-4 flex items-center gap-3 relative z-10">
        <div className="flex-shrink-0 text-[#C264FA]">
          <LogoCake collapsed={collapsed} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h2 className="font-bold text-white text-sm font-[family-name:var(--font-principal)] leading-tight">
              Dulce Paladar
            </h2>
            <p className="text-[10px] text-[#C264FA]/70 uppercase tracking-wider">{rol}</p>
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="mx-3 h-px bg-white/10 relative z-10" />

      {/* ── Menú principal ── */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 relative z-10 overflow-y-auto">
        {menu.map((item) => {
          const activo =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activo
                  ? "border-l-2 border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]"
                  : "text-white/55 hover:text-white hover:bg-white/8 border-l-2 border-transparent"
              }`}
            >
              <Icono tipo={item.icono} className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Colapsar ── */}
      <div className="px-2 pb-1 relative z-10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-white/35 hover:text-white/60 text-xs transition-colors rounded-lg hover:bg-white/5"
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>

      {/* ── Submenu configuración (popup hacia arriba) ── */}
      {configAbierto && (
        <div className="absolute bottom-[72px] left-2 right-2 z-30 bg-[#1e0f3a] border border-white/15 rounded-xl overflow-hidden shadow-2xl shadow-black/40">
          {!collapsed && (
            <p className="px-4 pt-3 pb-1 text-[10px] text-white/40 uppercase tracking-widest font-semibold">
              Configuración
            </p>
          )}
          {menuConfiguracion.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setConfigAbierto(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                pathname.startsWith(item.href)
                  ? "text-[#FFD700] bg-[#FFD700]/8"
                  : "text-white/65 hover:text-white hover:bg-white/8"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
              {!collapsed && item.label}
            </Link>
          ))}
        </div>
      )}

      {/* ── Sección inferior: config + usuario ── */}
      <div className="p-3 border-t border-white/10 relative z-10">
        <div className="flex items-center gap-2">
          {/* Gear configuración */}
          <button
            onClick={() => setConfigAbierto(!configAbierto)}
            title="Configuración"
            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
              esConfigActivo || configAbierto
                ? "bg-[#FFD700]/15 text-[#FFD700]"
                : "text-white/40 hover:text-white/70 hover:bg-white/8"
            }`}
          >
            <IconConfig className="w-4.5 h-4.5" />
          </button>

          {/* Info usuario */}
          <div className={`flex items-center gap-2 flex-1 min-w-0 ${collapsed ? "hidden" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-[#C264FA]/20 border border-[#C264FA]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[#C264FA] text-xs font-bold">
                {nombre.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{nombre}</p>
              <button
                onClick={handleLogout}
                className="text-xs text-white/35 hover:text-red-400 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Avatar solo cuando está colapsado */}
          {collapsed && (
            <div className="w-8 h-8 rounded-full bg-[#C264FA]/20 border border-[#C264FA]/30 flex items-center justify-center">
              <span className="text-[#C264FA] text-xs font-bold">
                {nombre.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
