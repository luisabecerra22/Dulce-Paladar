"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";

const TIPOS_IDENTIFICACION = [
  "Registro civil",
  "Tarjeta de identidad",
  "Cédula de ciudadanía",
  "Tarjeta de extranjería",
  "Cédula de extranjería",
  "NIT",
  "Pasaporte",
  "Documento de identificación extranjero",
  "NIT de otro país",
];

const RESPONSABLE_DE = [
  "IVA – Impuesto de Valor Agregado",
  "INC – Impuesto Nacional al Consumo",
  "IVA e INC",
  "No Aplica",
];

const RESPONSABILIDAD_FISCAL = [
  "Gran contribuyente",
  "Autorretenedor",
  "Agente de retención IVA",
  "Régimen simple de tributación",
  "No responsable",
];

const DEPARTAMENTOS = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Archipiélago de San Andrés, Providencia y Santa Catalina",
  "Atlántico",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
];

type ConfigNegocio = {
  id?: string;
  nombre: string;
  tipo_identificacion: string;
  numero_identificacion: string;
  responsable_de: string;
  responsabilidad_fiscal: string;
  contacto: string;
  email: string;
  direccion: string;
  departamento: string;
  ciudad: string;
  telefono: string;
  pagina_web: string;
  logo_url: string;
  facturacion_electronica: boolean;
};

type Toast = "idle" | "loading" | "success" | "error";

const EMPTY: ConfigNegocio = {
  nombre: "",
  tipo_identificacion: "NIT",
  numero_identificacion: "",
  responsable_de: "No Aplica",
  responsabilidad_fiscal: "No responsable",
  contacto: "",
  email: "",
  direccion: "",
  departamento: "",
  ciudad: "",
  telefono: "",
  pagina_web: "",
  logo_url: "",
  facturacion_electronica: false,
};

