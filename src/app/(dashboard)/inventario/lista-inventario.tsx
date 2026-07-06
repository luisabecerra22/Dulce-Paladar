"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { formatoCOP } from "@/lib/formato";

type Proveedor = { id: string; nombre: string };

type Insumo = {
  id: string;
  nombre: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  costo_unitario: number;
  proveedor_id: string | null;
  activo: boolean;
  proveedores: { nombre: string } | null;
};

type FormInsumo = {
  nombre: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  costo_unitario: number;
  proveedor_id: string;
};

type FormMovimiento = {
  tipo: "entrada" | "salida";
  cantidad: number;
  costo_total: number;
  nota: string;
};

const UNIDADES = ["kg", "g", "L", "mL", "unidades", "lb", "oz"];

export default function ListaInventario({
  insumosIniciales,
  proveedores,
}: {
  insumosIniciales: Insumo[];
  proveedores: Proveedor[];
}) {
  const [insumos, setInsumos] = useState<Insumo[]>(insumosIniciales);
  const [modalInsumo, setModalInsumo] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [modalMovimiento, setModalMovimiento] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormInsumo>({
    nombre: "",
    unidad: "kg",
    stock_actual: 0,
    stock_minimo: 0,
    costo_unitario: 0,
    proveedor_id: "",
  });
  const [formMov, setFormMov] = useState<FormMovimiento>({
    tipo: "entrada",
    cantidad: 0,
    costo_total: 0,
    nota: "",
  });

  const router = useRouter();
  const supabase = createClient();

  const alertas = insumos.filter(
    (i) => i.activo && i.stock_actual <= i.stock_minimo
  );

  async function recargar() {
    const { data } = await supabase
      .from("insumos")
      .select("*, proveedores(nombre)")
      .order("nombre");
    if (data) setInsumos(data as Insumo[]);
  }

  function abrirNuevo() {
    setEditandoId(null);
    setForm({ nombre: "", unidad: "kg", stock_actual: 0, stock_minimo: 0, costo_unitario: 0, proveedor_id: "" });
    setError("");
    setModalInsumo(true);
  }

  function abrirEditar(insumo: Insumo) {
    setEditandoId(insumo.id);
    setForm({
      nombre: insumo.nombre,
      unidad: insumo.unidad,
      stock_actual: insumo.stock_actual,
      stock_minimo: insumo.stock_minimo,
      costo_unitario: insumo.costo_unitario,
      proveedor_id: insumo.proveedor_id || "",
    });
    setError("");
    setModalInsumo(true);
  }

  async function guardarInsumo() {
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setGuardando(true);
    setError("");

    const datos = {
      nombre: form.nombre.trim(),
      unidad: form.unidad,
      stock_actual: form.stock_actual,
      stock_minimo: form.stock_minimo,
      costo_unitario: form.costo_unitario,
      proveedor_id: form.proveedor_id || null,
    };

    if (editandoId) {
      const { error: err } = await supabase
        .from("insumos")
        .update(datos)
        .eq("id", editandoId);
      if (err) {
        setError("Error: " + err.message);
        setGuardando(false);
        return;
      }
    } else {
      const { error: err } = await supabase.from("insumos").insert(datos);
      if (err) {
        setError("Error: " + err.message);
        setGuardando(false);
        return;
      }
    }

    setGuardando(false);
    setModalInsumo(false);
    await recargar();
    router.refresh();
  }

  function abrirMovimiento(insumoId: string) {
    setModalMovimiento(insumoId);
    setFormMov({ tipo: "entrada", cantidad: 0, costo_total: 0, nota: "" });
    setError("");
  }

  async function registrarMovimiento() {
    if (formMov.cantidad <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }
    setGuardando(true);
    setError("");

    const insumo = insumos.find((i) => i.id === modalMovimiento);
    if (!insumo) return;

    if (formMov.tipo === "salida" && formMov.cantidad > insumo.stock_actual) {
      setError("No hay suficiente stock");
      setGuardando(false);
      return;
    }

    const { error: errMov } = await supabase.from("movimientos_inv").insert({
      insumo_id: modalMovimiento,
      tipo: formMov.tipo,
      cantidad: formMov.cantidad,
      costo_total: formMov.costo_total || 0,
      nota: formMov.nota.trim() || null,
    });

    if (errMov) {
      setError("Error: " + errMov.message);
      setGuardando(false);
      return;
    }

    const nuevoStock =
      formMov.tipo === "entrada"
        ? insumo.stock_actual + formMov.cantidad
        : insumo.stock_actual - formMov.cantidad;

    await supabase
      .from("insumos")
      .update({ stock_actual: nuevoStock })
      .eq("id", modalMovimiento);

    setGuardando(false);
    setModalMovimiento(null);
    await recargar();
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900">
            Inventario
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {insumos.filter((i) => i.activo).length} insumos activos
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
        >
          + Nuevo insumo
        </button>
      </div>

      {/* Alertas de stock bajo */}
      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-bold text-red-700 mb-2">
            ⚠️ Stock bajo ({alertas.length})
          </h3>
          <div className="space-y-1">
            {alertas.map((a) => (
              <p key={a.id} className="text-sm text-red-600">
                <span className="font-semibold">{a.nombre}</span>: {a.stock_actual} {a.unidad} (mínimo: {a.stock_minimo})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de insumos */}
      {insumos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">No hay insumos registrados</p>
          <p className="text-gray-400 text-sm mb-4">
            Agrega tus materias primas para controlar el inventario
          </p>
          <button
            onClick={abrirNuevo}
            className="px-4 py-2 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors text-sm"
          >
            + Agregar primer insumo
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Insumo</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Stock</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Mínimo</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Costo/u</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Proveedor</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {insumos.map((insumo) => {
                  const stockBajo = insumo.stock_actual <= insumo.stock_minimo;
                  return (
                    <tr key={insumo.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{insumo.nombre}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${stockBajo ? "text-red-600" : "text-gray-900"}`}>
                          {insumo.stock_actual}
                        </span>
                        <span className="text-gray-400 ml-1">{insumo.unidad}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {insumo.stock_minimo} {insumo.unidad}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {stockBajo ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">
                            Bajo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatoCOP(insumo.costo_unitario)}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {insumo.proveedores?.nombre || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => abrirMovimiento(insumo.id)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            +/−
                          </button>
                          <button
                            onClick={() => abrirEditar(insumo)}
                            className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Crear/Editar insumo */}
      {modalInsumo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editandoId ? "Editar insumo" : "Nuevo insumo"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="Ej: Harina de trigo"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select
                    value={form.unidad}
                    onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  >
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo por unidad</label>
                  <input
                    type="number"
                    value={form.costo_unitario || ""}
                    onChange={(e) => setForm({ ...form, costo_unitario: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                    placeholder="COP"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.stock_actual || ""}
                    onChange={(e) => setForm({ ...form, stock_actual: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.stock_minimo || ""}
                    onChange={(e) => setForm({ ...form, stock_minimo: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <select
                  value={form.proveedor_id}
                  onChange={(e) => setForm({ ...form, proveedor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                >
                  <option value="">Sin proveedor</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={guardarInsumo}
                  disabled={guardando}
                  className="flex-1 py-2.5 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear insumo"}
                </button>
                <button
                  onClick={() => setModalInsumo(false)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar movimiento */}
      {modalMovimiento && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Registrar movimiento
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {insumos.find((i) => i.id === modalMovimiento)?.nombre}
            </p>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormMov({ ...formMov, tipo: "entrada" })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formMov.tipo === "entrada"
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-gray-50 text-gray-600 border border-gray-200"
                  }`}
                >
                  📥 Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setFormMov({ ...formMov, tipo: "salida" })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formMov.tipo === "salida"
                      ? "bg-red-100 text-red-700 border border-red-300"
                      : "bg-gray-50 text-gray-600 border border-gray-200"
                  }`}
                >
                  📤 Salida
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formMov.cantidad || ""}
                  onChange={(e) => setFormMov({ ...formMov, cantidad: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder={`En ${insumos.find((i) => i.id === modalMovimiento)?.unidad || "unidades"}`}
                />
              </div>
              {formMov.tipo === "entrada" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo total (COP)</label>
                  <input
                    type="number"
                    value={formMov.costo_total || ""}
                    onChange={(e) => setFormMov({ ...formMov, costo_total: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                    placeholder="Cuánto costó esta compra"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
                <input
                  type="text"
                  value={formMov.nota}
                  onChange={(e) => setFormMov({ ...formMov, nota: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primario"
                  placeholder="Ej: Compra semanal"
                />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={registrarMovimiento}
                  disabled={guardando}
                  className={`flex-1 py-2.5 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 ${
                    formMov.tipo === "entrada"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {guardando ? "..." : formMov.tipo === "entrada" ? "Registrar entrada" : "Registrar salida"}
                </button>
                <button
                  onClick={() => setModalMovimiento(null)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
