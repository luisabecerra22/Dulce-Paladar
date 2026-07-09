import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { enviarMensaje, formatearCOP } from "@/lib/whatsapp";

// ── Tipos ──────────────────────────────────────────────────────────────────
type ItemPedido = { producto_nombre: string; cantidad: number };
type DatosConversacion = {
  items?: ItemPedido[];
  tipo?: string;
  direccion?: string;
  nombre?: string;
};

// ── GET: verificación del webhook con Meta ─────────────────────────────────
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Token inválido", { status: 403 });
}

// ── POST: recibir mensajes de WhatsApp ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();

  const entry = body?.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  const mensaje = change?.messages?.[0];

  if (!mensaje || mensaje.type !== "text") {
    return NextResponse.json({ ok: true });
  }

  const telefono: string = mensaje.from;
  const texto: string = mensaje.text.body.trim().toLowerCase();

  const supabase = createAdminClient();

  // Obtener o crear conversación
  const { data: conv } = await supabase
    .from("whatsapp_conversaciones")
    .select("estado, datos")
    .eq("telefono", telefono)
    .single();

  const estado: string = conv?.estado || "inicio";
  const datos: DatosConversacion = (conv?.datos as DatosConversacion) || {};

  await procesarMensaje(telefono, texto, estado, datos, supabase);

  return NextResponse.json({ ok: true });
}

// ── Máquina de estados ─────────────────────────────────────────────────────
async function procesarMensaje(
  telefono: string,
  texto: string,
  estado: string,
  datos: DatosConversacion,
  supabase: ReturnType<typeof createAdminClient>
) {
  const esSaludo = /^(hola|buenos|buenas|hi|hey|ola|buen|inicio|menu|menú|start)/.test(texto);

  // Siempre responder a "hola" con el menú
  if (esSaludo || estado === "inicio") {
    await guardarEstado(supabase, telefono, "menu", {});
    await enviarMensaje(telefono, menuPrincipal());
    return;
  }

  switch (estado) {
    case "menu":
      await manejarMenu(telefono, texto, supabase);
      break;

    case "catalogo":
      await manejarCatalogo(telefono, texto, supabase);
      break;

    case "pidiendo_items":
      await manejarItems(telefono, texto, datos, supabase);
      break;

    case "pidiendo_tipo":
      await manejarTipo(telefono, texto, datos, supabase);
      break;

    case "pidiendo_direccion":
      await manejarDireccion(telefono, texto, datos, supabase);
      break;

    case "pidiendo_nombre":
      await manejarNombre(telefono, texto, datos, supabase);
      break;

    case "confirmando":
      await manejarConfirmacion(telefono, texto, datos, supabase);
      break;

    case "consultando_estado":
      await manejarEstado(telefono, texto, supabase);
      break;

    default:
      await guardarEstado(supabase, telefono, "menu", {});
      await enviarMensaje(telefono, menuPrincipal());
  }
}

// ── Handlers por estado ────────────────────────────────────────────────────

async function manejarMenu(telefono: string, texto: string, supabase: ReturnType<typeof createAdminClient>) {
  if (texto === "1" || texto.includes("catálog") || texto.includes("catalog") || texto.includes("product") || texto.includes("qué tienen") || texto.includes("que tienen")) {
    await guardarEstado(supabase, telefono, "catalogo", {});
    const catalogo = await obtenerCatalogo();
    await enviarMensaje(telefono, catalogo);
    await enviarMensaje(telefono, "¿Te gustaría hacer un pedido? Escribe *pedir* o escribe *0* para volver al menú 🛍️");
  } else if (texto === "2" || texto.includes("pedir") || texto.includes("pedido") || texto.includes("quiero") || texto.includes("ordenar")) {
    await guardarEstado(supabase, telefono, "pidiendo_items", { items: [] });
    await enviarMensaje(telefono,
      "¡Perfecto! 🎉 Dime qué quieres pedir.\n\nEscribe el producto y la cantidad, por ejemplo:\n*2 brownies*\n*1 torta de chocolate*\n\nCuando termines escribe *listo* ✅"
    );
  } else if (texto === "3" || texto.includes("estado") || texto.includes("mi pedido") || texto.includes("dónde") || texto.includes("donde")) {
    await guardarEstado(supabase, telefono, "consultando_estado", {});
    await enviarMensaje(telefono, "¿Cuál es el número de tu pedido? 🔍\n\nEjemplo: *#5*");
  } else {
    await enviarMensaje(telefono, menuPrincipal());
  }
}

