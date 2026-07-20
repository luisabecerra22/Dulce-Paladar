import { createClient } from "@/lib/supabase-server";
import MenuCliente from "./menu-cliente";

export const metadata = {
  title: "Menú — Dulce Paladar",
  description: "Tortas, postres y productos de repostería artesanal hechos con amor. Haz tu pedido por WhatsApp.",
};

export default async function MenuPage() {
  const supabase = await createClient();

  const [
    { data: config },
    { data: categorias },
    { data: productos },
    { data: itemsVentas },
  ] = await Promise.all([
    supabase.from("config_negocio").select("*").limit(1).single(),
    supabase.from("categorias").select("id, nombre, orden").eq("activa", true).order("orden"),
    supabase
      .from("productos")
      .select("*, categorias(nombre, id), variaciones(*)")
      .eq("visible_web", true)
      .eq("activo", true)
      .order("nombre"),
    supabase.from("pedido_items").select("producto_id, cantidad"),
  ]);

  // Calcular más vendido
  let masVendidoId: string | null = null;
  if (itemsVentas && itemsVentas.length > 0) {
    const conteo: Record<string, number> = {};
    for (const item of itemsVentas) {
      if (item.producto_id) {
        conteo[item.producto_id] = (conteo[item.producto_id] || 0) + (item.cantidad || 1);
      }
    }
    const top = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
    if (top) masVendidoId = top[0];
  }

  return (
    <MenuCliente
      config={config}
      categorias={categorias || []}
      productos={productos || []}
      masVendidoId={masVendidoId}
    />
  );
}
