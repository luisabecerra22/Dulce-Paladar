"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatoCOP } from "@/lib/formato";

type Categoria = { id: string; nombre: string };
type Variacion = { id: string; nombre: string; precio: number };
type Producto = {
  id: string;
  categoria_id: string;
  nombre: string;
  tipo: string;
  precio_base: number | null;
  foto_url: string | null;
  variaciones: Variacion[];
};

type ItemCarrito = {
  key: string;
  producto_id: string;
  variacion_id: string | null;
  nombre: string;
  detalle: string;
  precio: number;
  cantidad: number;
  notas: string;
};

type PedidoCreado = {
  id: string;
  numero: number;
  tipo: string;
  mesa_numero: number | null;
  total: number;
  medio_pago: string;
  items: ItemCarrito[];
  cliente_nombre: string;
  fecha: string;
};

export default function PosTerminal({
  categorias,
  productos,
  perfilId,
}: {
  categorias: Categoria[];
  productos: Producto[];
  perfilId: string;
}) {
  const [categoriaActiva, setCategoriaActiva] = useState<string>("todas");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [tipoPedido, setTipoPedido] = useState<string>("mesa");
  const [mesaNumero, setMesaNumero] = useState<number | null>(null);
  const [medioPago, setMedioPago] = useState<string>("efectivo");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [notas, setNotas] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");
  const [recibo, setRecibo] = useState<PedidoCreado | null>(null);
  const [variacionModal, setVariacionModal] = useState<Producto | null>(null);

  const productosFiltrados = useMemo(() => {
    if (categoriaActiva === "todas") return productos;
    return productos.filter((p) => p.categoria_id === categoriaActiva);
  }, [categoriaActiva, productos]);

  const total = useMemo(
    () => carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
    [carrito]
  );

  function agregarAlCarrito(producto: Producto, variacion?: Variacion) {
    const key = variacion
      ? `${producto.id}-${variacion.id}`
      : producto.id;
    const precio = variacion ? variacion.precio : producto.precio_base || 0;
    const detalle = variacion ? variacion.nombre : "";

    setCarrito((prev) => {
      const existente = prev.find((item) => item.key === key);
      if (existente) {
        return prev.map((item) =>
          item.key === key ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [
        ...prev,
        {
          key,
          producto_id: producto.id,
          variacion_id: variacion?.id || null,
          nombre: producto.nombre,
          detalle,
          precio,
          cantidad: 1,
          notas: "",
        },
      ];
    });
  }

  function handleProductoClick(producto: Producto) {
    if (producto.tipo === "variaciones" && producto.variaciones?.length > 0) {
      setVariacionModal(producto);
    } else if (producto.tipo === "simple") {
      agregarAlCarrito(producto);
    }
  }

  function cambiarCantidad(key: string, delta: number) {
    setCarrito((prev) =>
      prev
        .map((item) =>
          item.key === key
            ? { ...item, cantidad: Math.max(0, item.cantidad + delta) }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }

  function quitarItem(key: string) {
    setCarrito((prev) => prev.filter((item) => item.key !== key));
  }

  function limpiarCarrito() {
    setCarrito([]);
    setClienteNombre("");
    setClienteTelefono("");
    setDireccionEntrega("");
    setNotas("");
    setMesaNumero(null);
    setError("");
  }

  async function crearPedido() {
    if (carrito.length === 0) {
      setError("Agrega productos al carrito");
      return;
    }
    if (tipoPedido === "mesa" && !mesaNumero) {
      setError("Selecciona el número de mesa");
      return;
    }
    if (tipoPedido === "domicilio" && !direccionEntrega.trim()) {
      setError("Ingresa la dirección de entrega");
      return;
    }

    setCreando(true);
    setError("");
    const supabase = createClient();

    let clienteId: string | null = null;
    if (clienteNombre.trim()) {
      const { data: clienteExistente } = await supabase
        .from("clientes")
        .select("id")
        .eq("nombre", clienteNombre.trim())
        .maybeSingle();

      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else {
        const { data: nuevoCliente } = await supabase
          .from("clientes")
          .insert({
            nombre: clienteNombre.trim(),
            telefono: clienteTelefono.trim() || null,
          })
          .select("id")
          .single();
        clienteId = nuevoCliente?.id || null;
      }
    }

    const { data: pedido, error: errPedido } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: clienteId,
        tipo: tipoPedido,
        mesa_numero: tipoPedido === "mesa" ? mesaNumero : null,
        direccion_entrega: tipoPedido === "domicilio" ? direccionEntrega.trim() : null,
        estado: "pendiente",
        subtotal: total,
        total,
        medio_pago: medioPago,
        canal: "pos",
        notas: notas.trim() || null,
        creado_por: perfilId || null,
      })
      .select("id, numero")
      .single();

    if (errPedido || !pedido) {
      setError("Error al crear pedido: " + (errPedido?.message || ""));
      setCreando(false);
      return;
    }

    const items = carrito.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.producto_id,
      variacion_id: item.variacion_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      notas: item.notas || null,
    }));

    const { error: errItems } = await supabase
      .from("pedido_items")
      .insert(items);

    if (errItems) {
      setError("Error al agregar items: " + errItems.message);
      setCreando(false);
      return;
    }

    const { error: errPago } = await supabase.from("pagos").insert({
      pedido_id: pedido.id,
      monto: total,
      medio: medioPago,
      tipo: "total",
    });

    if (errPago) {
      setError("Error al registrar pago: " + errPago.message);
      setCreando(false);
      return;
    }

    await supabase
      .from("pedidos")
      .update({ estado: "pendiente" })
      .eq("id", pedido.id);

    setRecibo({
      id: pedido.id,
      numero: pedido.numero,
      tipo: tipoPedido,
      mesa_numero: tipoPedido === "mesa" ? mesaNumero : null,
      total,
      medio_pago: medioPago,
      items: [...carrito],
      cliente_nombre: clienteNombre.trim(),
      fecha: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }),
    });

    setCreando(false);
    limpiarCarrito();
  }

  if (recibo) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">✅</div>
            <h2 className="text-xl font-bold text-gray-900 font-[family-name:var(--font-principal)]">
              Pedido #{recibo.numero}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{recibo.fecha}</p>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 mb-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Tipo:</span>
              <span className="font-medium capitalize">{recibo.tipo}</span>
            </div>
            {recibo.mesa_numero && (
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Mesa:</span>
                <span className="font-medium">{recibo.mesa_numero}</span>
              </div>
            )}
            {recibo.cliente_nombre && (
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Cliente:</span>
                <span className="font-medium">{recibo.cliente_nombre}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Pago:</span>
              <span className="font-medium capitalize">{recibo.medio_pago}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3 mb-3 space-y-2">
            {recibo.items.map((item) => (
              <div key={item.key} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.cantidad}x {item.nombre}
                  {item.detalle && (
                    <span className="text-gray-400"> ({item.detalle})</span>
                  )}
                </span>
                <span className="font-medium text-gray-900">
                  {formatoCOP(item.precio * item.cantidad)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 pt-3">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primario">{formatoCOP(recibo.total)}</span>
            </div>
          </div>

          <button
            onClick={() => setRecibo(null)}
            className="w-full mt-6 px-4 py-3 bg-primario text-white rounded-lg font-semibold hover:bg-primario-oscuro transition-colors"
          >
            Nuevo pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-6rem)]">
      {/* Panel izquierdo: Productos */}
      <div className="flex-1 flex flex-col min-w-0">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900 mb-4">
          POS - Punto de Venta
        </h1>

        {/* Categorías */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setCategoriaActiva("todas")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categoriaActiva === "todas"
                ? "bg-primario text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-primario"
            }`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaActiva(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                categoriaActiva === cat.id
                  ? "bg-primario text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-primario"
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {productosFiltrados.map((producto) => (
              <button
                key={producto.id}
                onClick={() => handleProductoClick(producto)}
                disabled={producto.tipo === "personalizado"}
                className={`bg-white rounded-xl border border-gray-200 p-3 text-left hover:shadow-md hover:border-primario/30 transition-all ${
                  producto.tipo === "personalizado" ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {producto.foto_url ? (
                    <img
                      src={producto.foto_url}
                      alt={producto.nombre}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-2xl">🧁</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {producto.nombre}
                </p>
                {producto.tipo === "simple" && (
                  <p className="text-sm font-bold text-primario">
                    {formatoCOP(producto.precio_base)}
                  </p>
                )}
                {producto.tipo === "variaciones" && (
                  <p className="text-xs text-secundario font-semibold">
                    Desde{" "}
                    {formatoCOP(
                      Math.min(...producto.variaciones.map((v) => v.precio))
                    )}
                  </p>
                )}
                {producto.tipo === "personalizado" && (
                  <p className="text-xs text-gray-400">Cotizar</p>
                )}
              </button>
            ))}
          </div>
          {productosFiltrados.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No hay productos en esta categoría
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho: Carrito */}
      <div className="w-80 bg-white rounded-xl border border-gray-200 flex flex-col">
        {/* Tipo de pedido */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 mb-2">
            Tipo de pedido
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { value: "mesa", label: "Mesa", icon: "🪑" },
              { value: "recoger", label: "Recoger", icon: "🛍️" },
              { value: "domicilio", label: "Domicilio", icon: "🛵" },
              { value: "encargo", label: "Encargo", icon: "📋" },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipoPedido(t.value)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tipoPedido === t.value
                    ? "bg-primario text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {tipoPedido === "mesa" && (
            <div className="mt-2">
              <label className="block text-xs text-gray-500 mb-1">
                N° Mesa
              </label>
              <div className="flex gap-1 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMesaNumero(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                      mesaNumero === n
                        ? "bg-primario text-white"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tipoPedido === "domicilio" && (
            <input
              type="text"
              value={direccionEntrega}
              onChange={(e) => setDireccionEntrega(e.target.value)}
              placeholder="Dirección de entrega"
              className="mt-2 w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario"
            />
          )}
        </div>

        {/* Cliente (opcional) */}
        <div className="px-4 py-2 border-b border-gray-100">
          <input
            type="text"
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            placeholder="Cliente (opcional)"
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario"
          />
        </div>

        {/* Items del carrito */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {carrito.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <p className="text-3xl mb-2">🛒</p>
              <p className="text-sm">Carrito vacío</p>
              <p className="text-xs">Toca un producto para agregarlo</p>
            </div>
          ) : (
            carrito.map((item) => (
              <div
                key={item.key}
                className="bg-gray-50 rounded-lg p-3 relative group"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.nombre}
                    </p>
                    {item.detalle && (
                      <p className="text-xs text-gray-400">{item.detalle}</p>
                    )}
                  </div>
                  <button
                    onClick={() => quitarItem(item.key)}
                    className="text-gray-300 hover:text-red-500 text-lg leading-none ml-2"
                  >
                    ×
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cambiarCantidad(item.key, -1)}
                      className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 text-sm flex items-center justify-center hover:border-primario"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold w-6 text-center">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => cambiarCantidad(item.key, 1)}
                      className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 text-sm flex items-center justify-center hover:border-primario"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-bold text-primario">
                    {formatoCOP(item.precio * item.cantidad)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: total, pago y botón */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          {/* Medio de pago */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMedioPago("efectivo")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                medioPago === "efectivo"
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-gray-50 text-gray-600 border border-gray-200"
              }`}
            >
              💵 Efectivo
            </button>
            <button
              type="button"
              onClick={() => setMedioPago("transferencia")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                medioPago === "transferencia"
                  ? "bg-blue-100 text-blue-700 border border-blue-300"
                  : "bg-gray-50 text-gray-600 border border-gray-200"
              }`}
            >
              📱 Transferencia
            </button>
          </div>

          {/* Notas */}
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Notas del pedido (opcional)"
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario"
          />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Total</span>
            <span className="text-2xl font-bold text-primario">
              {formatoCOP(total)}
            </span>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            {carrito.length > 0 && (
              <button
                type="button"
                onClick={limpiarCarrito}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={crearPedido}
              disabled={creando || carrito.length === 0}
              className="flex-1 py-2.5 bg-primario text-white rounded-lg font-bold text-sm hover:bg-primario-oscuro transition-colors disabled:opacity-50"
            >
              {creando ? "Creando..." : "Cobrar pedido"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de variaciones */}
      {variacionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {variacionModal.nombre}
            </h3>
            <p className="text-sm text-gray-500 mb-4">Selecciona una opción</p>
            <div className="space-y-2">
              {variacionModal.variaciones.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    agregarAlCarrito(variacionModal, v);
                    setVariacionModal(null);
                  }}
                  className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 rounded-lg hover:bg-primario/5 hover:border-primario border border-gray-200 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {v.nombre}
                  </span>
                  <span className="text-sm font-bold text-primario">
                    {formatoCOP(v.precio)}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setVariacionModal(null)}
              className="w-full mt-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
