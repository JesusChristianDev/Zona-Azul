-- Esquema de base de datos para Zona Azul (COMPLETO)
-- Incluye: 
--   - Schema base
--   - Migración de separación menú/planes
--   - Tabla de suscripciones push (push_subscriptions)
--   - Campo signature_image en subscription_contracts
--   - Scripts opcionales de actualización de datos existentes
-- Ejecutar este script en el SQL Editor de Supabase

-- Habilitar extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- En producción, usar bcrypt
  role TEXT NOT NULL CHECK (role IN ('admin', 'suscriptor', 'nutricionista', 'repartidor')),
  name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  must_change_password BOOLEAN DEFAULT true, -- Obligar cambio de contraseña en primer login
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar columna must_change_password si no existe (para bases de datos existentes)
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;

-- Tabla de perfiles de usuario (información adicional)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'expired')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  goals_weight DECIMAL(5,2),
  goals_calories INTEGER,
  goals_water INTEGER, -- en ml
  address TEXT,
  delivery_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de citas/appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nutricionista_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de comidas/meals (debe crearse antes que order_items)
-- Nota: is_menu_item separa comidas del menú del local de comidas para planes nutricionales
-- true = menú del local (/menu), false = planes nutricionales
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories INTEGER NOT NULL,
  protein DECIMAL(5,2),
  carbs DECIMAL(5,2),
  fats DECIMAL(5,2),
  ingredients TEXT[], -- Array de ingredientes
  instructions TEXT,
  image_url TEXT,
  price DECIMAL(10,2),
  available BOOLEAN DEFAULT true,
  is_menu_item BOOLEAN DEFAULT false, -- true = menú del local (/menu), false = planes nutricionales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MIGRACIÓN: Separar comidas del menú del local de comidas para planes nutricionales
-- Esta sección es compatible con bases de datos existentes
-- ============================================

-- Agregar campo is_menu_item si no existe (para bases de datos existentes)
ALTER TABLE meals 
ADD COLUMN IF NOT EXISTS is_menu_item BOOLEAN DEFAULT false;

-- Comentario explicativo
COMMENT ON COLUMN meals.is_menu_item IS 'Si es true, la comida aparece en el menú del local (/menu). Si es false, es solo para planes nutricionales.';

-- Actualizar comidas existentes: si tienen precio, probablemente son del menú del local
-- Solo actualiza las que aún no tienen el campo definido (is_menu_item IS NULL o false con precio)
UPDATE meals 
SET is_menu_item = true 
WHERE (is_menu_item IS NULL OR is_menu_item = false)
  AND price IS NOT NULL 
  AND price > 0;

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado')),
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_address TEXT,
  delivery_instructions TEXT,
  repartidor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  actual_delivery_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de items de pedido (debe crearse después de orders y meals)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de planes nutricionales
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  nutricionista_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Usuario asignado
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_calories INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de días del plan (relación muchos a muchos entre planes y comidas)
CREATE TABLE IF NOT EXISTS meal_plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL, -- 'Lunes', 'Martes', etc.
  day_number INTEGER NOT NULL, -- 1-7
  total_calories INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de comidas en días del plan
CREATE TABLE IF NOT EXISTS meal_plan_day_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_day_id UUID NOT NULL REFERENCES meal_plan_days(id) ON DELETE CASCADE,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  meal_name TEXT NOT NULL, -- Nombre de la comida en ese día
  meal_description TEXT,
  calories INTEGER,
  order_index INTEGER, -- Orden de la comida en el día
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de progreso del usuario
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight DECIMAL(5,2),
  calories INTEGER,
  water INTEGER, -- en ml
  protein DECIMAL(5,2),
  carbs DECIMAL(5,2),
  fats DECIMAL(5,2),
  mood TEXT, -- Estado de ánimo
  sleep_hours DECIMAL(4,2),
  steps INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date) -- Un registro por usuario por día
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  message TEXT NOT NULL,
  reply TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de plantillas de planes (para nutricionistas)
CREATE TABLE IF NOT EXISTS plan_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  nutricionista_id UUID REFERENCES users(id) ON DELETE SET NULL,
  focus TEXT,
  duration TEXT,
  audience TEXT,
  total_calories INTEGER,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asignación de clientes a nutricionistas
CREATE TABLE IF NOT EXISTS nutricionista_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutricionista_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nutricionista_id, client_id) -- Un cliente solo puede estar asignado una vez a un nutricionista
);

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

