import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

function verificarApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("api_key");
  return key === process.env.BOT_API_KEY;
}

/*
  Body esperado:
  {
    "cliente_nombre": "María García",
    "cliente_telefono": "+573001234567",
    "tipo": "domicilio" | "recoger",
    "direccion": "Calle 10 #5-20 Apto 301",   // solo si tipo=domicilio
    "items": [
      { "producto_nombre": "Brownie", "cantidad": 2 },
      { "producto_nombre": "Torta de chocolate", "cantidad": 1 }
    ],
    "notas": "Sin azúcar por favor"
  }
*/
export async function POST(req: NextRequest) {
  if (!verificarApiKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: {
    cliente_nombre?: string;
    cliente_telefono?: string;
    tipo?: string;
    direccion?: string;
    items?: { producto_nombre: string; cantidad: number }[];
    notas?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { cliente_nombre, cliente_telefono, tipo, direccion, items, notas } = body;

  if (!cliente_nombre || !items || items.length === 0) {
    return NextResponse.json(
      { error: "Se requiere nombre del cliente y al menos un producto" },
      { status: 400 }
    );
  }

  if (tipo === "domicilio" && !direccion) {
    return NextResponse.json({ error: "Se requiere dirección para domicilio" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1. Buscar o crear cliente
  let clienteId: string | null = null;
  if (cliente_telefono) {
    const { data: clienteExistente } = await supabase
      .from("clientes")
      .select("id")
      .eq("telefono", cliente_telefono)
      .single();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: nuevoCliente } = await supabase
        .from("clientes")
        .insert({ nombre: cliente_nombre, telefono: cliente_telefono })
        .select("id")
        .single();
      clienteId = nuevoCliente?.id || null;
    }
  }

  // 2. Buscar productos y calcular total
  const nombresProductos = items.map((i) => i.producto_nombre);
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, precio")
    .in("nombre", nombresProductos);

  if (!productos || productos.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron los productos solicitados en el catálogo" },
      { status: 404 }
    );
  }

  let total = 0;
  const pedidoItems = items.map((item) => {
    const producto = productos.find(
      (p) => p.nombre.toLowerCase() === item.producto_nombre.toLowerCase()
    );
    if (!producto) return null;
    const subtotal = producto.precio * item.cantidad;
    total += subtotal;
    return {
      producto_id: producto.id,
      cantidad: item.cantidad,
      precio_unitario: producto.precio,
      subtotal,
    };
  }).filter(Boolean);

  if (pedidoItems.length === 0) {
    return NextResponse.json(
      { error: "Ninguno de los productos solicitados fue encontrado" },
      { status: 404 }
    );
  }

  // 3. Obtener número de pedido
  const { count } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true });
  const numeroPedido = (count || 0) + 1;

  // 4. Crear pedido
  const { data: pedido, error: errPedido } = await supabase
    .from("pedidos")
    .insert({
      numero: numeroPedido,
      cliente_id: clienteId,
      tipo: tipo || "recoger",
      estado: "pendiente",
      total,
      medio_pago: "pendiente",
      direccion_entrega: direccion || null,
      notas: notas || null,
      canal: "whatsapp",
    })
    .select("id, numero")
    .single();

  if (errPedido || !pedido) {
    return NextResponse.json({ error: "Error al crear el pedido: " + errPedido?.message }, { status: 500 });
  }

  // 5. Crear items del pedido
  const itemsConPedidoId = pedidoItems.map((item) => ({
    ...item,
    pedido_id: pedido.id,
  }));

  await supabase.from("pedido_items").insert(itemsConPedidoId);

  // 6. Notificar cocina
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("supabase.co", "") ?? ""}api/notificaciones/enviar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: "🛵 Nuevo pedido WhatsApp",
      cuerpo: `Pedido #${pedido.numero} de ${cliente_nombre} — ${tipo === "domicilio" ? "Domicilio" : "Recoger"} · ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(total)}`,
      url: "/cocina",
      tag: `pedido-nuevo-${pedido.id}`,
    }),
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    pedido_numero: pedido.numero,
    total,
    total_formato: new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(total),
    tipo: tipo || "recoger",
    mensaje: `Pedido #${pedido.numero} creado exitosamente. Total: ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(total)}. ${tipo === "domicilio" ? `Lo llevamos a ${direccion}.` : "Puedes recogerlo en el local."}`,
  });
}