async function manejarCatalogo(telefono: string, texto: string, supabase: ReturnType<typeof createAdminClient>) {
  if (texto === "0" || texto.includes("volver") || texto.includes("menu") || texto.includes("menú")) {
    await guardarEstado(supabase, telefono, "menu", {});
    await enviarMensaje(telefono, menuPrincipal());
  } else if (texto.includes("pedir") || texto.includes("quiero") || texto === "2") {
    await guardarEstado(supabase, telefono, "pidiendo_items", { items: [] });
    await enviarMensaje(telefono,
      "¡Vamos! 🛍️ Dime qué quieres pedir.\n\nEscribe el producto y la cantidad:\n*2 brownies*\n*1 torta de chocolate*\n\nCuando termines escribe *listo* ✅"
    );
  } else {
    await enviarMensaje(telefono, "Escribe *pedir* para hacer un pedido o *0* para volver al menú.");
  }
}

async function manejarItems(telefono: string, texto: string, datos: DatosConversacion, supabase: ReturnType<typeof createAdminClient>) {
  if (texto === "listo" || texto === "eso es todo" || texto === "es todo") {
    const items = datos.items || [];
    if (items.length === 0) {
      await enviarMensaje(telefono, "Aún no has agregado ningún producto. Dime qué quieres pedir 😊");
      return;
    }
    await guardarEstado(supabase, telefono, "pidiendo_tipo", datos);
    await enviarMensaje(telefono,
      `Tienes en tu pedido:\n${items.map((i) => `• ${i.cantidad}x ${i.producto_nombre}`).join("\n")}\n\n¿Cómo lo prefieres? 📦\n\n*1* — Domicilio 🛵\n*2* — Recoger en el local 🏪`
    );
    return;
  }

  if (texto === "0" || texto.includes("cancelar")) {
    await guardarEstado(supabase, telefono, "menu", {});
    await enviarMensaje(telefono, "Pedido cancelado. " + menuPrincipal());
    return;
  }

  // Parsear "2 brownies", "un cupcake", "3 tortas de chocolate" etc.
  const match = texto.match(/^(\d+|un|una|dos|tres|cuatro|cinco)\s+(.+)$/);
  if (match) {
    const cantidadTexto = match[1];
    const nombreProducto = match[2].trim();
    const cantidades: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
    const cantidad = cantidades[cantidadTexto] || parseInt(cantidadTexto) || 1;

    const items = datos.items || [];
    const existente = items.find((i) => i.producto_nombre.toLowerCase() === nombreProducto.toLowerCase());
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      items.push({ producto_nombre: nombreProducto, cantidad });
    }

    await guardarEstado(supabase, telefono, "pidiendo_items", { ...datos, items });
    await enviarMensaje(telefono,
      `✅ Agregado: ${cantidad}x ${nombreProducto}\n\nTu pedido hasta ahora:\n${items.map((i) => `• ${i.cantidad}x ${i.producto_nombre}`).join("\n")}\n\n¿Algo más? Escribe otro producto o escribe *listo* para continuar.`
    );
  } else {
    await enviarMensaje(telefono,
      "No entendí bien 😅 Escribe así:\n*2 brownies*\n*1 torta de chocolate*\n\nO escribe *listo* cuando termines."
    );
  }
}

async function manejarTipo(telefono: string, texto: string, datos: DatosConversacion, supabase: ReturnType<typeof createAdminClient>) {
  if (texto === "1" || texto.includes("domicilio") || texto.includes("entrega") || texto.includes("envío") || texto.includes("envio")) {
    await guardarEstado(supabase, telefono, "pidiendo_direccion", { ...datos, tipo: "domicilio" });
    await enviarMensaje(telefono, "¿A qué dirección te lo enviamos? 📍\n\nEscribe la dirección completa por favor.");
  } else if (texto === "2" || texto.includes("recoger") || texto.includes("local") || texto.includes("recog")) {
    await guardarEstado(supabase, telefono, "pidiendo_nombre", { ...datos, tipo: "recoger" });
    await enviarMensaje(telefono, "¡Perfecto! ¿A nombre de quién queda el pedido? 👤");
  } else {
    await enviarMensaje(telefono, "Por favor escribe *1* para domicilio o *2* para recoger en el local.");
  }
}

async function manejarDireccion(telefono: string, texto: string, datos: DatosConversacion, supabase: ReturnType<typeof createAdminClient>) {
  await guardarEstado(supabase, telefono, "pidiendo_nombre", { ...datos, direccion: texto });
  await enviarMensaje(telefono, "¿A nombre de quién queda el pedido? 👤");
}

async function manejarNombre(telefono: string, texto: string, datos: DatosConversacion, supabase: ReturnType<typeof createAdminClient>) {
  const nuevosDatos = { ...datos, nombre: texto };
  await guardarEstado(supabase, telefono, "confirmando", nuevosDatos);

  const items = nuevosDatos.items || [];
  const resumen = [
    `📋 *Resumen de tu pedido:*`,
    ``,
    ...items.map((i) => `• ${i.cantidad}x ${i.producto_nombre}`),
    ``,
    `📦 Tipo: ${nuevosDatos.tipo === "domicilio" ? "Domicilio 🛵" : "Recoger en local 🏪"}`,
    nuevosDatos.direccion ? `📍 Dirección: ${nuevosDatos.direccion}` : "",
    `👤 Nombre: ${nuevosDatos.nombre}`,
    ``,
    `¿Confirmamos el pedido? ✅`,
    `*sí* para confirmar | *no* para cancelar`,
  ].filter(Boolean).join("\n");

  await enviarMensaje(telefono, resumen);
}

