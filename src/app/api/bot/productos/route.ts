import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

function verificarApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("api_key");
  return key === process.env.BOT_API_KEY;
}

export async function GET(req: NextRequest) {
  if (!verificarApiKey(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: productos, error } = await supabase
    .from("productos")
    .select("id, nombre, descripcion, precio, categoria_id, categorias(nombre), disponible, imagen_url")
    .eq("activo", true)
    .eq("disponible", true)
    .order("categoria_id")
    .order("nombre");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Agrupar por categoría para que el bot lo entienda mejor
  const catalogo: Record<string, { nombre: string; precio: number; descripcion: string | null }[]> = {};
  for (const p of productos || []) {
    const cat = (p.categorias as unknown as { nombre: string } | null)?.nombre || "General";
    if (!catalogo[cat]) catalogo[cat] = [];
    catalogo[cat].push({
      nombre: p.nombre,
      precio: p.precio,
      descripcion: p.descripcion,
    });
  }

  return NextResponse.json({
    negocio: "Dulce Paladar — Repostería Artesanal",
    whatsapp: "+573156192968",
    catalogo,
    total_productos: productos?.length || 0,
  });
}