-- Tabla de incidencias de pedidos (para repartidores)
CREATE TABLE IF NOT EXISTS order_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  repartidor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported', 'resolved', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_nutricionista_id ON appointments(nutricionista_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date_time);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_repartidor_id ON orders(repartidor_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_meals_type ON meals(type);
CREATE INDEX IF NOT EXISTS idx_meals_available ON meals(available);
-- Índices para separación menú/planes (incluidos en migración)
CREATE INDEX IF NOT EXISTS idx_meals_is_menu_item ON meals(is_menu_item);
CREATE INDEX IF NOT EXISTS idx_meals_available_menu ON meals(available, is_menu_item);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_nutricionista_id ON meal_plans(nutricionista_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_date ON progress(date);
CREATE INDEX IF NOT EXISTS idx_messages_from_user_id ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user_id ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_plan_templates_nutricionista_id ON plan_templates(nutricionista_id);
CREATE INDEX IF NOT EXISTS idx_nutricionista_clients_nutricionista_id ON nutricionista_clients(nutricionista_id);
CREATE INDEX IF NOT EXISTS idx_nutricionista_clients_client_id ON nutricionista_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_user_chat_preferences_user_id ON user_chat_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chat_preferences_contact_id ON user_chat_preferences(contact_id);
CREATE INDEX IF NOT EXISTS idx_order_incidents_order_id ON order_incidents(order_id);
CREATE INDEX IF NOT EXISTS idx_order_incidents_repartidor_id ON order_incidents(repartidor_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
-- Eliminar triggers existentes antes de crearlos (para que el script sea idempotente)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meals_updated_at ON meals;
CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meal_plans_updated_at ON meal_plans;
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_progress_updated_at ON progress;
CREATE TRIGGER update_progress_updated_at BEFORE UPDATE ON progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_plan_templates_updated_at ON plan_templates;
CREATE TRIGGER update_plan_templates_updated_at BEFORE UPDATE ON plan_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nutricionista_clients_updated_at ON nutricionista_clients;
CREATE TRIGGER update_nutricionista_clients_updated_at BEFORE UPDATE ON nutricionista_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_chat_preferences_updated_at ON user_chat_preferences;
CREATE TRIGGER update_user_chat_preferences_updated_at BEFORE UPDATE ON user_chat_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_incidents_updated_at ON order_incidents;
CREATE TRIGGER update_order_incidents_updated_at BEFORE UPDATE ON order_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla de configuraciones de usuario
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT true,
  notifications_new_messages BOOLEAN DEFAULT true,
  notifications_order_updates BOOLEAN DEFAULT true,
  notifications_plan_assignments BOOLEAN DEFAULT true,
  notifications_appointments BOOLEAN DEFAULT true,
  notifications_new_orders BOOLEAN DEFAULT true,
  preferences_language TEXT DEFAULT 'es',
  preferences_theme TEXT DEFAULT 'light' CHECK (preferences_theme IN ('light', 'dark', 'auto')),
  preferences_email_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Trigger para actualizar updated_at en user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabla para almacenar credenciales de Google Calendar de nutricionistas
CREATE TABLE IF NOT EXISTS calendar_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT DEFAULT 'primary', -- ID del calendario de Google (por defecto 'primary')
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para calendar_credentials
CREATE INDEX IF NOT EXISTS idx_calendar_credentials_user_id ON calendar_credentials(user_id);

-- Trigger para actualizar updated_at en calendar_credentials
DROP TRIGGER IF EXISTS update_calendar_credentials_updated_at ON calendar_credentials;
CREATE TRIGGER update_calendar_credentials_updated_at BEFORE UPDATE ON calendar_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agregar campo para almacenar el ID del evento de Google Calendar en appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;
CREATE INDEX IF NOT EXISTS idx_appointments_google_calendar_event_id ON appointments(google_calendar_event_id);

-- Tabla para horarios de trabajo de nutricionistas
CREATE TABLE IF NOT EXISTS nutritionist_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Horarios por día de la semana (0=domingo, 1=lunes, ..., 6=sábado)
  monday_start_hour INTEGER DEFAULT 9 CHECK (monday_start_hour >= 0 AND monday_start_hour <= 23),
  monday_end_hour INTEGER DEFAULT 18 CHECK (monday_end_hour >= 0 AND monday_end_hour <= 23),
  monday_enabled BOOLEAN DEFAULT true,
  tuesday_start_hour INTEGER DEFAULT 9 CHECK (tuesday_start_hour >= 0 AND tuesday_start_hour <= 23),
  tuesday_end_hour INTEGER DEFAULT 18 CHECK (tuesday_end_hour >= 0 AND tuesday_end_hour <= 23),
  tuesday_enabled BOOLEAN DEFAULT true,
  wednesday_start_hour INTEGER DEFAULT 9 CHECK (wednesday_start_hour >= 0 AND wednesday_start_hour <= 23),
  wednesday_end_hour INTEGER DEFAULT 18 CHECK (wednesday_end_hour >= 0 AND wednesday_end_hour <= 23),
  wednesday_enabled BOOLEAN DEFAULT true,
  thursday_start_hour INTEGER DEFAULT 9 CHECK (thursday_start_hour >= 0 AND thursday_start_hour <= 23),
  thursday_end_hour INTEGER DEFAULT 18 CHECK (thursday_end_hour >= 0 AND thursday_end_hour <= 23),
  thursday_enabled BOOLEAN DEFAULT true,
  friday_start_hour INTEGER DEFAULT 9 CHECK (friday_start_hour >= 0 AND friday_start_hour <= 23),
  friday_end_hour INTEGER DEFAULT 18 CHECK (friday_end_hour >= 0 AND friday_end_hour <= 23),
  friday_enabled BOOLEAN DEFAULT true,
  saturday_start_hour INTEGER DEFAULT NULL CHECK (saturday_start_hour IS NULL OR (saturday_start_hour >= 0 AND saturday_start_hour <= 23)),
  saturday_end_hour INTEGER DEFAULT NULL CHECK (saturday_end_hour IS NULL OR (saturday_end_hour >= 0 AND saturday_end_hour <= 23)),
  saturday_enabled BOOLEAN DEFAULT false,
  sunday_start_hour INTEGER DEFAULT NULL CHECK (sunday_start_hour IS NULL OR (sunday_start_hour >= 0 AND sunday_start_hour <= 23)),
  sunday_end_hour INTEGER DEFAULT NULL CHECK (sunday_end_hour IS NULL OR (sunday_end_hour >= 0 AND sunday_end_hour <= 23)),
  sunday_enabled BOOLEAN DEFAULT false,
  slot_duration_minutes INTEGER DEFAULT 60 CHECK (slot_duration_minutes > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para nutritionist_schedule
CREATE INDEX IF NOT EXISTS idx_nutritionist_schedule_user_id ON nutritionist_schedule(user_id);

-- Trigger para actualizar updated_at en nutritionist_schedule
DROP TRIGGER IF EXISTS update_nutritionist_schedule_updated_at ON nutritionist_schedule;
CREATE TRIGGER update_nutritionist_schedule_updated_at BEFORE UPDATE ON nutritionist_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Deshabilitado por defecto para desarrollo
-- Habilita RLS y crea políticas según tus necesidades de seguridad
-- Para desarrollo, puedes dejar RLS deshabilitado

-- NOTA: Si quieres habilitar RLS, descomenta las siguientes líneas y crea las políticas necesarias
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meal_plan_days ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meal_plan_day_meals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE plan_templates ENABLE ROW LEVEL SECURITY;

-- Ejemplo de políticas básicas (descomenta y ajusta según necesidades):
-- CREATE POLICY "Users can view own data" ON users
--     FOR SELECT USING (auth.uid()::text = id::text);
-- 
-- CREATE POLICY "Users can update own data" ON users
--     FOR UPDATE USING (auth.uid()::text = id::text);
-- 
-- CREATE POLICY "Admins can view all users" ON users
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM users
--             WHERE id::text = auth.uid()::text
--             AND role = 'admin'
--         )
--     );

-- Esquema extendido para nuevas funcionalidades de Zona Azul
-- Ejecutar este script en el SQL Editor de Supabase después del schema.sql base

-- ============================================
-- 1. GESTIÓN DE PLANES Y CONTRATOS
-- ============================================

-- Tabla de tipos de planes de suscripción
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'Mensual', 'Trimestral', 'Anual'
  duration_months INTEGER NOT NULL, -- 1, 3, 12
  base_price DECIMAL(10,2) NOT NULL, -- Precio base para 1 comida por día
  price_per_meal_per_month DECIMAL(10,2), -- Precio por comida por mes (para cálculo dinámico)
  discount_percentage DECIMAL(5,2) DEFAULT 0, -- Descuento aplicable
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar campo price_per_meal_per_month si no existe (para bases de datos existentes)
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS price_per_meal_per_month DECIMAL(10,2);

-- Comentario explicativo
COMMENT ON COLUMN subscription_plans.price_per_meal_per_month IS 'Precio base por comida por mes. El precio total se calcula como: price_per_meal_per_month * meals_per_day * duration_months';

-- Tabla de grupos de suscripción (debe crearse antes que subscriptions)
CREATE TABLE IF NOT EXISTS subscription_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- Nombre del grupo (opcional)
  group_type TEXT NOT NULL CHECK (group_type IN ('individual', 'pareja', 'familiar')),
  primary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Usuario principal
  discount_percentage DECIMAL(5,2) DEFAULT 0, -- Descuento del grupo (solo admin puede modificar)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de suscripciones activas
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  group_id UUID REFERENCES subscription_groups(id) ON DELETE SET NULL, -- NULL si es individual
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'active', 'expired', 'cancelled')),
  start_date DATE,
  end_date DATE,
  price DECIMAL(10,2) NOT NULL, -- Precio final con descuentos aplicados
  discount_applied DECIMAL(5,2) DEFAULT 0,
  meals_per_day INTEGER DEFAULT 1 CHECK (meals_per_day IN (1, 2)), -- 1 = comida o cena, 2 = comida y cena
  admin_approved BOOLEAN DEFAULT false,
  admin_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_approved_at TIMESTAMP WITH TIME ZONE,
  nutricionista_approved BOOLEAN DEFAULT false,
  nutricionista_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  nutricionista_approved_at TIMESTAMP WITH TIME ZONE,
  requires_consultation BOOLEAN DEFAULT true, -- Requiere reunión presencial
  consultation_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar campo meals_per_day si no existe (para bases de datos existentes)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS meals_per_day INTEGER DEFAULT 1 CHECK (meals_per_day IN (1, 2));

