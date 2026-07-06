import { createClient } from "@/lib/supabase-server";
import FormularioProducto from "../formulario-producto";
import Link from "next/link";

export default async function NuevoProductoPage() {
  const supabase = await createClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("activa", true)
    .order("orden");

  return (
    <div>
      <div className="mb-6">
        <Link href="/catalogo" className="text-sm text-gray-500 hover:text-primario">
          ← Volver al catálogo
        </Link>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900 mt-2">
          Nuevo producto
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <FormularioProducto categorias={categorias || []} />
      </div>
    </div>
  );
}
