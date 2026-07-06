-- ============================================
-- DULCE PALADAR — Esquema inicial de base de datos
-- Fase 1: Catálogo, POS, Inventario, Finanzas
-- ============================================

-- ============================================
-- 1. PERFILES (vinculado a Supabase Auth)
-- ============================================
CREATE TABLE perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'vendedor', 'cocina')),
  telefono TEXT,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. CATEGORÍAS DE PRODUCTOS
-- ============================================
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  orden INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Categorías iniciales
INSERT INTO categorias (nombre, orden) VALUES
  ('Tortas', 1),
  ('Postres', 2),
  ('Panadería', 3),
  ('Bebidas', 4),
  ('Encargos', 5);

-- ============================================
-- 3. PRODUCTOS
-- ============================================
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('simple', 'variaciones', 'personalizado')),
  precio_base INTEGER, -- en COP, sin decimales
  costo_estimado INTEGER, -- en COP
  foto_url TEXT,
  activo BOOLEAN DEFAULT true,
  visible_web BOOLEAN DEFAULT true, -- si aparece en la página pública
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. VARIACIONES DE PRODUCTO
-- ============================================
CREATE TABLE variaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL, -- ej: "10 porciones", "20 porciones"
  precio INTEGER NOT NULL, -- en COP
  costo_estimado INTEGER,
  activa BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. CLIENTES
-- ============================================
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT,
  notas TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. PEDIDOS
-- ============================================
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('mesa', 'recoger', 'domicilio', 'encargo')),
  mesa_numero INTEGER,
  direccion_entrega TEXT,
  fecha_entrega TIMESTAMPTZ, -- obligatorio para encargos
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'preparacion', 'listo', 'entregado', 'cancelado')),
  subtotal INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  abono INTEGER DEFAULT 0,
  saldo_pendiente INTEGER DEFAULT 0,
  medio_pago TEXT CHECK (medio_pago IN ('efectivo', 'transferencia')),
  canal TEXT NOT NULL DEFAULT 'pos' CHECK (canal IN ('pos', 'whatsapp', 'llamada')),
  notas TEXT,
  creado_por UUID REFERENCES perfiles(id),
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. ITEMS DE PEDIDO
-- ============================================
CREATE TABLE pedido_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  variacion_id UUID REFERENCES variaciones(id) ON DELETE SET NULL,
  descripcion_personalizada TEXT, -- para productos personalizados
  cantidad INTEGER NOT NULL DEFAULT 1,
  precio_unitario INTEGER NOT NULL,
  costo_unitario INTEGER DEFAULT 0,
  notas TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 8. PAGOS
-- ============================================
CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  monto INTEGER NOT NULL,
  medio TEXT NOT NULL CHECK (medio IN ('efectivo', 'transferencia')),
  tipo TEXT NOT NULL CHECK (tipo IN ('abono', 'saldo', 'total')),
  fecha TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. PROVEEDORES
-- ============================================
CREATE TABLE proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  notas TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 10. INSUMOS (materia prima)
-- ============================================
CREATE TABLE insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  unidad TEXT NOT NULL, -- kg, g, L, unidades, etc.
  stock_actual NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(10,2) NOT NULL DEFAULT 0,
  costo_unitario INTEGER DEFAULT 0, -- costo por unidad en COP
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 11. MOVIMIENTOS DE INVENTARIO
-- ============================================
CREATE TABLE movimientos_inv (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad NUMERIC(10,2) NOT NULL,
  costo_total INTEGER DEFAULT 0,
  nota TEXT,
  fecha TIMESTAMPTZ DEFAULT now(),
  registrado_por UUID REFERENCES perfiles(id)
);

-- ============================================
-- 12. GASTOS GENERALES
-- ============================================
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL, -- arriendo, servicios, salarios, etc.
  descripcion TEXT,
  monto INTEGER NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  recurrente BOOLEAN DEFAULT false,
  registrado_por UUID REFERENCES perfiles(id),
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 13. CUENTAS POR PAGAR
-- ============================================
CREATE TABLE cuentas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acreedor TEXT NOT NULL,
  concepto TEXT,
  monto INTEGER NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pagada')),
  tipo TEXT NOT NULL CHECK (tipo IN ('proveedor', 'gasto_fijo')),
  pagada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ÍNDICES para rendimiento