-- Comentario explicativo
COMMENT ON COLUMN subscriptions.meals_per_day IS 'Número de comidas por día: 1 = comida o cena, 2 = comida y cena';

-- Actualizar suscripciones existentes a 1 comida por día por defecto
UPDATE subscriptions 
SET meals_per_day = 1 
WHERE meals_per_day IS NULL;

-- Tabla de contratos digitales
CREATE TABLE IF NOT EXISTS subscription_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  contract_text TEXT NOT NULL, -- Texto del contrato generado
  contract_type TEXT NOT NULL, -- 'mensual', 'trimestral', 'anual'
  signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  signature_method TEXT, -- 'electronic_signature', 'checkbox_acceptance'
  signature_image TEXT, -- Imagen de la firma electrónica en formato base64 (data:image/png;base64,...)
  ip_address TEXT, -- Para trazabilidad legal
  user_agent TEXT, -- Para trazabilidad legal
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar columna signature_image si no existe (para bases de datos existentes)
ALTER TABLE subscription_contracts 
ADD COLUMN IF NOT EXISTS signature_image TEXT;

-- Comentario explicativo
COMMENT ON COLUMN subscription_contracts.signature_image IS 'Imagen de la firma electrónica en formato base64 (data:image/png;base64,...)';

-- Índice para búsquedas rápidas de contratos firmados con firma electrónica
CREATE INDEX IF NOT EXISTS idx_subscription_contracts_signature_method 
ON subscription_contracts(signature_method) 
WHERE signature_method = 'electronic_signature';

