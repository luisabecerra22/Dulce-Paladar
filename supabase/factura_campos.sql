-- Agregar campos de facturación a la tabla pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS factura_solicitada BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS factura_razon_social TEXT,
  ADD COLUMN IF NOT EXISTS factura_nit TEXT,
  ADD COLUMN IF NOT EXISTS factura_email TEXT,
  ADD COLUMN IF NOT EXISTS numero_factura TEXT;
