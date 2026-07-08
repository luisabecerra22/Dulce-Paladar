import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Sidebar from "@/components/sidebar";
import NotificacionesProvider from "@/components/notificaciones-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, rol")
    .eq("user_id", user.id)
    .single();

  if (!perfil) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-crema">
      <Sidebar nombre={perfil.nombre} rol={perfil.rol} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav */}
        <header className="h-14 bg-white border-b border-crema-oscuro flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-cafe">
              {new Date().toLocaleDateString("es-CO", {
                timeZone: "America/Bogota",
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-cafe-claro font-medium uppercase tracking-wide">
              {perfil.rol}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primario to-secundario flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {perfil.nombre.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <NotificacionesProvider />
    </div>
  );
}