-- Tabla de historial de pagos
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT, -- 'external_entity', 'cash', 'card', etc.
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  external_payment_id TEXT, -- ID de pago en entidad externa (para cuotas anuales)
  installment_number INTEGER, -- Número de cuota (para pagos en cuotas)
  total_installments INTEGER, -- Total de cuotas
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CONFIGURACIÓN DE MIEMBROS Y PLANES GRUPALES
-- ============================================

-- Tabla de miembros de grupos
CREATE TABLE IF NOT EXISTS subscription_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES subscription_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Usuario principal del grupo
  meals_per_week INTEGER DEFAULT 7, -- Número de comidas por semana que controla este miembro
  added_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin que agregó el miembro
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE, -- Si fue removido del grupo
  removed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(group_id, user_id) -- Un usuario solo puede estar una vez en un grupo
);

-- ============================================
-- 3. GESTIÓN DE MENÚS Y NUTRICIÓN
-- ============================================

-- Tabla de menús semanales generados
CREATE TABLE IF NOT EXISTS weekly_menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES subscription_groups(id) ON DELETE SET NULL, -- NULL si es individual
  week_start_date DATE NOT NULL, -- Lunes de la semana
  week_end_date DATE NOT NULL, -- Domingo de la semana
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'modified', 'approved', 'delivered')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by TEXT DEFAULT 'system', -- 'system' o user_id del nutricionista
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start_date) -- Un menú por usuario por semana
);