async function manejarConfirmacion(telefono: string, texto: string, datos: DatosConversacion, supabase: ReturnType<typeof createAdminClient>) {
  if (texto === "sí" || texto === "si" || texto === "yes" || texto === "confirmar" || texto === "confirmo" || texto === "dale") {
    // Crear pedido via nuestra API
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/bot/pedido`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.BOT_API_KEY!,
      },
      body: JSON.stringify({
        cliente_nombre: datos.nombre,
        cliente_telefono: telefono,
        tipo: datos.tipo,
        direccion: datos.direccion,
        items: datos.items,
      }),
    });

    if (res.ok) {
      const resultado = await res.json();
      await guardarEstado(supabase, telefono, "menu", {});
      await enviarMensaje(telefono,
        `🎉 *¡Pedido confirmado!*\n\n📝 Pedido #${resultado.pedido_numero}\n💰 Total: ${resultado.total_formato}\n\n${datos.tipo === "domicilio" ? "🛵 Te lo llevamos a tu dirección." : "🏪 Puedes recogerlo en el local."}\n\n¡Gracias por elegir Dulce Paladar! 🍰`
      );
    } else {
      await enviarMensaje(telefono,
        "Lo sentimos, hubo un problema al crear el pedido 😔 Por favor intenta de nuevo o escríbenos directamente."
      );
      await guardarEstado(supabase, telefono, "menu", {});
    }
  } else if (texto === "no" || texto.includes("cancelar") || texto.includes("cancel")) {
    await guardarEstado(supabase, telefono, "menu", {});
    await enviarMensaje(telefono, "Pedido cancelado. " + menuPrincipal());
  } else {
    await enviarMensaje(telefono, "Escribe *sí* para confirmar o *no* para cancelar.");
  }
}

async function manejarEstado(telefono: string, texto: string, supabase: ReturnType<typeof createAdminClient>) {
  const numero = texto.replace(/[^0-9]/g, "");
  if (!numero) {
    await enviarMensaje(telefono, "Por favor escribe el número de tu pedido. Ejemplo: *#5*");
    return;
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/bot/estado?numero=${numero}`,
    { headers: { "x-api-key": process.env.BOT_API_KEY! } }
  );

  if (res.ok) {
    const data = await res.json();
    await enviarMensaje(telefono, `${data.mensaje} 📦`);
  } else {
    await enviarMensaje(telefono, `No encontré el pedido #${numero}. Verifica el número e intenta de nuevo.`);
  }

  await guardarEstado(supabase, telefono, "menu", {});
  await enviarMensaje(telefono, menuPrincipal());
}

// ── Helpers ────────────────────────────────────────────────────────────────

function menuPrincipal(): string {
  return [
    "¡Hola! 👋 Soy *Dulce*, la asistente de *Dulce Paladar* 🍰",
    "",
    "¿En qué te puedo ayudar hoy?",
    "",
    "*1* 🍫 Ver catálogo y precios",
    "*2* 🛍️ Hacer un pedido",
    "*3* 📦 Consultar estado de mi pedido",
    "",
    "Escribe el número de tu opción 😊",
  ].join("\n");
}

async function obtenerCatalogo(): Promise<string> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/bot/productos`,
      { headers: { "x-api-key": process.env.BOT_API_KEY! } }
    );
    const data = await res.json();
    const lineas: string[] = ["🍰 *Nuestro Catálogo*", ""];
    for (const [categoria, productos] of Object.entries(data.catalogo as Record<string, { nombre: string; precio: number; descripcion: string | null }[]>)) {
      lineas.push(`*${categoria}*`);
      for (const p of productos) {
        lineas.push(`• ${p.nombre} — ${formatearCOP(p.precio)}`);
        if (p.descripcion) lineas.push(`  _${p.descripcion}_`);
      }
      lineas.push("");
    }
    return lineas.join("\n");
  } catch {
    return "Lo sentimos, no pudimos cargar el catálogo en este momento 😔";
  }
}

async function guardarEstado(
  supabase: ReturnType<typeof createAdminClient>,
  telefono: string,
  estado: string,
  datos: DatosConversacion
) {
  await supabase.from("whatsapp_conversaciones").upsert(
    { telefono, estado, datos, actualizado_en: new Date().toISOString() },
    { onConflict: "telefono" }
  );
}

