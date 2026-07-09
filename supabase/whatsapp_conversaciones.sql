-- Tabla para guardar estado de conversaciones de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono TEXT NOT NULL UNIQUE,
  estado TEXT NOT NULL DEFAULT 'inicio',
  datos JSONB DEFAULT '{}',
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- Sin RLS: solo accede el service role desde el webhook
ALTER TABLE whatsapp_conversaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role acceso total"
  ON whatsapp_conversaciones
  USING (true)
  WITH CHECK (true);