-- Tabla de días del menú semanal
CREATE TABLE IF NOT EXISTS weekly_menu_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_menu_id UUID NOT NULL REFERENCES weekly_menus(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL, -- 'Lunes', 'Martes', etc.
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de comidas en días del menú semanal
CREATE TABLE IF NOT EXISTS weekly_menu_day_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_menu_day_id UUID NOT NULL REFERENCES weekly_menu_days(id) ON DELETE CASCADE,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE RESTRICT,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  order_index INTEGER NOT NULL, -- Orden de la comida en el día
  is_original BOOLEAN DEFAULT true, -- Si es la comida original o una modificación
  original_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL, -- Si fue modificado, referencia al original
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de modificaciones de menús pendientes de aprobación
CREATE TABLE IF NOT EXISTS menu_modifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_menu_id UUID NOT NULL REFERENCES weekly_menus(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  original_meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE RESTRICT,
  requested_meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE RESTRICT,
  nutritionist_recommendation TEXT, -- Recomendación del nutricionista
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Nutricionista que aprobó
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de favoritos de usuarios
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, meal_id) -- Un usuario solo puede tener un favorito por comida
);

-- Tabla de notas del nutricionista sobre usuarios
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nutricionista_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true, -- Solo visible para nutricionista y admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de restricciones alimentarias por usuario
CREATE TABLE IF NOT EXISTS dietary_restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL, -- 'allergy', 'intolerance', 'preference', 'religious', 'medical'
  restriction_name TEXT NOT NULL, -- 'Gluten', 'Lactosa', 'Vegano', etc.
  severity TEXT DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de control de stock de platos
CREATE TABLE IF NOT EXISTS meal_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_threshold INTEGER DEFAULT 5, -- Umbral mínimo de stock
  is_out_of_stock BOOLEAN DEFAULT false,
  out_of_stock_since TIMESTAMP WITH TIME ZONE,
  nutritionist_notified BOOLEAN DEFAULT false, -- Si se notificó al nutricionista
  nutritionist_notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meal_id) -- Un registro de stock por comida
);

-- Tabla de sustituciones de platos por falta de stock
CREATE TABLE IF NOT EXISTS meal_substitutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  substitute_meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE RESTRICT,
  weekly_menu_id UUID REFERENCES weekly_menus(id) ON DELETE SET NULL, -- Si es para un menú específico
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Nutricionista que aprobó
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. NOTIFICACIONES Y PREFERENCIAS
-- ============================================

-- Extender user_settings con nuevas preferencias de notificación
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notifications_weekly_menu BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notifications_menu_changes_approved BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notifications_order_status BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notifications_renewal_reminder BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notifications_plan_approval BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notifications_consultation_required BOOLEAN DEFAULT true;

-- Tabla de notificaciones enviadas (para historial)
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'weekly_menu', 'menu_changes_approved', 'order_status', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT false, -- Notificaciones obligatorias (legales/seguridad)
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. ENTREGAS Y LOGÍSTICA
-- ============================================

-- Tabla de direcciones de entrega
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'España',
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  delivery_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de historial de direcciones (para archivar cambios)
CREATE TABLE IF NOT EXISTS delivery_address_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address_id UUID NOT NULL REFERENCES delivery_addresses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted'))
);

