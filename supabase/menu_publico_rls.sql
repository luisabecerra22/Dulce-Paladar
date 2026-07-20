-- Permitir lectura pública de productos visibles en web
CREATE POLICY IF NOT EXISTS "Lectura pública productos visibles"
  ON productos FOR SELECT
  TO anon
  USING (visible_web = true AND activo = true);

-- Permitir lectura pública de categorías activas
CREATE POLICY IF NOT EXISTS "Lectura pública categorías"
  ON categorias FOR SELECT
  TO anon
  USING (activa = true);

-- Permitir lectura pública de configuración del negocio
CREATE POLICY IF NOT EXISTS "Lectura pública config negocio"
  ON config_negocio FOR SELECT
  TO anon
  USING (true);

-- Permitir lectura pública de variaciones de productos visibles
CREATE POLICY IF NOT EXISTS "Lectura pública variaciones"
  ON variaciones FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM productos p
      WHERE p.id = variaciones.producto_id
        AND p.visible_web = true
        AND p.activo = true
    )
  );
