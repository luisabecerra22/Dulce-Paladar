import { createClient } from "@/lib/supabase-server";
import TableroComandas from "./tablero-comandas";

export default async function CocinaPage() {
  const supabase = await createClient();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "*, clientes(nombre), pedido_items(*, productos(nombre), variaciones(nombre))"
    )
    .in("estado", ["pendiente", "preparacion", "listo"])
    .order("creado_en", { ascending: true });

  return <TableroComandas pedidosIniciales={pedidos || []} />;
}
