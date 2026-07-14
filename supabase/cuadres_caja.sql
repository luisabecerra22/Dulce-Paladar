CREATE TABLE IF NOT EXISTS cuadres_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL,
  nombre_caja TEXT NOT NULL DEFAULT 'Caja Principal',
  responsable_nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'abierto', -- abierto | cerrado
  monto_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_final_declarado NUMERIC(12,2),
  total_ventas NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_efectivo NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_transferencias NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_gastos NUMERIC(12,2) NOT NULL DEFAULT 0,
  efectivo_esperado NUMERIC(12,2),
  diferencia NUMERIC(12,2),
  observaciones TEXT,
  abierto_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cuadres_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users ver cuadres"
  ON cuadres_caja FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth users insertar cuadres"
  ON cuadres_caja FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth users actualizar cuadres"
  ON cuadres_caja FOR UPDATE TO authenticated USING (true);
