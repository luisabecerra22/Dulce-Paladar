import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase-server";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const { titulo, cuerpo, url, tag, destinatarios } = await req.json();

  const supabase = await createClient();

  let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (destinatarios && destinatarios.length > 0) {
    query = query.in("user_id", destinatarios);
  }

  const { data: subs } = await query;
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, enviadas: 0 });
  }

  const payload = JSON.stringify({ title: titulo, body: cuerpo, url: url || "/dashboard", tag: tag || "dp" });

  const resultados = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );

  const enviadas = resultados.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, enviadas });
}
