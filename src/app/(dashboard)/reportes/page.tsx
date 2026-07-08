import { createClient } from "@/lib/supabase-server";
import PanelReportes from "./panel-reportes";

export const metadata = { title: "Reportes" };

export default async function ReportesPage() {
  const supabase = await createClient();

  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, numero, total, estado, medio_pago, tipo, mesa_numero, creado_en, pedido_items(cantidad, precio_unitario, productos(nombre, categoria_id, categorias(nombre)))")
    .eq("estado", "entregado")
    .gte("creado_en", hace30.toISOString())
    .order("creado_en", { ascending: true });

  const { data: gastos } = await supabase
    .from("gastos")
    .select("monto, categoria, fecha")
    .gte("fecha", hace30.toISOString().split("T")[0]);

  return (
    <PanelReportes
      pedidosIniciales={(pedidos || []) as never[]}
      gastosIniciales={gastos || []}
    />
  );
}
