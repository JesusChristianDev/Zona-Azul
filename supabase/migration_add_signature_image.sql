-- Migración: Agregar campo signature_image a subscription_contracts
-- Ejecutar en el SQL Editor de Supabase

-- Agregar columna para almacenar la imagen de la firma (base64)
ALTER TABLE subscription_contracts 
ADD COLUMN IF NOT EXISTS signature_image TEXT;

-- Comentario explicativo
COMMENT ON COLUMN subscription_contracts.signature_image IS 'Imagen de la firma electrónica en formato base64 (data:image/png;base64,...)';

-- Índice para búsquedas rápidas de contratos firmados con firma electrónica
CREATE INDEX IF NOT EXISTS idx_subscription_contracts_signature_method 
ON subscription_contracts(signature_method) 
WHERE signature_method = 'electronic_signature';

