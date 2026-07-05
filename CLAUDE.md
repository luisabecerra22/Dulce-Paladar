# CLAUDE.md — Proyecto Dulce Paladar

## 1. Contexto del proyecto

**Dulce Paladar** es un negocio de repostería (tortas, postres y productos relacionados) en Colombia que funciona también como pequeño restaurante/cafetería con mesas. Tiene presencia en **Facebook e Instagram**, y su canal principal de pedidos remotos es WhatsApp. Este proyecto es un **sistema POS + gestión integral del negocio**, desarrollado por Lu (desarrolladora principiante — explicar cada paso con claridad, sin asumir conocimientos previos).

**Reglas de comunicación con la desarrolladora:**
- Explicar cada comando y cada decisión técnica en español, de forma sencilla.
- Antes de ejecutar cambios grandes, resumir qué se va a hacer y por qué.
- Hacer commits pequeños y frecuentes con mensajes descriptivos en español.
- Si algo falla, explicar el error en lenguaje simple antes de corregirlo.

---

## 2. Stack técnico (decidido — no cambiar sin consultar)

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | **Next.js 14+ (App Router) + React + TypeScript** | PWA instalable en PC, tablet y celular |
| Estilos | Tailwind CSS | |
| PWA / Offline | next-pwa o serwist | Modo offline básico: tomar pedidos y ver catálogo sin internet, sincronizar al reconectar |
| Backend / BD | **Supabase** (PostgreSQL + Auth + Realtime + Storage) | Plan gratuito |
| Hosting | **Vercel** | Plan gratuito |
| IA conversacional | **API de Anthropic (Claude)** | Para el bot de WhatsApp (Fase 2) |
| WhatsApp | **Meta WhatsApp Cloud API** | Número del negocio (se migrará de la app normal) |
| Llamadas de voz | Twilio (Fase 3, aún no) | |
| Gráficas | Recharts | Para dashboards |
| PDF | Generación de informes PDF (react-pdf o similar) | |

**Presupuesto máximo: ~USD $20/mes.** Priorizar siempre planes gratuitos.

**Convenciones generales:**
- Idioma de toda la interfaz: **español (Colombia)**.
- Moneda: **COP** (pesos colombianos), formato `$1.250.000` (punto de miles, sin decimales).
- Zona horaria: **America/Bogota**.
- Variables de entorno en `.env.local` — **NUNCA subir claves a Git**. Incluir `.env.local` en `.gitignore` desde el primer commit.

---

## 3. Roles y usuarios (2-3 usuarios)

| Rol | Quién | Permisos |
|---|---|---|
| **Administradora** | La dueña (también está en cocina) | Acceso total: ventas, finanzas, inventario, catálogo, reportes, configuración |
| **Vendedor** | Persona que atiende y vende | Tomar pedidos, cobrar, ver comandas, registrar clientes. NO ve finanzas ni ganancia |
| **Cocina** | Vista de comandas (puede ser la misma cuenta de la dueña) | Ver y actualizar estado de comandas |

Autenticación con Supabase Auth (email + contraseña). Roles guardados en tabla `perfiles`.

---

## 4. Plan por fases

### FASE 1 — POS + Catálogo + Inventario + Finanzas (EMPEZAR AQUÍ)

#### 4.1 Catálogo (20-50 productos)
- Tres tipos de producto:
  1. **Simple**: precio fijo (ej. brownie = $6.000).
  2. **Con variaciones**: tamaño, sabor, número de porciones modifican el precio (ej. torta de chocolate: 10 porciones $45.000 / 20 porciones $80.000).
  3. **Personalizado**: tortas por encargo; el precio se cotiza manualmente en cada pedido.
- Cada producto tiene: nombre, descripción, categoría, foto (Supabase Storage), precio(s), **costo estimado** (para calcular margen), activo/inactivo.
- Categorías sugeridas: Tortas, Postres, Panadería, Bebidas, Encargos (ajustables por la administradora).

#### 4.2 POS — Toma de pedidos
- Tipos de pedido: **Mesa** (con número de mesa), **Para recoger**, **Domicilio** (dirección + teléfono), **Encargo** (fecha y hora de entrega obligatorias).
- **Encargos siempre con abono**: registrar abono, calcular saldo pendiente, marcar cuando se paga el saldo.
- Medios de pago: **Efectivo** y **Transferencia**.
- Pantalla de venta rápida: grilla de productos por categoría, carrito, cliente opcional, tipo de pedido, cobro.
- Recibo para el cliente: imprimible en térmica 58/80mm y enviable por WhatsApp (en Fase 1, generar imagen/PDF compartible; en Fase 2 se envía automático).
- Clientes: nombre + teléfono (base para el bot de la Fase 2 y para encargos).

