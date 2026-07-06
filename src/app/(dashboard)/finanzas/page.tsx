import { createClient } from "@/lib/supabase-server";
import PanelFinanzas from "./panel-finanzas";

export default async function FinanzasPage() {
  const supabase = await createClient();

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  const { data: pedidosHoy } = await supabase
    .from("pedidos")
    .select("total, medio_pago, estado")
    .gte("creado_en", hoy + "T00:00:00-05:00")
    .lte("creado_en", hoy + "T23:59:59-05:00");

  const { data: gastos } = await supabase
    .from("gastos")
    .select("*")
    .order("fecha", { ascending: false });

  const { data: cuentas } = await supabase
    .from("cuentas_pagar")
    .select("*")
    .order("fecha_vencimiento");

  const { data: pedidosMes } = await supabase
    .from("pedidos")
    .select("total, creado_en, estado")
    .gte("creado_en", hoy.substring(0, 7) + "-01T00:00:00-05:00")
    .in("estado", ["pendiente", "preparacion", "listo", "entregado"]);

  return (
    <PanelFinanzas
      pedidosHoy={pedidosHoy || []}
      pedidosMes={pedidosMes || []}
      gastosIniciales={gastos || []}
      cuentasIniciales={cuentas || []}
      fechaHoy={hoy}
    />
  );
}
