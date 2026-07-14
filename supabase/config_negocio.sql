-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS config_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT '',
  tipo_identificacion TEXT NOT NULL DEFAULT 'NIT',
  numero_identificacion TEXT NOT NULL DEFAULT '',
  responsable_de TEXT NOT NULL DEFAULT 'No Aplica',
  responsabilidad_fiscal TEXT NOT NULL DEFAULT 'No responsable',
  contacto TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL DEFAULT '',
  departamento TEXT NOT NULL DEFAULT '',
  ciudad TEXT NOT NULL DEFAULT '',
  telefono TEXT NOT NULL DEFAULT '',
  pagina_web TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  facturacion_electronica BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE config_negocio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users ver negocio" ON config_negocio FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth users insertar negocio" ON config_negocio FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth users actualizar negocio" ON config_negocio FOR UPDATE TO authenticated USING (true);

-- Bucket de almacenamiento para el logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('config', 'config', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "logo publico lectura" ON storage.objects FOR SELECT USING (bucket_id = 'config');
CREATE POLICY "logo auth subida" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'config');
CREATE POLICY "logo auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'config');
CREATE POLICY "logo auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'config');

-- Fila inicial con datos de Dulce Paladar
INSERT INTO config_negocio (nombre, tipo_identificacion, numero_identificacion, contacto, email, telefono)
VALUES ('Dulce Paladar', 'NIT', '90000000', 'Luisa Becerra', 'luisabecerra22@gmail.com', '3187222977');