#### 4.3 Comandas de cocina
- Vista en **tiempo real** (Supabase Realtime) para la pantalla de cocina.
- Estados: `Pendiente → En preparación → Listo → Entregado`.
- Ordenadas por urgencia (encargos por fecha de entrega, mesas por orden de llegada).
- **Impresión en térmica** con botón "Imprimir comanda" (formato tirilla).

#### 4.4 Inventario de materia prima (versión simple, evolucionará a recetas)
- Tabla de insumos: nombre, unidad (kg, g, L, unidades...), stock actual, **stock mínimo**, costo unitario, proveedor.
- Movimientos: **Entrada** (compra) y **Salida** (consumo/merma), con fecha, cantidad y nota.
- Al final del día la dueña registra qué se consumió o qué falta ("quedó faltando harina").
- **Alerta de stock bajo** cuando stock actual ≤ stock mínimo (visible en dashboard; por WhatsApp en Fase 2).
- **Diseñar el modelo de datos dejando lista la evolución a recetas**: tabla `recetas` (producto → insumos y cantidades) se agregará después para descuento automático al vender.

#### 4.5 Finanzas
- **Ganancia por producto**: precio de venta − costo estimado (margen por venta y acumulado).
- **Gastos generales**: registro de arriendo, servicios, salarios, etc. (categoría, monto, fecha, recurrente sí/no).
- **Cuentas por pagar**: a proveedores (compras a crédito) y gastos fijos. Campos: acreedor, concepto, monto, fecha de vencimiento, estado (pendiente/pagada). Recordatorios por WhatsApp en Fase 2.
- **Cierre del día**: total vendido, número de pedidos, ganancia bruta (margen), gastos del día, efectivo vs transferencias, producto más vendido.
- Dashboard con gráficas: ventas por día/semana/mes, top productos, margen.

#### 4.6 Página web pública para clientes (vitrina)
- Sitio público dentro del mismo proyecto Next.js (rutas públicas, sin login): página de inicio, catálogo con fotos y precios leídos de Supabase (misma base del POS — se actualiza en un solo lugar), información del negocio (horarios, ubicación, contacto) y sección de encargos/tortas personalizadas.
- **Sin pedidos en línea**: cada producto y la página tienen botón **"Pedir por WhatsApp"** (enlace `wa.me` con mensaje prellenado, ej. "Hola, quiero pedir una Torta de Chocolate 20 porciones").
- Enlaces visibles a **Facebook e Instagram** del negocio.
- SEO básico (título, descripción, Open Graph con fotos) para que aparezca en Google y se vea bien al compartir en redes.
- Solo se muestran productos marcados como activos.

### FASE 2 — Bot de WhatsApp + Notificaciones + Informes

#### 4.7 Bot de atención (número del negocio, Meta Cloud API)
- **Modo híbrido**:
  - Toma pedidos **estándar** completos él solo: saluda, muestra catálogo y precios, arma el pedido, pregunta tipo de entrega, confirma y **crea el pedido en el sistema** (llega a comandas automáticamente).
  - Responde precios, catálogo, horarios y disponibilidad.
  - **Escala a la administradora** cuando: es pedido personalizado (cotización), el cliente lo pide, o el bot no entiende tras 2 intentos. Escalar = notificar a su WhatsApp personal y marcar el chat como "atención humana".
- Motor: API de Anthropic (Claude) con el catálogo y precios como contexto (leídos de Supabase en cada conversación).
- Webhook de Meta → endpoint en Next.js (API route) → lógica del bot → respuesta.
- **Messenger e Instagram DM**: el mismo bot responde mensajes de las páginas de Facebook e Instagram del negocio (Meta Messenger Platform / Instagram Messaging API, mismo webhook). Responde precios, catálogo e información, pero **al momento de concretar un pedido siempre dirige al cliente a WhatsApp** con enlace `wa.me` prellenado (los pedidos solo se cierran por WhatsApp o POS).

#### 4.8 Notificaciones al WhatsApp personal de la dueña (TODAS activas)
1. **Pedido nuevo** (de cualquier canal).
2. **Cierre del día**: ventas, ganancia, producto más vendido.
3. **Stock bajo**: "Quedan 2 kg de harina (mínimo: 5 kg)".
4. **Cuentas por pagar** próximas a vencer (recordatorio 3 días antes y el día del vencimiento).

#### 4.9 Informes
- **Semanal y mensual**, en dos formatos:
  - Resumen por WhatsApp (mensaje con cifras clave).
  - **PDF descargable** desde el sistema: ventas, ganancia, gastos, top productos, comparativo con periodo anterior.
- Generación automática (cron job en Vercel) + botón manual "Generar informe".

