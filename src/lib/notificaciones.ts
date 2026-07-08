export async function enviarNotificacion(opts: {
  titulo: string;
  cuerpo: string;
  url?: string;
  tag?: string;
  destinatarios?: string[];
}) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("supabase.co", "") ?? ""}api/notificaciones/enviar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
  } catch {
    // notificaciones son best-effort
  }
}
