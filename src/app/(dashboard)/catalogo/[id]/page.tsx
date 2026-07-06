import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import FormularioProducto from "../formulario-producto";
import Link from "next/link";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: producto } = await supabase
    .from("productos")
    .select("*")
    .eq("id", id)
    .single();

  if (!producto) {
    notFound();
  }

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("activa", true)
    .order("orden");

  const { data: variaciones } = await supabase
    .from("variaciones")
    .select("*")
    .eq("producto_id", id)
    .order("precio");

  return (
    <div>
      <div className="mb-6">
        <Link href="/catalogo" className="text-sm text-gray-500 hover:text-primario">
          ← Volver al catálogo
        </Link>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900 mt-2">
          Editar: {producto.nombre}
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <FormularioProducto
          categorias={categorias || []}
          productoInicial={producto}
          variacionesIniciales={variaciones || []}
        />
      </div>
    </div>
  );
}