### FASE 3 — Atención de llamadas con IA de voz
- Twilio Voice + IA (transcripción y voz). **Costo por minuto — se evaluará presupuesto aparte antes de implementar.** No iniciar sin aprobación.

### FASE 4 — Facturación electrónica DIAN
- Integración con proveedor tecnológico autorizado DIAN. Investigar opciones económicas para microempresa colombiana cuando llegue el momento. No iniciar sin aprobación.

---

## 5. Modelo de datos inicial (Supabase / PostgreSQL)

```
perfiles          (id, user_id→auth, nombre, rol[admin|vendedor|cocina], telefono, activo)
categorias        (id, nombre, orden, activa)
productos         (id, categoria_id, nombre, descripcion, tipo[simple|variaciones|personalizado],
                   precio_base, costo_estimado, foto_url, activo)
variaciones       (id, producto_id, nombre, precio, costo_estimado, activa)
clientes          (id, nombre, telefono, direccion, notas, creado_en)
pedidos           (id, numero, cliente_id, tipo[mesa|recoger|domicilio|encargo], mesa_numero,
                   direccion_entrega, fecha_entrega, estado[pendiente|preparacion|listo|entregado|cancelado],
                   subtotal, total, abono, saldo_pendiente, medio_pago[efectivo|transferencia],
                   canal[pos|whatsapp|llamada], creado_por, creado_en)
pedido_items      (id, pedido_id, producto_id, variacion_id, descripcion_personalizada,
                   cantidad, precio_unitario, costo_unitario, notas)
pagos             (id, pedido_id, monto, medio[efectivo|transferencia], tipo[abono|saldo|total], fecha)
insumos           (id, nombre, unidad, stock_actual, stock_minimo, costo_unitario, proveedor_id, activo)
movimientos_inv   (id, insumo_id, tipo[entrada|salida], cantidad, costo_total, nota, fecha, registrado_por)
proveedores       (id, nombre, telefono, notas)
gastos            (id, categoria, descripcion, monto, fecha, recurrente, registrado_por)
cuentas_pagar     (id, acreedor, concepto, monto, fecha_vencimiento, estado[pendiente|pagada],
                   tipo[proveedor|gasto_fijo], pagada_en)
-- Fase posterior (dejar previsto, no crear aún):
-- recetas        (id, producto_id, insumo_id, cantidad_por_unidad)
-- conversaciones (id, cliente_id, telefono, estado[bot|humano], historial_json, actualizado_en)
```

Usar **Row Level Security (RLS)** en Supabase según el rol (vendedor no puede leer `gastos`, `cuentas_pagar` ni costos).

---

## 6. Marca y diseño

- Nombre: **Dulce Paladar**.
- Logo y colores oficiales: **PENDIENTE — Lu los entregará**. Al recibirlos, definir variables de tema en Tailwind (`--color-primario`, `--color-secundario`) y usarlos en toda la app, recibos, comandas y PDF.
- Mientras tanto: usar paleta neutra provisional y estructura lista para cambiar los colores en un solo lugar.
- Estilo: cálido, limpio, apto para pantallas táctiles (botones grandes en el POS).

---

## 7. Variables de entorno (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # solo servidor, nunca exponer
ANTHROPIC_API_KEY=                  # Fase 2
WHATSAPP_ACCESS_TOKEN=              # Fase 2 (Meta Cloud API)
WHATSAPP_PHONE_NUMBER_ID=           # Fase 2
WHATSAPP_VERIFY_TOKEN=              # Fase 2 (webhook)
NUMERO_PERSONAL_DUENA=              # Fase 2 (notificaciones)
META_PAGE_ACCESS_TOKEN=             # Fase 2 (Messenger e Instagram DM)
INSTAGRAM_ACCOUNT_ID=               # Fase 2
```

---

## 8. Orden de trabajo sugerido para Fase 1

1. Crear proyecto Next.js + TypeScript + Tailwind, configurar PWA básica.
2. Conectar Supabase, crear tablas del modelo de datos con migraciones SQL.
3. Autenticación y roles (login + protección de rutas por rol).
4. Módulo Catálogo (CRUD productos, variaciones, categorías, fotos).
5. Módulo POS (toma de pedidos, carrito, cobro, abonos de encargos, recibo).
6. Módulo Comandas (tiempo real + impresión térmica).
7. Módulo Inventario (insumos, movimientos, alertas de stock mínimo).
8. Módulo Finanzas (gastos, cuentas por pagar, cierre del día, dashboard).
9. Página web pública (vitrina con catálogo, botón "Pedir por WhatsApp", enlaces a redes).
10. Pruebas completas del flujo con datos reales del negocio.
11. Deploy a Vercel + instalación como PWA en los dispositivos del local.

**Cada módulo debe quedar funcionando y probado antes de pasar al siguiente.**
