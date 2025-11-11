-- Script para crear la tabla user_chat_preferences en Supabase
-- Ejecutar este script en el SQL Editor de Supabase si la tabla no existe

-- Tabla de preferencias de chat del usuario (archivados/eliminados)
CREATE TABLE IF NOT EXISTS user_chat_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_archived BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_user_chat_preferences_user_id ON user_chat_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chat_preferences_contact_id ON user_chat_preferences(contact_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS update_user_chat_preferences_updated_at ON user_chat_preferences;
CREATE TRIGGER update_user_chat_preferences_updated_at 
  BEFORE UPDATE ON user_chat_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

