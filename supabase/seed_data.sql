-- Seed consolidado para datos de desarrollo
-- Incluye usuarios base, perfiles, un plan de suscripción, pedidos de prueba e incidencias
-- Ejecutar en el SQL Editor de Supabase después de haber corrido el esquema completo

-- =============================
-- 1) Usuarios principales
-- =============================
INSERT INTO users (id, email, password_hash, role, name, phone, must_change_password, created_at, updated_at)
VALUES
  ('11111111-1111-4111-8111-111111111111'::uuid, 'admin@zonaazul.com', '$2b$10$uZu40L/PAAMj9/5rgbXOR.06cbo0Kk0qYUVQ/roGWFdNqfZhdDmYK', 'admin', 'Admin Zona Azul', '+34 600 000 001', false, NOW(), NOW()),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'nutricionista@zonaazul.com', '$2b$10$uZu40L/PAAMj9/5rgbXOR.06cbo0Kk0qYUVQ/roGWFdNqfZhdDmYK', 'nutricionista', 'Nuria Nutricionista', '+34 600 000 002', false, NOW(), NOW()),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'repartidor@zonaazul.com', '$2b$10$uZu40L/PAAMj9/5rgbXOR.06cbo0Kk0qYUVQ/roGWFdNqfZhdDmYK', 'repartidor', 'Raúl Repartos', '+34 600 000 003', false, NOW(), NOW()),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'cliente-demo@zonaazul.com', '$2b$10$uZu40L/PAAMj9/5rgbXOR.06cbo0Kk0qYUVQ/roGWFdNqfZhdDmYK', 'suscriptor', 'Clara Cliente', '+34 600 000 004', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  must_change_password = EXCLUDED.must_change_password;

-- =============================
-- 2) Perfiles y estado de suscripción
-- =============================
INSERT INTO profiles (user_id, subscription_status, goals_weight, goals_calories, goals_water, address, created_at, updated_at)
VALUES
  ('44444444-4444-4444-8444-444444444444'::uuid, 'inactive', 68.0, 1900, 2200, 'Calle Sol 123, Madrid', NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE SET
  subscription_status = EXCLUDED.subscription_status,
  goals_weight = EXCLUDED.goals_weight,
  goals_calories = EXCLUDED.goals_calories,
  goals_water = EXCLUDED.goals_water,
  address = EXCLUDED.address;

-- =============================
-- 3) Plan y suscripción de ejemplo
-- =============================
INSERT INTO subscription_plans (id, name, duration_months, base_price, price_per_meal_per_month, discount_percentage, description, is_active)
VALUES
  ('55555555-5555-4555-8555-555555555555'::uuid, 'Plan Mensual Demo', 1, 150.00, 150.00, 0, 'Suscripción mensual básica para pruebas', true)
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

INSERT INTO subscriptions (
  user_id,
  plan_id,
  status,
  start_date,
  end_date,
  price,
  discount_applied,
  meals_per_day,
  admin_approved,
  nutricionista_approved,
  requires_consultation,
  consultation_completed,
  created_at,
  updated_at
)
VALUES (
  '44444444-4444-4444-8444-444444444444'::uuid,
  '55555555-5555-4555-8555-555555555555'::uuid,
  'active',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  150.00,
  0,
  1,
  true,
  true,
  true,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- =============================
-- 4) Pedido asignado al repartidor y con incidencia abierta
-- =============================
INSERT INTO orders (
  id,
  user_id,
  status,
  total_amount,
  delivery_address,
  delivery_instructions,
  delivery_mode,
  repartidor_id,
  estimated_delivery_time,
  created_at,
  updated_at
)
VALUES (
  '66666666-6666-4666-8666-666666666666'::uuid,
  '44444444-4444-4444-8444-444444444444'::uuid,
  'en_camino',
  24.99,
  'Calle Sol 123, Madrid',
  'Llamar al llegar',
  'delivery',
  '33333333-3333-4333-8333-333333333333'::uuid,
  NOW() + INTERVAL '30 minutes',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  repartidor_id = EXCLUDED.repartidor_id,
  updated_at = EXCLUDED.updated_at;

INSERT INTO order_incidents (
  id,
  order_id,
  repartidor_id,
  description,
  status,
  created_at,
  updated_at
)
VALUES (
  '77777777-7777-4777-8777-777777777777'::uuid,
  '66666666-6666-4666-8666-666666666666'::uuid,
  '33333333-3333-4333-8333-333333333333'::uuid,
  'Retraso por tráfico en la zona',
  'reported',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- =============================
-- 5) Datos ampliados para clientes mock existentes
-- =============================
-- El script original con planes completos y menús sigue estando disponible en supabase/seed_cliente_ejemplo.sql
-- Si necesitas más datos (menús, planes, etc.), ejecuta también ese archivo después de este.
