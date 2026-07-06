"use client";

import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function EliminarProductoBtn({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();

  async function handleEliminar() {
    if (!confirm(`¿Estás segura de eliminar "${nombre}"?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("productos").delete().eq("id", id);

    if (error) {
      alert("Error al eliminar: " + error.message);
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={handleEliminar}
      className="px-3 py-1.5 border border-red-200 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
    >
      Eliminar
    </button>
  );
}
