"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

type Categoria = { id: string; nombre: string };
type Variacion = { id?: string; nombre: string; precio: number; costo_estimado: number | null };
type Producto = {
  id?: string;
  categoria_id: string;
  nombre: string;
  descripcion: string;
  tipo: "simple" | "variaciones" | "personalizado";
  precio_base: number | null;
  costo_estimado: number | null;
  foto_url: string | null;
  activo: boolean;
  visible_web: boolean;
  en_promocion: boolean;
  descuento_porcentaje: number;
  variaciones?: Variacion[];
};

const productoVacio: Producto = {
  categoria_id: "",
  nombre: "",
  descripcion: "",
  tipo: "simple",
  precio_base: null,
  costo_estimado: null,
  foto_url: null,
  activo: true,
  visible_web: true,
  en_promocion: false,
  descuento_porcentaje: 0,
};

export default function FormularioProducto({
  categorias,
  productoInicial,
  variacionesIniciales,
}: {
  categorias: Categoria[];
  productoInicial?: Producto;
  variacionesIniciales?: Variacion[];
}) {
  const esEdicion = !!productoInicial?.id;
  const [producto, setProducto] = useState<Producto>(
    productoInicial || { ...productoVacio, categoria_id: categorias[0]?.id || "" }
  );
  const [variaciones, setVariaciones] = useState<Variacion[]>(variacionesIniciales || []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function actualizarCampo(campo: string, valor: unknown) {
    setProducto((prev) => ({ ...prev, [campo]: valor }));
  }

  function agregarVariacion() {
    setVariaciones((prev) => [...prev, { nombre: "", precio: 0, costo_estimado: null }]);
  }

  function actualizarVariacion(index: number, campo: string, valor: unknown) {
    setVariaciones((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [campo]: valor } : v))
    );
  }

  function eliminarVariacion(index: number) {
    setVariaciones((prev) => prev.filter((_, i) => i !== index));
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoFoto(true);
    const extension = file.name.split(".").pop();
    const nombreArchivo = `${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("productos")
      .upload(nombreArchivo, file, { upsert: true });

    if (uploadError) {
      alert("Error al subir foto: " + uploadError.message);
      setSubiendoFoto(false);
      return;
    }

    const { data } = supabase.storage.from("productos").getPublicUrl(nombreArchivo);
    actualizarCampo("foto_url", data.publicUrl);
    setSubiendoFoto(false);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);

    if (!producto.nombre.trim()) {
      setError("El nombre es obligatorio");
      setGuardando(false);
      return;
    }

    if (producto.tipo === "simple" && !producto.precio_base) {
      setError("El precio es obligatorio para productos simples");
      setGuardando(false);
      return;
    }

    if (producto.tipo === "variaciones" && variaciones.length === 0) {
      setError("Agrega al menos una variación");
      setGuardando(false);
      return;
    }

    const datosProducto = {
      categoria_id: producto.categoria_id,
      nombre: producto.nombre.trim(),
      descripcion: producto.descripcion.trim() || null,
      tipo: producto.tipo,
      precio_base: producto.tipo === "simple" ? producto.precio_base : null,
      costo_estimado: producto.tipo === "simple" ? producto.costo_estimado : null,
      foto_url: producto.foto_url,
      activo: producto.activo,
      visible_web: producto.visible_web,
      en_promocion: producto.en_promocion,
      descuento_porcentaje: producto.en_promocion ? producto.descuento_porcentaje : 0,
    };

    if (esEdicion) {
      const { error } = await supabase
        .from("productos")
        .update(datosProducto)
        .eq("id", producto.id);

      if (error) {
        setError("Error al actualizar: " + error.message);
        setGuardando(false);
        return;
      }

      // Actualizar variaciones
      if (producto.tipo === "variaciones") {
        await supabase.from("variaciones").delete().eq("producto_id", producto.id!);
        for (const v of variaciones) {
          await supabase.from("variaciones").insert({
            producto_id: producto.id!,
            nombre: v.nombre,
            precio: v.precio,
            costo_estimado: v.costo_estimado,
          });
        }
      }
    } else {
      const { data: nuevoProducto, error } = await supabase
        .from("productos")
        .insert(datosProducto)
        .select()
        .single();

      if (error) {
        setError("Error al crear: " + error.message);
        setGuardando(false);
        return;
      }

      // Insertar variaciones
      if (producto.tipo === "variaciones" && nuevoProducto) {
        for (const v of variaciones) {
          await supabase.from("variaciones").insert({
            producto_id: nuevoProducto.id,
            nombre: v.nombre,
            precio: v.precio,
            costo_estimado: v.costo_estimado,
          });
        }
      }
    }

    router.push("/catalogo");
    router.refresh();
  }

  return (
    <form onSubmit={handleGuardar} className="max-w-2xl space-y-6">
      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del producto *
        </label>
        <input
          type="text"
          value={producto.nombre}
          onChange={(e) => actualizarCampo("nombre", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario focus:border-transparent"
          placeholder="Ej: Torta de Chocolate"
        />
      </div>

      {/* Categoría */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Categoría *
        </label>
        <select
          value={producto.categoria_id}
          onChange={(e) => actualizarCampo("categoria_id", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario focus:border-transparent"
        >
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          value={producto.descripcion}
          onChange={(e) => actualizarCampo("descripcion", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario focus:border-transparent"
          placeholder="Descripción del producto (opcional)"
        />
      </div>

      {/* Tipo de producto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de producto *
        </label>
        <div className="flex gap-3">
          {[
            { value: "simple", label: "Precio fijo", desc: "Un solo precio" },
            { value: "variaciones", label: "Con variaciones", desc: "Tamaños, porciones" },
            { value: "personalizado", label: "Personalizado", desc: "Se cotiza" },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => actualizarCampo("tipo", t.value)}
              className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                producto.tipo === t.value
                  ? "border-primario bg-primario/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="block text-sm font-semibold">{t.label}</span>
              <span className="block text-xs text-gray-500">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Precio (solo simple) */}
      {producto.tipo === "simple" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio de venta (COP) *
            </label>
            <input
              type="number"
              value={producto.precio_base || ""}
              onChange={(e) => actualizarCampo("precio_base", Number(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario focus:border-transparent"
              placeholder="Ej: 6000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Costo estimado (COP)
            </label>
            <input
              type="number"
              value={producto.costo_estimado || ""}
              onChange={(e) => actualizarCampo("costo_estimado", Number(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario focus:border-transparent"
              placeholder="Ej: 3000"
            />
          </div>
        </div>
      )}

      {/* Variaciones */}
      {producto.tipo === "variaciones" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Variaciones
          </label>
          <div className="space-y-3">
            {variaciones.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={v.nombre}
                  onChange={(e) => actualizarVariacion(i, "nombre", e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="Ej: 10 porciones"
                />
                <input
                  type="number"
                  value={v.precio || ""}
                  onChange={(e) => actualizarVariacion(i, "precio", Number(e.target.value))}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="Precio"
                />
                <input
                  type="number"
                  value={v.costo_estimado || ""}
                  onChange={(e) => actualizarVariacion(i, "costo_estimado", Number(e.target.value) || null)}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="Costo"
                />
                <button
                  type="button"
                  onClick={() => eliminarVariacion(i)}
                  className="text-red-500 hover:text-red-700 text-lg"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={agregarVariacion}
            className="mt-2 text-sm text-primario font-medium hover:underline"
          >
            + Agregar variación
          </button>
        </div>
      )}

      {/* Foto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Foto del producto
        </label>
        <div className="flex items-center gap-4">
          {producto.foto_url ? (
            <img
              src={producto.foto_url}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border"
            />
          ) : (
            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
              📷
            </div>
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={subirFoto}
              disabled={subiendoFoto}
              className="text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primario/10 file:text-primario file:font-medium hover:file:bg-primario/20"
            />
            {subiendoFoto && <p className="text-xs text-gray-400 mt-1">Subiendo...</p>}
          </div>
        </div>
      </div>

      {/* Opciones */}
      <div className="flex gap-6 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={producto.activo}
            onChange={(e) => actualizarCampo("activo", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primario focus:ring-primario"
          />
          <span className="text-sm text-gray-700">Producto activo</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={producto.visible_web}
            onChange={(e) => actualizarCampo("visible_web", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primario focus:ring-primario"
          />
          <span className="text-sm text-gray-700">Visible en página web</span>
        </label>
      </div>

      {/* Promoción */}
      <div className="border border-[#F400A1]/30 rounded-xl p-4 bg-[#F400A1]/5">
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={producto.en_promocion}
            onChange={(e) => actualizarCampo("en_promocion", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#F400A1] focus:ring-[#F400A1]"
          />
          <span className="text-sm font-semibold text-[#F400A1]">🏷️ En promoción</span>
        </label>
        {producto.en_promocion && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700 whitespace-nowrap">
              Descuento:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={99}
                value={producto.descuento_porcentaje || ""}
                onChange={(e) =>
                  actualizarCampo("descuento_porcentaje", Math.min(99, Math.max(1, Number(e.target.value) || 1)))
                }
                className="w-20 px-3 py-2 border border-[#F400A1]/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F400A1] text-center font-bold text-[#F400A1]"
                placeholder="0"
              />
              <span className="text-sm font-bold text-[#F400A1]">%</span>
            </div>
            {producto.precio_base && producto.descuento_porcentaje > 0 && (
              <span className="text-xs text-gray-500">
                Precio con descuento:{" "}
                <span className="font-semibold text-green-600">
                  ${Math.round(producto.precio_base * (1 - producto.descuento_porcentaje / 100)).toLocaleString("es-CO")}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
      )}

      {/* Botones */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={guardando}
          className="px-6 py-2.5 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors disabled:opacity-50"
        >
          {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear producto"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/catalogo")}
          className="px-6 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
