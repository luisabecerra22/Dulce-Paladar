-- Agregar campos de promoción a productos
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS en_promocion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2) DEFAULT 0;
