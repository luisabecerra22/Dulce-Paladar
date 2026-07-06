import { createClient } from "@/lib/supabase-server";
import ListaInventario from "./lista-inventario";

export default async function InventarioPage() {
  const supabase = await createClient();

  const { data: insumos } = await supabase
    .from("insumos")
    .select("*, proveedores(nombre)")
    .order("nombre");

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("id, nombre")
    .order("nombre");

  return (
    <ListaInventario
      insumosIniciales={insumos || []}
      proveedores={proveedores || []}
    />
  );
}