-- Extender tabla orders con modalidad de entrega
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'delivery' CHECK (delivery_mode IN ('delivery', 'pickup'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES delivery_addresses(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location TEXT; -- Si es pickup, ubicación de recogida

-- Tabla de seguimiento de pedidos en tiempo real
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('preparando', 'en_camino', 'entregado', 'cancelado')),
  location_latitude DECIMAL(10,8), -- Ubicación del repartidor
  location_longitude DECIMAL(11,8),
  estimated_delivery_time TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Repartidor que actualizó
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de valoraciones de entregas
CREATE TABLE IF NOT EXISTS delivery_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repartidor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Estrellas (1-5)
  comment TEXT,
  is_visible_to_repartidor BOOLEAN DEFAULT false, -- Admin decide si compartir
  is_visible_to_admin BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
  UNIQUE(order_id, user_id) -- Un usuario solo puede valorar una vez por pedido
);

-- ============================================
-- 6. HISTORIAL Y REPORTES
-- ============================================

-- Tabla de historial de menús y reemplazos
CREATE TABLE IF NOT EXISTS menu_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_menu_id UUID NOT NULL REFERENCES weekly_menus(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('generated', 'modified', 'replaced', 'approved', 'delivered')),
  original_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  new_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  action_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Usuario que realizó la acción
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de reportes generados
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type TEXT NOT NULL CHECK (report_type IN ('nutritionist_weekly', 'nutritionist_monthly', 'nutritionist_manual', 'delivery_satisfaction_weekly', 'delivery_satisfaction_monthly', 'payment_history', 'menu_compliance')),
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL si es automático
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Usuario objetivo del reporte (NULL si es global)
  period_start DATE,
  period_end DATE,
  report_data JSONB NOT NULL, -- Datos del reporte en formato JSON
  is_shared_with_repartidores BOOLEAN DEFAULT false, -- Para reportes de satisfacción
  file_url TEXT, -- URL del archivo PDF/Excel si se generó
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_group_id ON subscriptions(group_id);
CREATE INDEX IF NOT EXISTS idx_subscription_contracts_subscription_id ON subscription_contracts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_groups_primary_user_id ON subscription_groups(primary_user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_group_members_group_id ON subscription_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_subscription_group_members_user_id ON subscription_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_user_id ON weekly_menus(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_menus_week_start_date ON weekly_menus(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_menu_days_weekly_menu_id ON weekly_menu_days(weekly_menu_id);
CREATE INDEX IF NOT EXISTS idx_weekly_menu_day_meals_weekly_menu_day_id ON weekly_menu_day_meals(weekly_menu_day_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifications_weekly_menu_id ON menu_modifications(weekly_menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_modifications_status ON menu_modifications(status);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_nutricionista_id ON user_notes(nutricionista_id);
CREATE INDEX IF NOT EXISTS idx_dietary_restrictions_user_id ON dietary_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_stock_meal_id ON meal_stock(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_stock_is_out_of_stock ON meal_stock(is_out_of_stock);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_is_primary ON delivery_addresses(is_primary);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_order_id ON delivery_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_repartidor_id ON delivery_ratings(repartidor_id);
CREATE INDEX IF NOT EXISTS idx_menu_history_weekly_menu_id ON menu_history(weekly_menu_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_notifications_log_user_id ON notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_sent_at ON notifications_log(sent_at);

-- ============================================
-- 7. NOTIFICACIONES PUSH
-- ============================================

-- Tabla para almacenar suscripciones push
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Índice para búsquedas por endpoint
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER trigger_update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- ============================================
-- TRIGGERS PARA ACTUALIZAR updated_at
-- ============================================

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_contracts_updated_at ON subscription_contracts;
CREATE TRIGGER update_subscription_contracts_updated_at BEFORE UPDATE ON subscription_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_history_updated_at ON payment_history;
CREATE TRIGGER update_payment_history_updated_at BEFORE UPDATE ON payment_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_groups_updated_at ON subscription_groups;
CREATE TRIGGER update_subscription_groups_updated_at BEFORE UPDATE ON subscription_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_weekly_menus_updated_at ON weekly_menus;
CREATE TRIGGER update_weekly_menus_updated_at BEFORE UPDATE ON weekly_menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_modifications_updated_at ON menu_modifications;
CREATE TRIGGER update_menu_modifications_updated_at BEFORE UPDATE ON menu_modifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notes_updated_at ON user_notes;
CREATE TRIGGER update_user_notes_updated_at BEFORE UPDATE ON user_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dietary_restrictions_updated_at ON dietary_restrictions;
CREATE TRIGGER update_dietary_restrictions_updated_at BEFORE UPDATE ON dietary_restrictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meal_stock_updated_at ON meal_stock;
CREATE TRIGGER update_meal_stock_updated_at BEFORE UPDATE ON meal_stock
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meal_substitutions_updated_at ON meal_substitutions;
CREATE TRIGGER update_meal_substitutions_updated_at BEFORE UPDATE ON meal_substitutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_addresses_updated_at ON delivery_addresses;
CREATE TRIGGER update_delivery_addresses_updated_at BEFORE UPDATE ON delivery_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_ratings_updated_at ON delivery_ratings;
CREATE TRIGGER update_delivery_ratings_updated_at BEFORE UPDATE ON delivery_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCIONES Y TRIGGERS ESPECIALES
-- ============================================

-- Función para actualizar stock cuando se marca una comida como sin stock
CREATE OR REPLACE FUNCTION update_meal_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_quantity <= 0 AND OLD.stock_quantity > 0 THEN
        NEW.is_out_of_stock = true;
        NEW.out_of_stock_since = NOW();
        NEW.nutritionist_notified = false; -- Se notificará al nutricionista
        
        -- Bloquear el plato automáticamente
        UPDATE meals
        SET available = false
        WHERE id = NEW.meal_id;
        
    ELSIF NEW.stock_quantity > 0 AND OLD.stock_quantity <= 0 THEN
        NEW.is_out_of_stock = false;
        NEW.out_of_stock_since = NULL;
        
        -- Desbloquear el plato si vuelve a tener stock
        UPDATE meals
        SET available = true
        WHERE id = NEW.meal_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_meal_stock_status ON meal_stock;
CREATE TRIGGER trigger_update_meal_stock_status BEFORE UPDATE ON meal_stock
    FOR EACH ROW EXECUTE FUNCTION update_meal_stock_status();

-- Función para archivar cambios de direcciones
CREATE OR REPLACE FUNCTION archive_delivery_address_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO delivery_address_history (
            address_id, user_id, address_line1, address_line2, city, postal_code, country, change_type
        ) VALUES (
            OLD.id, OLD.user_id, OLD.address_line1, OLD.address_line2, OLD.city, OLD.postal_code, OLD.country, 'updated'
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO delivery_address_history (
            address_id, user_id, address_line1, address_line2, city, postal_code, country, change_type
        ) VALUES (
            OLD.id, OLD.user_id, OLD.address_line1, OLD.address_line2, OLD.city, OLD.postal_code, OLD.country, 'deleted'
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_archive_delivery_address_changes ON delivery_addresses;
CREATE TRIGGER trigger_archive_delivery_address_changes 
    AFTER UPDATE OR DELETE ON delivery_addresses
    FOR EACH ROW EXECUTE FUNCTION archive_delivery_address_changes();

-- Función para asegurar que solo hay una dirección principal por usuario
CREATE OR REPLACE FUNCTION ensure_single_primary_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE delivery_addresses 
        SET is_primary = false 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_primary_address ON delivery_addresses;
CREATE TRIGGER trigger_ensure_single_primary_address 
    BEFORE INSERT OR UPDATE ON delivery_addresses
    FOR EACH ROW EXECUTE FUNCTION ensure_single_primary_address();

-- Función para notificar a nutricionistas cuando un plato queda sin stock
CREATE OR REPLACE FUNCTION notify_nutritionists_out_of_stock()
RETURNS TRIGGER AS $$
DECLARE
    meal_name TEXT;
    nutritionist_record RECORD;
BEGIN
    -- Solo notificar si el plato acaba de quedar sin stock y no se ha notificado antes
    IF NEW.is_out_of_stock = true AND NEW.nutritionist_notified = false AND (OLD.is_out_of_stock = false OR OLD.is_out_of_stock IS NULL) THEN
        -- Obtener nombre del plato
        SELECT name INTO meal_name
        FROM meals
        WHERE id = NEW.meal_id;
        
        -- Notificar a todos los nutricionistas
        FOR nutritionist_record IN 
            SELECT id FROM users WHERE role = 'nutricionista'
        LOOP
            -- Registrar notificación en el log
            INSERT INTO notifications_log (
                user_id,
                notification_type,
                title,
                message,
                is_mandatory
            ) VALUES (
                nutritionist_record.id,
                'stock_alert',
                '⚠️ Plato sin stock',
                'El plato "' || COALESCE(meal_name, 'N/A') || '" se ha quedado sin stock y ha sido bloqueado automáticamente.',
                false
            );
        END LOOP;
        
        -- Marcar como notificado
        NEW.nutritionist_notified = true;
        NEW.nutritionist_notified_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_nutritionists_out_of_stock ON meal_stock;
CREATE TRIGGER trigger_notify_nutritionists_out_of_stock 
    AFTER UPDATE ON meal_stock
    FOR EACH ROW EXECUTE FUNCTION notify_nutritionists_out_of_stock();

-- Función para actualizar precios de suscripciones cuando cambia el descuento del grupo
CREATE OR REPLACE FUNCTION update_group_subscription_prices()
RETURNS TRIGGER AS $$
DECLARE
    subscription_record RECORD;
    plan_base_price DECIMAL(10,2);
    final_price DECIMAL(10,2);
    group_discount DECIMAL(5,2);
BEGIN
    -- Si cambió el descuento del grupo, actualizar todas las suscripciones del grupo
    IF NEW.discount_percentage != OLD.discount_percentage THEN
        group_discount := NEW.discount_percentage;
        
        -- Actualizar precio de cada suscripción del grupo
        FOR subscription_record IN 
            SELECT s.id, s.plan_id
            FROM subscriptions s
            WHERE s.group_id = NEW.id
            AND s.status = 'active'
        LOOP
            -- Obtener precio base del plan
            SELECT base_price INTO plan_base_price
            FROM subscription_plans
            WHERE id = subscription_record.plan_id;
            
            -- Calcular precio final con descuento del grupo
            final_price := plan_base_price * (1 - group_discount / 100);
            
            -- Actualizar suscripción
            UPDATE subscriptions
            SET price = final_price,
                discount_applied = group_discount,
                updated_at = NOW()
            WHERE id = subscription_record.id;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_group_subscription_prices ON subscription_groups;
CREATE TRIGGER trigger_update_group_subscription_prices 
    AFTER UPDATE ON subscription_groups
    FOR EACH ROW EXECUTE FUNCTION update_group_subscription_prices();

-- Función para sincronizar pagos con suscripciones
CREATE OR REPLACE FUNCTION sync_payment_with_subscription()
RETURNS TRIGGER AS $$
DECLARE
    subscription_record RECORD;
    total_paid DECIMAL(10,2);
BEGIN
    -- Obtener la suscripción asociada
    SELECT * INTO subscription_record
    FROM subscriptions
    WHERE id = NEW.subscription_id;
    
    IF subscription_record IS NOT NULL THEN
        -- Calcular total pagado
        SELECT COALESCE(SUM(amount), 0) INTO total_paid
        FROM payment_history
        WHERE subscription_id = NEW.subscription_id
        AND payment_status = 'completed';
        
        -- Si el total pagado es igual o mayor al precio de la suscripción, activar suscripción
        IF total_paid >= subscription_record.price AND subscription_record.status = 'pending_approval' THEN
            UPDATE subscriptions
            SET status = 'active',
                start_date = CURRENT_DATE,
                end_date = CURRENT_DATE + (SELECT duration_months FROM subscription_plans WHERE id = subscription_record.plan_id) * INTERVAL '1 month',
                updated_at = NOW()
            WHERE id = NEW.subscription_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_payment_with_subscription ON payment_history;
CREATE TRIGGER trigger_sync_payment_with_subscription 
    AFTER INSERT OR UPDATE ON payment_history
    FOR EACH ROW 
    WHEN (NEW.payment_status = 'completed')
    EXECUTE FUNCTION sync_payment_with_subscription();

-- ============================================
-- ACTUALIZAR PLANES DE SUSCRIPCIÓN EXISTENTES
-- Los planes ahora representan solo la duración (1, 3, 12 meses)
-- El precio base se calculará multiplicando:
-- - Precio base por comida por día
-- - Número de comidas por día (1 o 2)
-- - Duración en meses
-- ============================================

-- Actualizar planes existentes con precios base por comida por mes
-- Precio por comida por mes: 150€
-- Precio para 2 comidas/día por mes: 275€ (precio especial)
UPDATE subscription_plans 
SET price_per_meal_per_month = 150.00
WHERE price_per_meal_per_month IS NULL;

-- Actualizar base_price para que sea calculado dinámicamente
-- base_price ahora será: price_per_meal_per_month * duration_months (para 1 comida)
UPDATE subscription_plans 
SET base_price = price_per_meal_per_month * duration_months
WHERE base_price IS NULL OR base_price = 0;

-- ============================================
-- DATOS INICIALES (SEEDS)
-- ============================================

-- Insertar planes de suscripción por defecto
-- Precio por comida por mes: 150€
-- Precio para 2 comidas/día por mes: 275€ (precio especial, no 300€)
-- base_price representa el precio para 1 comida/día por la duración del plan
INSERT INTO subscription_plans (name, duration_months, base_price, price_per_meal_per_month, discount_percentage, description) VALUES
    ('Mensual', 1, 150.00, 150.00, 0, 'Plan mensual de suscripción nutricional (1 comida/día)'),
    ('Trimestral', 3, 450.00, 150.00, 0, 'Plan trimestral (3 meses, 1 comida/día)'),
    ('Anual', 12, 1800.00, 150.00, 0, 'Plan anual (12 meses, 1 comida/día)')
ON CONFLICT (name) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    price_per_meal_per_month = EXCLUDED.price_per_meal_per_month,
    discount_percentage = EXCLUDED.discount_percentage,
    description = EXCLUDED.description;

-- ============================================
-- ACTUALIZACIÓN DE DATOS EXISTENTES (OPCIONAL)
-- ============================================
-- NOTA: Estos scripts son opcionales y solo deben ejecutarse si tienes usuarios existentes
-- que necesitan ser actualizados. Para nuevas instalaciones, no son necesarios.

-- Script para actualizar must_change_password en usuarios existentes
-- (Solo ejecutar si tienes usuarios creados antes de implementar esta funcionalidad)
-- Descomenta las siguientes líneas si necesitas actualizar usuarios existentes:
/*
-- Actualizar todos los usuarios existentes para que no tengan que cambiar la contraseña
-- Esto es seguro porque estos usuarios ya tienen contraseñas establecidas
UPDATE users
SET must_change_password = false,
    updated_at = NOW()
WHERE must_change_password = true;

-- Verificar que la actualización se aplicó correctamente
SELECT 
    role,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE must_change_password = true) as must_change,
    COUNT(*) FILTER (WHERE must_change_password = false) as no_must_change
FROM users
GROUP BY role
ORDER BY role;
*/

