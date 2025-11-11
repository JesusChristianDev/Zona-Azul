-- Esquema de base de datos para Zona Azul
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