export default function NegocioPage() {
  const supabase = createClient();
  const [form, setForm] = useState<ConfigNegocio>(EMPTY);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [toast, setToast] = useState<Toast>("idle");
  const [toastMsg, setToastMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase
        .from("config_negocio")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data) {
        setForm(data as ConfigNegocio);
        if (data.logo_url) setLogoPreview(data.logo_url);
      }
    }
    cargar();
  }, []);

  function campo(key: keyof ConfigNegocio, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setToast("loading");
    setToastMsg("Guardando cambios...");

    try {
      let logo_url = form.logo_url;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `logo-negocio.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("config")
          .upload(path, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("config").getPublicUrl(path);
        logo_url = urlData.publicUrl;
      }

      const payload = { ...form, logo_url, updated_at: new Date().toISOString() };

      let error;
      if (form.id) {
        ({ error } = await supabase
          .from("config_negocio")
          .update(payload)
          .eq("id", form.id));
      } else {
        const { data, error: insertError } = await supabase
          .from("config_negocio")
          .insert(payload)
          .select()
          .single();
        error = insertError;
        if (data) setForm(data as ConfigNegocio);
      }

      if (error) throw error;

      setToast("success");
      setToastMsg("¡Información actualizada exitosamente!");
    } catch {
      setToast("error");
      setToastMsg("Error al guardar. Intenta de nuevo.");
    } finally {
      setTimeout(() => setToast("idle"), 3500);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primario/40 focus:border-primario transition-colors";
  const selectCls = inputCls + " cursor-pointer";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-3xl">
      {/* Toast */}
      {toast !== "idle" && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium transition-all ${
            toast === "loading"
              ? "bg-[#C264FA]"
              : toast === "success"
              ? "bg-emerald-500"
              : "bg-red-500"
          }`}
        >
          {toast === "loading" && (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {toast === "success" && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast === "error" && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toastMsg}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900">
          Información del negocio
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Datos generales para identificación y facturación electrónica
        </p>
      </div>

      <form onSubmit={guardar} className="space-y-6">
        {/* Logo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Logo del negocio</h2>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
              {logoPreview ? (
                <Image src={logoPreview} alt="Logo" width={80} height={80} className="object-contain w-full h-full" unoptimized />
              ) : (
                <span className="text-3xl">🍰</span>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:border-primario hover:text-primario transition-colors"
              >
                Elegir archivo
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
              <p className="text-xs text-gray-400 mt-1.5">PNG o JPG recomendado. Máximo 2 MB.</p>
            </div>
          </div>
        </div>

        {/* Datos generales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Datos generales</h2>

          <div>
            <label className={labelCls}>Nombre del negocio *</label>
            <input
              required
              type="text"
              value={form.nombre}
              onChange={(e) => campo("nombre", e.target.value)}
              className={inputCls}
              placeholder="Dulce Paladar"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tipo de identificación *</label>
              <select
                required
                value={form.tipo_identificacion}
                onChange={(e) => campo("tipo_identificacion", e.target.value)}
                className={selectCls}
              >
                {TIPOS_IDENTIFICACION.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Número (sin puntos ni dígito de verificación) *</label>
              <input
                required
                type="text"
                value={form.numero_identificacion}
                onChange={(e) => campo("numero_identificacion", e.target.value)}
                className={inputCls}
                placeholder="900000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Responsable de *</label>
              <select
                required
                value={form.responsable_de}
                onChange={(e) => campo("responsable_de", e.target.value)}
                className={selectCls}
              >
                {RESPONSABLE_DE.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsabilidad fiscal *</label>
              <select
                required
                value={form.responsabilidad_fiscal}
                onChange={(e) => campo("responsabilidad_fiscal", e.target.value)}
                className={selectCls}
              >
                {RESPONSABILIDAD_FISCAL.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contacto / Responsable</label>
              <input
                type="text"
                value={form.contacto}
                onChange={(e) => campo("contacto", e.target.value)}
                className={inputCls}
                placeholder="Luisa Becerra"
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => campo("email", e.target.value)}
                className={inputCls}
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => campo("telefono", e.target.value)}
                className={inputCls}
                placeholder="3187222977"
              />
            </div>
            <div>
              <label className={labelCls}>Página web</label>
              <input
                type="text"
                value={form.pagina_web}
                onChange={(e) => campo("pagina_web", e.target.value)}
                className={inputCls}
                placeholder="www.dulcepaladar.com"
              />
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Ubicación</h2>

          <div>
            <label className={labelCls}>País</label>
            <input
              type="text"
              value="Colombia"
              disabled
              className={inputCls + " bg-gray-50 text-gray-400 cursor-not-allowed"}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Departamento *</label>
              <select
                required
                value={form.departamento}
                onChange={(e) => campo("departamento", e.target.value)}
                className={selectCls}
              >
                <option value="">— Seleccione —</option>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ciudad *</label>
              <input
                required
                type="text"
                value={form.ciudad}
                onChange={(e) => campo("ciudad", e.target.value)}
                className={inputCls}
                placeholder="Barranquilla"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => campo("direccion", e.target.value)}
              className={inputCls}
              placeholder="Calle 72 # 45-12"
            />
          </div>
        </div>

        {/* Facturación electrónica */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            Habilitación de facturación electrónica
          </h2>
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={form.facturacion_electronica}
                onChange={(e) => campo("facturacion_electronica", e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-10 h-6 rounded-full transition-colors ${
                  form.facturacion_electronica ? "bg-primario" : "bg-gray-200"
                }`}
              />
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.facturacion_electronica ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 group-hover:text-primario transition-colors">
                Habilitar facturación electrónica
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Activa esta opción cuando el negocio esté listo para emitir facturas electrónicas ante la DIAN.
              </p>
            </div>
          </label>
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end pb-8">
          <button
            type="submit"
            disabled={toast === "loading"}
            className="px-6 py-2.5 rounded-lg bg-primario text-white font-semibold text-sm hover:bg-primario/90 disabled:opacity-60 transition-colors shadow-sm"
          >
            {toast === "loading" ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
