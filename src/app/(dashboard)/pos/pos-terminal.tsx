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
  factura: {
    solicitada: boolean;
    razon_social: string;
    nit: string;
    email: string;
  };
};

const IVA = 0.19;

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

  // Factura electrónica
  const [facturaElectronica, setFacturaElectronica] = useState(false);
  const [facturaRazonSocial, setFacturaRazonSocial] = useState("");
  const [facturaNit, setFacturaNit] = useState("");
  const [facturaEmail, setFacturaEmail] = useState("");
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const productosFiltrados = useMemo(() => {
    if (categoriaActiva === "todas") return productos;
    return productos.filter((p) => p.categoria_id === categoriaActiva);
  }, [categoriaActiva, productos]);

  const total = useMemo(
    () => carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0),
    [carrito]
  );

  const baseGravable = total / (1 + IVA);
  const ivaTotal = total - baseGravable;

  function agregarAlCarrito(producto: Producto, variacion?: Variacion) {
    const key = variacion ? `${producto.id}-${variacion.id}` : producto.id;
    const precio = variacion ? variacion.precio : producto.precio_base || 0;
    const detalle = variacion ? variacion.nombre : "";
    setCarrito((prev) => {
      const existente = prev.find((item) => item.key === key);
      if (existente) {
        return prev.map((item) =>
          item.key === key ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { key, producto_id: producto.id, variacion_id: variacion?.id || null, nombre: producto.nombre, detalle, precio, cantidad: 1, notas: "" }];
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
      prev.map((item) => item.key === key ? { ...item, cantidad: Math.max(0, item.cantidad + delta) } : item)
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
    setFacturaElectronica(false);
    setFacturaRazonSocial("");
    setFacturaNit("");
    setFacturaEmail("");
  }

  async function crearPedido() {
    if (carrito.length === 0) { setError("Agrega productos al carrito"); return; }
    if (tipoPedido === "mesa" && !mesaNumero) { setError("Selecciona el número de mesa"); return; }
    if (tipoPedido === "domicilio" && !direccionEntrega.trim()) { setError("Ingresa la dirección de entrega"); return; }
    if (facturaElectronica && !facturaRazonSocial.trim()) { setError("Ingresa la razón social para la factura"); return; }
    if (facturaElectronica && !facturaNit.trim()) { setError("Ingresa el NIT/CC para la factura"); return; }

    setCreando(true);
    setError("");
    const supabase = createClient();

    let clienteId: string | null = null;
    if (clienteNombre.trim()) {
      const { data: clienteExistente } = await supabase.from("clientes").select("id").eq("nombre", clienteNombre.trim()).maybeSingle();
      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else {
        const { data: nuevoCliente } = await supabase.from("clientes").insert({ nombre: clienteNombre.trim(), telefono: clienteTelefono.trim() || null }).select("id").single();
        clienteId = nuevoCliente?.id || null;
      }
    }

    const numeroFactura = facturaElectronica ? `FV-${Date.now()}` : null;

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
        factura_solicitada: facturaElectronica,
        factura_razon_social: facturaElectronica ? facturaRazonSocial.trim() : null,
        factura_nit: facturaElectronica ? facturaNit.trim() : null,
        factura_email: facturaElectronica ? facturaEmail.trim() : null,
        numero_factura: numeroFactura,
      })
      .select("id, numero")
      .single();

    if (errPedido || !pedido) { setError("Error al crear pedido: " + (errPedido?.message || "")); setCreando(false); return; }

    const items = carrito.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.producto_id,
      variacion_id: item.variacion_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
      notas: item.notas || null,
    }));

    const { error: errItems } = await supabase.from("pedido_items").insert(items);
    if (errItems) { setError("Error al agregar items: " + errItems.message); setCreando(false); return; }

    await supabase.from("pagos").insert({ pedido_id: pedido.id, monto: total, medio: medioPago, tipo: "total" });
    await supabase.from("pedidos").update({ estado: "pendiente" }).eq("id", pedido.id);

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
      factura: {
        solicitada: facturaElectronica,
        razon_social: facturaRazonSocial.trim(),
        nit: facturaNit.trim(),
        email: facturaEmail.trim(),
      },
    });

    setCreando(false);
    limpiarCarrito();
  }

  async function generarFacturaPDF(pedido: PedidoCreado) {
    setGenerandoPDF(true);
    try {
      const supabase = createClient();
      const { data: negocio } = await supabase.from("config_negocio").select("*").limit(1).maybeSingle();

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const morado: [number, number, number] = [194, 100, 250];
      const dorado: [number, number, number] = [255, 215, 0];
      const oscuro: [number, number, number] = [45, 27, 78];
      const gris: [number, number, number] = [100, 100, 110];
      const grisClaro: [number, number, number] = [245, 243, 255];

      const W = 210;

      // Fondo header morado
      doc.setFillColor(...morado);
      doc.rect(0, 0, W, 45, "F");

      // Línea dorada inferior del header
      doc.setDrawColor(...dorado);
      doc.setLineWidth(1.5);
      doc.line(0, 45, W, 45);

      // Logo (intentar cargar imagen)
      try {
        const resp = await fetch("/icons/logo-dulce-paladar.png");
        const blob = await resp.blob();
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onload = () => {
            try { doc.addImage(reader.result as string, "PNG", 10, 6, 22, 22); } catch { /* sin logo */ }
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      } catch { /* sin logo */ }

      // Nombre del negocio en header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(negocio?.nombre || "Dulce Paladar", 36, 16);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`NIT: ${negocio?.numero_identificacion || ""}`, 36, 22);
      if (negocio?.direccion) doc.text(negocio.direccion, 36, 27);
      if (negocio?.telefono) doc.text(`Tel: ${negocio.telefono}`, 36, 32);
      if (negocio?.ciudad) doc.text(negocio.ciudad + (negocio?.departamento ? `, ${negocio.departamento}` : ""), 36, 37);

      // Título FACTURA DE VENTA (derecha del header)
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 215, 0);
      doc.text("FACTURA DE VENTA", W - 14, 16, { align: "right" });
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`N° ${String(pedido.numero).padStart(6, "0")}`, W - 14, 23, { align: "right" });
      doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })}`, W - 14, 29, { align: "right" });
      doc.text(`Medio de pago: ${pedido.medio_pago}`, W - 14, 35, { align: "right" });

      // Sección datos del cliente
      let y = 52;
      doc.setFillColor(...grisClaro);
      doc.roundedRect(10, y, W - 20, 26, 3, 3, "F");
      doc.setDrawColor(...morado);
      doc.setLineWidth(0.5);
      doc.roundedRect(10, y, W - 20, 26, 3, 3, "S");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...oscuro);
      doc.text("FACTURAR A:", 15, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(pedido.factura.razon_social || pedido.cliente_nombre || "Consumidor Final", 15, y + 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...gris);
      if (pedido.factura.nit) doc.text(`NIT / CC: ${pedido.factura.nit}`, 15, y + 19);
      if (pedido.factura.email) doc.text(`Email: ${pedido.factura.email}`, 15, y + 24);

      // Tipo y mesa
      if (pedido.tipo === "mesa" && pedido.mesa_numero) {
        doc.setTextColor(...oscuro);
        doc.setFont("helvetica", "bold");
        doc.text(`Mesa: ${pedido.mesa_numero}`, W - 14, y + 13, { align: "right" });
      }

      // Tabla de items
      y += 32;
      const filas = pedido.items.map((item) => {
        const subtotal = item.precio * item.cantidad;
        const base = subtotal / (1 + IVA);
        const iva = subtotal - base;
        return [
          item.nombre + (item.detalle ? ` (${item.detalle})` : ""),
          String(item.cantidad),
          formatoCOP(item.precio),
          `${(IVA * 100).toFixed(0)}%`,
          formatoCOP(iva),
          formatoCOP(subtotal),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["Descripción", "Cant.", "Precio unit.", "IVA %", "IVA valor", "Subtotal"]],
        body: filas,
        headStyles: {
          fillColor: morado,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
        },
        bodyStyles: { fontSize: 8, textColor: [...oscuro] },
        alternateRowStyles: { fillColor: [250, 245, 255] },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { halign: "center", cellWidth: 15 },
          2: { halign: "right", cellWidth: 30 },
          3: { halign: "center", cellWidth: 15 },
          4: { halign: "right", cellWidth: 28 },
          5: { halign: "right", cellWidth: 28 },
        },
        margin: { left: 10, right: 10 },
      });

      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

      // Bloque totales (derecha)
      const totX = W - 70;
      doc.setFillColor(...grisClaro);
      doc.roundedRect(totX, finalY, 60, 32, 3, 3, "F");
      doc.setDrawColor(...morado);
      doc.setLineWidth(0.4);
      doc.roundedRect(totX, finalY, 60, 32, 3, 3, "S");

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gris);
      doc.text("Subtotal (sin IVA):", totX + 4, finalY + 8);
      doc.text("IVA (19%):", totX + 4, finalY + 15);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...oscuro);
      doc.text(formatoCOP(baseGravable), totX + 56, finalY + 8, { align: "right" });
      doc.text(formatoCOP(ivaTotal), totX + 56, finalY + 15, { align: "right" });

      // Línea separadora
      doc.setDrawColor(...dorado);
      doc.setLineWidth(0.8);
      doc.line(totX + 4, finalY + 18, totX + 56, finalY + 18);

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...oscuro);
      doc.text("TOTAL:", totX + 4, finalY + 26);
      doc.setTextColor(...morado);
      doc.text(formatoCOP(pedido.total), totX + 56, finalY + 26, { align: "right" });

      // Nota pie de página
      const pieY = Math.max(finalY + 42, 260);
      doc.setDrawColor(...morado);
      doc.setLineWidth(0.5);
      doc.line(10, pieY, W - 10, pieY);

      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...gris);
      doc.text("Este documento es una factura de venta. Conserve este comprobante.", W / 2, pieY + 5, { align: "center" });
      doc.text("Dulce Paladar — " + (negocio?.email || "") + " — " + (negocio?.telefono || ""), W / 2, pieY + 9, { align: "center" });

      doc.save(`factura-${String(pedido.numero).padStart(6, "0")}-${pedido.factura.nit || "consumidor"}.pdf`);
    } finally {
      setGenerandoPDF(false);
    }
  }

  // ── PANTALLA DE RECIBO ──
  if (recibo) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
          {/* Header */}
          <div className="bg-primario p-5 text-white text-center">
            <div className="text-3xl mb-1">✅</div>
            <h2 className="text-xl font-bold font-[family-name:var(--font-principal)]">
              Pedido #{recibo.numero} creado
            </h2>
            <p className="text-white/70 text-sm mt-0.5">{recibo.fecha}</p>
          </div>

          <div className="p-5 space-y-4">
            {/* Info */}
            <div className="flex gap-4 text-sm">
              <div className="flex-1 bg-gray-50 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-0.5">Tipo</p>
                <p className="font-semibold text-gray-900 capitalize">{recibo.tipo}</p>
              </div>
              {recibo.mesa_numero && (
                <div className="flex-1 bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-0.5">Mesa</p>
                  <p className="font-semibold text-gray-900">{recibo.mesa_numero}</p>
                </div>
              )}
              <div className="flex-1 bg-gray-50 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-0.5">Pago</p>
                <p className="font-semibold text-gray-900 capitalize">{recibo.medio_pago}</p>
              </div>
            </div>

            {/* Items */}
            <div className="border border-dashed border-gray-200 rounded-xl p-3 space-y-1.5">
              {recibo.items.map((item) => (
                <div key={item.key} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.cantidad}× {item.nombre}
                    {item.detalle && <span className="text-gray-400"> ({item.detalle})</span>}
                  </span>
                  <span className="font-medium text-gray-900">{formatoCOP(item.precio * item.cantidad)}</span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="bg-primario/5 border border-primario/20 rounded-xl p-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Base gravable</span>
                <span>{formatoCOP(recibo.total / 1.19)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>IVA 19%</span>
                <span>{formatoCOP(recibo.total - recibo.total / 1.19)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-primario/20 pt-1 mt-1">
                <span>Total</span>
                <span className="text-primario">{formatoCOP(recibo.total)}</span>
              </div>
            </div>

            {/* Datos factura */}
            {recibo.factura.solicitada && (
              <div className="bg-[#FFD700]/10 border border-[#FFD700]/40 rounded-xl p-3">
                <p className="text-xs font-bold text-[#8a7000] mb-1.5">📄 Factura de venta solicitada</p>
                <p className="text-sm font-semibold text-gray-900">{recibo.factura.razon_social}</p>
                <p className="text-xs text-gray-500">NIT/CC: {recibo.factura.nit}</p>
                {recibo.factura.email && <p className="text-xs text-gray-500">{recibo.factura.email}</p>}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2 pt-1">
              {recibo.factura.solicitada && (
                <button
                  onClick={() => generarFacturaPDF(recibo)}
                  disabled={generandoPDF}
                  className="flex-1 py-2.5 bg-[#FFD700] text-[#2d1b4e] rounded-xl font-bold text-sm hover:bg-[#e6c200] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {generandoPDF ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      Generando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Descargar Factura PDF
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setRecibo(null)}
                className="flex-1 py-2.5 bg-primario text-white rounded-xl font-bold text-sm hover:bg-primario/90 transition-colors"
              >
                Nuevo pedido
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PANTALLA PRINCIPAL POS ──
  return (
    <div className="flex gap-4 h-[calc(100vh-6rem)]">
      {/* Panel izquierdo: Productos */}
      <div className="flex-1 flex flex-col min-w-0">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-principal)] text-gray-900 mb-4">
          POS — Punto de Venta
        </h1>
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setCategoriaActiva("todas")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${categoriaActiva === "todas" ? "bg-primario text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-primario"}`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaActiva(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${categoriaActiva === cat.id ? "bg-primario text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-primario"}`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {productosFiltrados.map((producto) => (
              <button
                key={producto.id}
                onClick={() => handleProductoClick(producto)}
                disabled={producto.tipo === "personalizado"}
                className={`bg-white rounded-xl border border-gray-200 p-3 text-left hover:shadow-md hover:border-primario/30 transition-all ${producto.tipo === "personalizado" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {producto.foto_url ? (
                    <img src={producto.foto_url} alt={producto.nombre} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-2xl">🧁</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{producto.nombre}</p>
                {producto.tipo === "simple" && <p className="text-sm font-bold text-primario">{formatoCOP(producto.precio_base)}</p>}
                {producto.tipo === "variaciones" && <p className="text-xs text-secundario font-semibold">Desde {formatoCOP(Math.min(...producto.variaciones.map((v) => v.precio)))}</p>}
                {producto.tipo === "personalizado" && <p className="text-xs text-gray-400">Cotizar</p>}
              </button>
            ))}
          </div>
          {productosFiltrados.length === 0 && (
            <div className="text-center py-12 text-gray-400">No hay productos en esta categoría</div>
          )}
        </div>
      </div>

      {/* Panel derecho: Carrito */}
      <div className="w-80 bg-white rounded-xl border border-gray-200 flex flex-col">
        {/* Tipo pedido */}
        <div className="p-4 border-b border-gray-100">
          <label className="block text-xs font-medium text-gray-500 mb-2">Tipo de pedido</label>
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
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${tipoPedido === t.value ? "bg-primario text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          {tipoPedido === "mesa" && (
            <div className="mt-2">
              <label className="block text-xs text-gray-500 mb-1">N° Mesa</label>
              <div className="flex gap-1 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMesaNumero(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${mesaNumero === n ? "bg-primario text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tipoPedido === "domicilio" && (
            <input type="text" value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} placeholder="Dirección de entrega"
              className="mt-2 w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario" />
          )}
        </div>

        {/* Cliente */}
        <div className="px-4 py-2 border-b border-gray-100">
          <input type="text" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Cliente (opcional)"
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario" />
        </div>

        {/* Items carrito */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {carrito.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <p className="text-3xl mb-2">🛒</p>
              <p className="text-sm">Carrito vacío</p>
              <p className="text-xs">Toca un producto para agregarlo</p>
            </div>
          ) : (
            carrito.map((item) => (
              <div key={item.key} className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.nombre}</p>
                    {item.detalle && <p className="text-xs text-gray-400">{item.detalle}</p>}
                  </div>
                  <button onClick={() => quitarItem(item.key)} className="text-gray-300 hover:text-red-500 text-lg leading-none ml-2">×</button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <button onClick={() => cambiarCantidad(item.key, -1)} className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 text-sm flex items-center justify-center hover:border-primario">−</button>
                    <span className="text-sm font-bold w-6 text-center">{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.key, 1)} className="w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-600 text-sm flex items-center justify-center hover:border-primario">+</button>
                  </div>
                  <p className="text-sm font-bold text-primario">{formatoCOP(item.precio * item.cantidad)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          {/* Medio de pago */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setMedioPago("efectivo")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${medioPago === "efectivo" ? "bg-green-100 text-green-700 border border-green-300" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>
              💵 Efectivo
            </button>
            <button type="button" onClick={() => setMedioPago("transferencia")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${medioPago === "transferencia" ? "bg-blue-100 text-blue-700 border border-blue-300" : "bg-gray-50 text-gray-600 border border-gray-200"}`}>
              📱 Transferencia
            </button>
          </div>

          {/* Notas */}
          <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (opcional)"
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primario" />

          {/* Toggle factura electrónica */}
          <div className="bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-xl p-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className="relative flex-shrink-0">
                <input type="checkbox" checked={facturaElectronica} onChange={(e) => setFacturaElectronica(e.target.checked)} className="sr-only" />
                <div className={`w-9 h-5 rounded-full transition-colors ${facturaElectronica ? "bg-primario" : "bg-gray-300"}`} />
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${facturaElectronica ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-xs font-semibold text-gray-700">📄 Requiere factura de venta</span>
            </label>

            {facturaElectronica && (
              <div className="mt-3 space-y-2">
                <input type="text" value={facturaRazonSocial} onChange={(e) => setFacturaRazonSocial(e.target.value)}
                  placeholder="Razón social / Nombre *"
                  className="w-full px-2.5 py-1.5 border border-[#FFD700]/50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primario bg-white" />
                <input type="text" value={facturaNit} onChange={(e) => setFacturaNit(e.target.value)}
                  placeholder="NIT / CC *"
                  className="w-full px-2.5 py-1.5 border border-[#FFD700]/50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primario bg-white" />
                <input type="email" value={facturaEmail} onChange={(e) => setFacturaEmail(e.target.value)}
                  placeholder="Email (opcional)"
                  className="w-full px-2.5 py-1.5 border border-[#FFD700]/50 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primario bg-white" />
              </div>
            )}
          </div>

          {/* Total */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Base gravable</span>
              <span>{formatoCOP(baseGravable)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>IVA 19%</span>
              <span>{formatoCOP(ivaTotal)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-2xl font-bold text-primario">{formatoCOP(total)}</span>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}

          <div className="flex gap-2">
            {carrito.length > 0 && (
              <button type="button" onClick={limpiarCarrito}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                Limpiar
              </button>
            )}
            <button type="button" onClick={crearPedido} disabled={creando || carrito.length === 0}
              className="flex-1 py-2.5 bg-primario text-white rounded-lg font-bold text-sm hover:bg-primario/90 transition-colors disabled:opacity-50">
              {creando ? "Creando..." : "Cobrar pedido"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal variaciones */}
      {variacionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{variacionModal.nombre}</h3>
            <p className="text-sm text-gray-500 mb-4">Selecciona una opción</p>
            <div className="space-y-2">
              {variacionModal.variaciones.map((v) => (
                <button key={v.id} onClick={() => { agregarAlCarrito(variacionModal, v); setVariacionModal(null); }}
                  className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 rounded-lg hover:bg-primario/5 hover:border-primario border border-gray-200 transition-colors">
                  <span className="text-sm font-medium text-gray-900">{v.nombre}</span>
                  <span className="text-sm font-bold text-primario">{formatoCOP(v.precio)}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setVariacionModal(null)} className="w-full mt-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
