import { createClient } from "@/lib/supabase-server";
import PosTerminal from "./pos-terminal";

export default async function PosPage() {
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("activa", true)
    .order("orden");

  const { data: productos } = await supabase
    .from("productos")
    .select("*, variaciones(*)")
    .eq("activo", true)
    .order("nombre");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id")
    .single();

  return (
    <PosTerminal
      categorias={categorias || []}
      productos={productos || []}
      perfilId={perfil?.id || ""}
    />
  );
}
