import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

function verificarApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("api_key");
  return key === process.env.BOT_API_KEY;
}

const ESTADO_TEXTO: Record<string, string> = {
  pendiente: "recibido y pendiente de preparación",
  preparacion: "en preparación en cocina",
  listo: "listo para entregar o recoger",
  entregado: "entregado",
  cancelado: "cancelado",
};

export async function GET(req: NextRequest) {
  if (!verificarApiKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const numero = req.nextUrl.searchParams.get("numero");
  const telefono = req.nextUrl.searchParams.get("telefono");

  if (!numero && !telefono) {
    return NextResponse.json(
      { error: "Se requiere el número de pedido o teléfono del cliente" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  if (numero) {
    const { data: pedido } = await supabase
      .from("pedidos")
      .select("numero, estado, total, tipo, creado_en, pedido_items(cantidad, productos(nombre))")
      .eq("numero", parseInt(numero))
      .single();

    if (!pedido) {
      return NextResponse.json({ error: `No se encontró el pedido #${numero}` }, { status: 404 });
    }

    return NextResponse.json({
      pedido_numero: pedido.numero,
      estado: pedido.estado,
      estado_descripcion: ESTADO_TEXTO[pedido.estado] || pedido.estado,
      tipo: pedido.tipo,
      total: pedido.total,
      mensaje: `Tu pedido #${pedido.numero} está ${ESTADO_TEXTO[pedido.estado] || pedido.estado}.`,
    });
  }

  // Buscar por teléfono — devuelve el pedido más reciente activo
  if (telefono) {
    const { data: cliente } = await supabase
      .from("clientes")
      .select("id, nombre")
      .eq("telefono", telefono)
      .single();

    if (!cliente) {
      return NextResponse.json({ error: "No encontramos pedidos para ese número" }, { status: 404 });
    }

    const { data: pedidos } = await supabase
      .from("pedidos")
      .select("numero, estado, total, tipo, creado_en")
      .eq("cliente_id", cliente.id)
      .not("estado", "eq", "cancelado")
      .order("creado_en", { ascending: false })
      .limit(3);

    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({ error: "No tienes pedidos activos" }, { status: 404 });
    }

    return NextResponse.json({
      cliente: cliente.nombre,
      pedidos: pedidos.map((p) => ({
        numero: p.numero,
        estado: p.estado,
        estado_descripcion: ESTADO_TEXTO[p.estado] || p.estado,
        tipo: p.tipo,
        total: p.total,
      })),
      mensaje: `Hola ${cliente.nombre}, tus últimos pedidos son: ${pedidos.map((p) => `#${p.numero} (${ESTADO_TEXTO[p.estado] || p.estado})`).join(", ")}.`,
    });
  }
}
