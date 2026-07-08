-- Tabla para guardar suscripciones de notificaciones push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- Solo el propio usuario puede ver sus suscripciones
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario ve sus suscripciones"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "usuario inserta sus suscripciones"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuario elimina sus suscripciones"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Service role puede leer todas (para enviar notificaciones)
CREATE POLICY "service role lee todas"
  ON push_subscriptions FOR SELECT
  USING (true);