-- ============================================
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_activo ON productos(activo);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha ON pedidos(creado_en);
CREATE INDEX idx_pedidos_tipo ON pedidos(tipo);
CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX idx_pagos_pedido ON pagos(pedido_id);
CREATE INDEX idx_movimientos_insumo ON movimientos_inv(insumo_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inv(fecha);
CREATE INDEX idx_insumos_stock_bajo ON insumos(stock_actual, stock_minimo) WHERE activo = true;
CREATE INDEX idx_cuentas_pagar_vencimiento ON cuentas_pagar(fecha_vencimiento) WHERE estado = 'pendiente';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE variaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inv ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_pagar ENABLE ROW LEVEL SECURITY;

-- Función auxiliar: obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION obtener_rol()
RETURNS TEXT AS $$
  SELECT rol FROM perfiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --------------------------------------------------------
-- POLÍTICAS: Perfiles
-- --------------------------------------------------------
CREATE POLICY "Usuarios ven su propio perfil"
  ON perfiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admin ve todos los perfiles"
  ON perfiles FOR SELECT
  USING (obtener_rol() = 'admin');

CREATE POLICY "Admin gestiona perfiles"
  ON perfiles FOR ALL
  USING (obtener_rol() = 'admin');

-- --------------------------------------------------------
-- POLÍTICAS: Categorías y Productos (todos ven, admin edita)
-- --------------------------------------------------------
CREATE POLICY "Todos ven categorías activas"
  ON categorias FOR SELECT
  USING (true);

CREATE POLICY "Admin gestiona categorías"
  ON categorias FOR ALL
  USING (obtener_rol() = 'admin');

CREATE POLICY "Todos ven productos"
  ON productos FOR SELECT
  USING (true);

CREATE POLICY "Admin gestiona productos"
  ON productos FOR ALL
  USING (obtener_rol() = 'admin');

CREATE POLICY "Todos ven variaciones"
  ON variaciones FOR SELECT
  USING (true);

CREATE POLICY "Admin gestiona variaciones"
  ON variaciones FOR ALL
  USING (obtener_rol() = 'admin');

-- --------------------------------------------------------
-- POLÍTICAS: Clientes (admin y vendedor)
-- --------------------------------------------------------
CREATE POLICY "Admin y vendedor ven clientes"
  ON clientes FOR SELECT
  USING (obtener_rol() IN ('admin', 'vendedor'));

CREATE POLICY "Admin y vendedor gestionan clientes"
  ON clientes FOR ALL
  USING (obtener_rol() IN ('admin', 'vendedor'));

-- --------------------------------------------------------
-- POLÍTICAS: Pedidos (admin y vendedor ven todo, cocina ve pedidos activos)
-- --------------------------------------------------------
CREATE POLICY "Admin y vendedor ven pedidos"
  ON pedidos FOR SELECT
  USING (obtener_rol() IN ('admin', 'vendedor'));

CREATE POLICY "Cocina ve pedidos activos"
  ON pedidos FOR SELECT
  USING (obtener_rol() = 'cocina' AND estado IN ('pendiente', 'preparacion', 'listo'));

CREATE POLICY "Admin y vendedor gestionan pedidos"
  ON pedidos FOR ALL
  USING (obtener_rol() IN ('admin', 'vendedor'));

CREATE POLICY "Cocina actualiza estado de pedidos"
  ON pedidos FOR UPDATE
  USING (obtener_rol() = 'cocina' AND estado IN ('pendiente', 'preparacion', 'listo'));

CREATE POLICY "Todos ven items de pedidos"
  ON pedido_items FOR SELECT
  USING (true);

CREATE POLICY "Admin y vendedor gestionan items"
  ON pedido_items FOR ALL
  USING (obtener_rol() IN ('admin', 'vendedor'));

CREATE POLICY "Admin y vendedor ven pagos"
  ON pagos FOR SELECT
  USING (obtener_rol() IN ('admin', 'vendedor'));

CREATE POLICY "Admin y vendedor gestionan pagos"
  ON pagos FOR ALL
  USING (obtener_rol() IN ('admin', 'vendedor'));

-- --------------------------------------------------------
-- POLÍTICAS: Inventario (admin ve todo, vendedor no)
-- --------------------------------------------------------
CREATE POLICY "Admin ve proveedores"
  ON proveedores FOR SELECT
  USING (obtener_rol() = 'admin');

CREATE POLICY "Admin gestiona proveedores"
  ON proveedores FOR ALL
  USING (obtener_rol() = 'admin');

CREATE POLICY "Admin ve insumos"
  ON insumos FOR SELECT
  USING (obtener_rol() = 'admin');

CREATE POLICY "Admin gestiona insumos"
  ON insumos FOR ALL
  USING (obtener_rol() = 'admin');

CREATE POLICY "Admin ve movimientos"
  ON movimientos_inv FOR SELECT
  USING (obtener_rol() = 'admin');

CREATE POLICY "Admin gestiona movimientos"
  ON movimientos_inv FOR ALL
  USING (obtener_rol() = 'admin');

-- --------------------------------------------------------
-- POLÍTICAS: Finanzas (solo admin)
-- --------------------------------------------------------
CREATE POLICY "Admin ve gastos"
  ON gastos FOR SELECT
  USING (obtener_rol() = 'admin');

CREATE POLICY "Admin gestiona gastos"
  ON gastos FOR ALL
  USING (obtener_rol() = 'admin');

CREATE POLICY "Admin ve cuentas por pagar"
  ON cuentas_pagar FOR SELECT
  USING (obtener_rol() = 'admin');

CREATE POLICY "Admin gestiona cuentas por pagar"
  ON cuentas_pagar FOR ALL
  USING (obtener_rol() = 'admin');

-- ============================================
-- POLÍTICAS PÚBLICAS (para la página web sin login)
-- ============================================
CREATE POLICY "Público ve categorías activas"
  ON categorias FOR SELECT TO anon
  USING (activa = true);

CREATE POLICY "Público ve productos activos y visibles"
  ON productos FOR SELECT TO anon
  USING (activo = true AND visible_web = true);

CREATE POLICY "Público ve variaciones de productos activos"
  ON variaciones FOR SELECT TO anon
  USING (
    activa = true
    AND producto_id IN (SELECT id FROM productos WHERE activo = true AND visible_web = true)
  );

-- ============================================
-- TRIGGER: actualizar campo actualizado_en
-- ============================================
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_productos_actualizado
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER tr_pedidos_actualizado
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- ============================================
-- TRIGGER: crear perfil automáticamente al registrar usuario
-- ============================================
CREATE OR REPLACE FUNCTION crear_perfil_nuevo_usuario()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (user_id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'vendedor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION crear_perfil_nuevo_usuario();

-- ============================================
-- HABILITAR REALTIME para comandas
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE pedido_items;
