import { createClient } from "@/lib/supabase-server";
import MapaMesas from "./mapa-mesas";

export default async function MesasPage() {
  const supabase = await createClient();

  const { data: mesas } = await supabase
    .from("mesas")
    .select("*")
    .eq("activa", true)
    .order("orden");

  const { data: pedidosActivos } = await supabase
    .from("pedidos")
    .select("id, numero, mesa_numero, tipo, estado, total, abono, saldo_pendiente, creado_en, clientes(nombre), pedido_items(cantidad, productos(nombre), variaciones(nombre))")
    .in("estado", ["pendiente", "preparacion", "listo"])
    .order("creado_en", { ascending: true });

  return (
    <MapaMesas
      mesasIniciales={mesas || []}
      pedidosActivos={(pedidosActivos || []) as never[]}
    />
  );
}
