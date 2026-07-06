import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, password, nombre, rol } = await request.json();

  if (!email || !password || !nombre || !rol) {
    return NextResponse.json(
      { error: "Todos los campos son obligatorios" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol },
  });

  if (error) {
    console.error("Error creando usuario:", JSON.stringify(error));
    return NextResponse.json({ error: error.message, code: error.code, status: error.status }, { status: 400 });
  }

  return NextResponse.json({ usuario: data.user });
}
