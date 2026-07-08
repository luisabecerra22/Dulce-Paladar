"use client";

import { useEffect, useState } from "react";

export default function NotificacionesProvider() {
  const [estado, setEstado] = useState<"idle" | "solicitando" | "activo" | "denegado">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(async (reg) => {
      const perm = Notification.permission;
      if (perm === "granted") {
        await suscribir(reg);
        setEstado("activo");
      } else if (perm === "default") {
        setEstado("idle");
      } else {
        setEstado("denegado");
      }
    });
  }, []);

  async function suscribir(reg?: ServiceWorkerRegistration) {
    try {
      const registration = reg || (await navigator.serviceWorker.ready);
      const existing = await registration.pushManager.getSubscription();
      const sub = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      await fetch("/api/notificaciones/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
      setEstado("activo");
    } catch {
      setEstado("denegado");
    }
  }

  async function activar() {
    setEstado("solicitando");
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      await suscribir();
    } else {
      setEstado("denegado");
    }
  }

  if (estado === "idle") {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-xl border border-crema-oscuro p-4 max-w-xs animate-in slide-in-from-bottom-4">
        <p className="text-sm font-semibold text-cafe-oscuro mb-1">🔔 Activar notificaciones</p>
        <p className="text-xs text-cafe mb-3">Recibe alertas cuando un pedido esté listo o el stock esté bajo.</p>
        <div className="flex gap-2">
          <button
            onClick={activar}
            className="flex-1 py-1.5 bg-primario text-white rounded-lg text-xs font-semibold hover:bg-primario/90 transition-colors"
          >
            Activar
          </button>
          <button
            onClick={() => setEstado("denegado")}
            className="px-3 py-1.5 border border-crema-oscuro rounded-lg text-xs text-cafe hover:bg-crema transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}
