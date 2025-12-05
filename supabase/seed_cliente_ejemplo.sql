-- Seed SQL: Cliente de ejemplo para visualizar el plan de comidas
-- Este script crea un usuario suscriptor con suscripción activa y plan nutricional
-- Ejecutar en el SQL Editor de Supabase

-- ============================================
-- 1. CREAR USUARIO SUSCRIPTOR
-- ============================================

-- Usuario con suscripción de 1 comida por día (para probar el selector Almuerzo/Cena)
INSERT INTO users (id, email, password_hash, role, name, phone, must_change_password, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-4789-a012-345678901234'::uuid,
  'cliente1@zonaazul.com',
  '$2b$10$uZu40L/PAAMj9/5rgbXOR.06cbo0Kk0qYUVQ/roGWFdNqfZhdDmYK', -- Contraseña: "password123"
  'suscriptor',
  'María García',
  '+34 600 123 456',
  false, -- Ya cambió la contraseña
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  must_change_password = EXCLUDED.must_change_password;

-- Usuario con suscripción de 2 comidas por día (para comparar)
INSERT INTO users (id, email, password_hash, role, name, phone, must_change_password, created_at, updated_at)
VALUES (
  'b2c3d4e5-f6a7-4890-b123-456789012345'::uuid,
  'cliente2@zonaazul.com',
  '$2b$10$uZu40L/PAAMj9/5rgbXOR.06cbo0Kk0qYUVQ/roGWFdNqfZhdDmYK', -- Contraseña: "password123"
  'suscriptor',
  'Juan Pérez',
  '+34 600 654 321',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  must_change_password = EXCLUDED.must_change_password;

-- ============================================
-- 2. CREAR PERFILES
-- ============================================

INSERT INTO profiles (user_id, subscription_status, goals_weight, goals_calories, goals_water, address, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-4789-a012-345678901234'::uuid,
  'active',
  65.0,
  1800,
  2000,
  'Calle Ejemplo 123, Madrid',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  subscription_status = EXCLUDED.subscription_status,
  goals_weight = EXCLUDED.goals_weight,
  goals_calories = EXCLUDED.goals_calories,
  goals_water = EXCLUDED.goals_water,
  address = EXCLUDED.address;

INSERT INTO profiles (user_id, subscription_status, goals_weight, goals_calories, goals_water, address, created_at, updated_at)
VALUES (
  'b2c3d4e5-f6a7-4890-b123-456789012345'::uuid,
  'active',
  75.0,
  2200,
  2500,
  'Avenida Test 456, Barcelona',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  subscription_status = EXCLUDED.subscription_status,
  goals_weight = EXCLUDED.goals_weight,
  goals_calories = EXCLUDED.goals_calories,
  goals_water = EXCLUDED.goals_water,
  address = EXCLUDED.address;

-- ============================================
-- 3. OBTENER O CREAR PLAN DE SUSCRIPCIÓN
-- ============================================

-- Asegurar que existe un plan mensual (si no existe, crearlo)
INSERT INTO subscription_plans (name, duration_months, base_price, price_per_meal_per_month, discount_percentage, description, is_active)
VALUES (
  'Mensual',
  1,
  150.00,
  150.00,
  0,
  'Plan mensual de suscripción nutricional (1 comida/día)',
  true
)
ON CONFLICT (name) DO NOTHING;

-- Obtener el ID del plan mensual
DO $$
DECLARE
  plan_id_var UUID;
BEGIN
  SELECT id INTO plan_id_var FROM subscription_plans WHERE name = 'Mensual' LIMIT 1;
  
  -- Si no existe, crearlo
  IF plan_id_var IS NULL THEN
    INSERT INTO subscription_plans (name, duration_months, base_price, price_per_meal_per_month, discount_percentage, description, is_active)
    VALUES ('Mensual', 1, 150.00, 150.00, 0, 'Plan mensual de suscripción nutricional (1 comida/día)', true)
    RETURNING id INTO plan_id_var;
  END IF;
END $$;

-- ============================================
-- 4. CREAR SUSCRIPCIONES ACTIVAS
-- ============================================

-- Suscripción con 1 comida por día (cliente1)
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
SELECT
  'a1b2c3d4-e5f6-4789-a012-345678901234'::uuid,
  sp.id,
  'active',
  CURRENT_DATE,
  CURRENT_DATE + (sp.duration_months * INTERVAL '1 month'),
  sp.base_price,
  0,
  1, -- 1 comida por día
  true,
  true,
  true,
  true,
  NOW(),
  NOW()
FROM subscription_plans sp
WHERE sp.name = 'Mensual'
ON CONFLICT DO NOTHING;

-- Suscripción con 2 comidas por día (cliente2)
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
SELECT
  'b2c3d4e5-f6a7-4890-b123-456789012345'::uuid,
  sp.id,
  'active',
  CURRENT_DATE,
  CURRENT_DATE + (sp.duration_months * INTERVAL '1 month'),
  sp.base_price * 1.83, -- Aproximadamente 275€/mes para 2 comidas
  0,
  2, -- 2 comidas por día
  true,
  true,
  true,
  true,
  NOW(),
  NOW()
FROM subscription_plans sp
WHERE sp.name = 'Mensual'
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. CREAR COMIDAS DE EJEMPLO (para planes nutricionales)
-- ============================================

-- Comidas para planes nutricionales (is_menu_item = false)
INSERT INTO meals (id, name, description, type, calories, protein, carbs, fats, ingredients, available, is_menu_item, created_at, updated_at)
VALUES
  -- Almuerzos
  ('c1d2e3f4-a5b6-4789-c012-345678901234'::uuid, 'Ensalada Mediterránea con Pollo', 'Ensalada fresca con pollo a la plancha, tomate, pepino, aceitunas y queso feta', 'lunch', 450, 35.0, 25.0, 22.0, ARRAY['Pollo', 'Lechuga', 'Tomate', 'Pepino', 'Aceitunas', 'Queso feta'], true, false, NOW(), NOW()),
  ('d2e3f4a5-b6c7-4890-d123-456789012345'::uuid, 'Bowl de Quinoa y Verduras', 'Bowl nutritivo con quinoa, brócoli, zanahoria, aguacate y semillas', 'lunch', 420, 18.0, 55.0, 15.0, ARRAY['Quinoa', 'Brócoli', 'Zanahoria', 'Aguacate', 'Semillas'], true, false, NOW(), NOW()),
  ('e3f4a5b6-c7d8-4901-e234-567890123456'::uuid, 'Wrap de Pollo y Vegetales', 'Wrap integral con pollo, lechuga, tomate, cebolla y salsa yogur', 'lunch', 380, 28.0, 42.0, 12.0, ARRAY['Pollo', 'Tortilla integral', 'Lechuga', 'Tomate', 'Cebolla'], true, false, NOW(), NOW()),
  
  -- Cenas
  ('f4a5b6c7-d8e9-4012-f345-678901234567'::uuid, 'Salmón al Horno con Verduras', 'Salmón al horno con brócoli, calabacín y patata asada', 'dinner', 480, 38.0, 30.0, 22.0, ARRAY['Salmón', 'Brócoli', 'Calabacín', 'Patata'], true, false, NOW(), NOW()),
  ('a5b6c7d8-e9f0-4123-a456-789012345678'::uuid, 'Pasta Integral con Verduras', 'Pasta integral con verduras salteadas y salsa de tomate natural', 'dinner', 420, 15.0, 65.0, 10.0, ARRAY['Pasta integral', 'Verduras', 'Tomate', 'Ajo'], true, false, NOW(), NOW()),
  ('b6c7d8e9-f0a1-4234-b567-890123456789'::uuid, 'Bowl de Poke de Atún', 'Bowl con arroz, atún fresco, aguacate, edamame y salsa teriyaki', 'dinner', 460, 32.0, 50.0, 18.0, ARRAY['Atún', 'Arroz', 'Aguacate', 'Edamame'], true, false, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  calories = EXCLUDED.calories,
  available = EXCLUDED.available;

-- ============================================
-- 6. CREAR PLAN NUTRICIONAL PARA CLIENTE1 (1 comida/día)
-- ============================================

-- Plan nutricional
INSERT INTO meal_plans (
  id,
  name,
  description,
  user_id,
  start_date,
  end_date,
  total_calories,
  status,
  created_at,
  updated_at
)
VALUES (
  'f1a2b3c4-d5e6-4789-f012-345678901234'::uuid,
  'Plan Semanal Personalizado - María',
  'Plan nutricional personalizado para María García',
  'a1b2c3d4-e5f6-4789-a012-345678901234'::uuid,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  1800,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status;

-- Días del plan (Lunes a Viernes)
INSERT INTO meal_plan_days (id, meal_plan_id, day_name, day_number, total_calories, created_at)
VALUES
  ('e1a2b3c4-e5f6-4789-a012-345678901234'::uuid, 'f1a2b3c4-d5e6-4789-f012-345678901234'::uuid, 'Lunes', 1, 450, NOW()),
  ('e2b3c4d5-f6a7-4890-b123-456789012345'::uuid, 'f1a2b3c4-d5e6-4789-f012-345678901234'::uuid, 'Martes', 2, 420, NOW()),
  ('e3c4d5e6-a7b8-4901-c234-567890123456'::uuid, 'f1a2b3c4-d5e6-4789-f012-345678901234'::uuid, 'Miércoles', 3, 480, NOW()),
  ('e4d5e6f7-b8c9-4012-d345-678901234567'::uuid, 'f1a2b3c4-d5e6-4789-f012-345678901234'::uuid, 'Jueves', 4, 420, NOW()),
  ('e5e6f7a8-c9d0-4123-e456-789012345678'::uuid, 'f1a2b3c4-d5e6-4789-f012-345678901234'::uuid, 'Viernes', 5, 380, NOW())
ON CONFLICT (id) DO UPDATE SET
  day_name = EXCLUDED.day_name,
  total_calories = EXCLUDED.total_calories;

-- Asignar comidas a los días (almuerzos y cenas para que el usuario pueda elegir)
INSERT INTO meal_plan_day_meals (meal_plan_day_id, meal_id, meal_name, meal_description, calories, order_index, created_at)
VALUES
  -- Lunes: Almuerzo y Cena (usuario elige 1)
  ('e1a2b3c4-e5f6-4789-a012-345678901234'::uuid, 'c1d2e3f4-a5b6-4789-c012-345678901234'::uuid, 'Ensalada Mediterránea con Pollo', 'Ensalada fresca con pollo a la plancha, tomate, pepino, aceitunas y queso feta', 450, 1, NOW()), -- Almuerzo
  ('e1a2b3c4-e5f6-4789-a012-345678901234'::uuid, 'f4a5b6c7-d8e9-4012-f345-678901234567'::uuid, 'Salmón al Horno con Verduras', 'Salmón al horno con brócoli, calabacín y patata asada', 480, 2, NOW()), -- Cena
  
  -- Martes: Almuerzo y Cena
  ('e2b3c4d5-f6a7-4890-b123-456789012345'::uuid, 'd2e3f4a5-b6c7-4890-d123-456789012345'::uuid, 'Bowl de Quinoa y Verduras', 'Bowl nutritivo con quinoa, brócoli, zanahoria, aguacate y semillas', 420, 1, NOW()), -- Almuerzo
  ('e2b3c4d5-f6a7-4890-b123-456789012345'::uuid, 'a5b6c7d8-e9f0-4123-a456-789012345678'::uuid, 'Pasta Integral con Verduras', 'Pasta integral con verduras salteadas y salsa de tomate natural', 420, 2, NOW()), -- Cena
  
  -- Miércoles: Almuerzo y Cena
  ('e3c4d5e6-a7b8-4901-c234-567890123456'::uuid, 'e3f4a5b6-c7d8-4901-e234-567890123456'::uuid, 'Wrap de Pollo y Vegetales', 'Wrap integral con pollo, lechuga, tomate, cebolla y salsa yogur', 380, 1, NOW()), -- Almuerzo
  ('e3c4d5e6-a7b8-4901-c234-567890123456'::uuid, 'b6c7d8e9-f0a1-4234-b567-890123456789'::uuid, 'Bowl de Poke de Atún', 'Bowl con arroz, atún fresco, aguacate, edamame y salsa teriyaki', 460, 2, NOW()), -- Cena
  
  -- Jueves: Almuerzo y Cena
  ('e4d5e6f7-b8c9-4012-d345-678901234567'::uuid, 'c1d2e3f4-a5b6-4789-c012-345678901234'::uuid, 'Ensalada Mediterránea con Pollo', 'Ensalada fresca con pollo a la plancha, tomate, pepino, aceitunas y queso feta', 450, 1, NOW()), -- Almuerzo
  ('e4d5e6f7-b8c9-4012-d345-678901234567'::uuid, 'f4a5b6c7-d8e9-4012-f345-678901234567'::uuid, 'Salmón al Horno con Verduras', 'Salmón al horno con brócoli, calabacín y patata asada', 480, 2, NOW()), -- Cena
  
  -- Viernes: Almuerzo y Cena
  ('e5e6f7a8-c9d0-4123-e456-789012345678'::uuid, 'd2e3f4a5-b6c7-4890-d123-456789012345'::uuid, 'Bowl de Quinoa y Verduras', 'Bowl nutritivo con quinoa, brócoli, zanahoria, aguacate y semillas', 420, 1, NOW()), -- Almuerzo
  ('e5e6f7a8-c9d0-4123-e456-789012345678'::uuid, 'a5b6c7d8-e9f0-4123-a456-789012345678'::uuid, 'Pasta Integral con Verduras', 'Pasta integral con verduras salteadas y salsa de tomate natural', 420, 2, NOW())  -- Cena
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. CREAR PLAN NUTRICIONAL PARA CLIENTE2 (2 comidas/día)
-- ============================================

-- Plan nutricional para cliente2
INSERT INTO meal_plans (
  id,
  name,
  description,
  user_id,
  start_date,
  end_date,
  total_calories,
  status,
  created_at,
  updated_at
)
VALUES (
  'f2b3c4d5-e6f7-4890-a123-456789012345'::uuid,
  'Plan Semanal Personalizado - Juan',
  'Plan nutricional personalizado para Juan Pérez',
  'b2c3d4e5-f6a7-4890-b123-456789012345'::uuid,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  2200,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status;

-- Días del plan (Lunes a Viernes)
INSERT INTO meal_plan_days (id, meal_plan_id, day_name, day_number, total_calories, created_at)
VALUES
  ('e6f7a8b9-c0d1-4234-e567-890123456789'::uuid, 'f2b3c4d5-e6f7-4890-a123-456789012345'::uuid, 'Lunes', 1, 930, NOW()),
  ('e7a8b9c0-d1e2-4345-f678-901234567890'::uuid, 'f2b3c4d5-e6f7-4890-a123-456789012345'::uuid, 'Martes', 2, 840, NOW()),
  ('e8b9c0d1-e2f3-4456-a789-012345678901'::uuid, 'f2b3c4d5-e6f7-4890-a123-456789012345'::uuid, 'Miércoles', 3, 940, NOW()),
  ('e9c0d1e2-f3a4-4567-b890-123456789012'::uuid, 'f2b3c4d5-e6f7-4890-a123-456789012345'::uuid, 'Jueves', 4, 840, NOW()),
  ('e0d1e2f3-a4b5-4678-c901-234567890123'::uuid, 'f2b3c4d5-e6f7-4890-a123-456789012345'::uuid, 'Viernes', 5, 760, NOW())
ON CONFLICT (id) DO UPDATE SET
  day_name = EXCLUDED.day_name,
  total_calories = EXCLUDED.total_calories;

-- Asignar comidas a los días (almuerzo Y cena para cada día)
INSERT INTO meal_plan_day_meals (meal_plan_day_id, meal_id, meal_name, meal_description, calories, order_index, created_at)
VALUES
  -- Lunes: Almuerzo Y Cena (ambas se muestran)
  ('e6f7a8b9-c0d1-4234-e567-890123456789'::uuid, 'c1d2e3f4-a5b6-4789-c012-345678901234'::uuid, 'Ensalada Mediterránea con Pollo', 'Ensalada fresca con pollo a la plancha, tomate, pepino, aceitunas y queso feta', 450, 1, NOW()), -- Almuerzo
  ('e6f7a8b9-c0d1-4234-e567-890123456789'::uuid, 'f4a5b6c7-d8e9-4012-f345-678901234567'::uuid, 'Salmón al Horno con Verduras', 'Salmón al horno con brócoli, calabacín y patata asada', 480, 2, NOW()), -- Cena
  
  -- Martes: Almuerzo Y Cena
  ('e7a8b9c0-d1e2-4345-f678-901234567890'::uuid, 'd2e3f4a5-b6c7-4890-d123-456789012345'::uuid, 'Bowl de Quinoa y Verduras', 'Bowl nutritivo con quinoa, brócoli, zanahoria, aguacate y semillas', 420, 1, NOW()), -- Almuerzo
  ('e7a8b9c0-d1e2-4345-f678-901234567890'::uuid, 'a5b6c7d8-e9f0-4123-a456-789012345678'::uuid, 'Pasta Integral con Verduras', 'Pasta integral con verduras salteadas y salsa de tomate natural', 420, 2, NOW()), -- Cena
  
  -- Miércoles: Almuerzo Y Cena
  ('e8b9c0d1-e2f3-4456-a789-012345678901'::uuid, 'e3f4a5b6-c7d8-4901-e234-567890123456'::uuid, 'Wrap de Pollo y Vegetales', 'Wrap integral con pollo, lechuga, tomate, cebolla y salsa yogur', 380, 1, NOW()), -- Almuerzo
  ('e8b9c0d1-e2f3-4456-a789-012345678901'::uuid, 'b6c7d8e9-f0a1-4234-b567-890123456789'::uuid, 'Bowl de Poke de Atún', 'Bowl con arroz, atún fresco, aguacate, edamame y salsa teriyaki', 460, 2, NOW()), -- Cena
  
  -- Jueves: Almuerzo Y Cena
  ('e9c0d1e2-f3a4-4567-b890-123456789012'::uuid, 'c1d2e3f4-a5b6-4789-c012-345678901234'::uuid, 'Ensalada Mediterránea con Pollo', 'Ensalada fresca con pollo a la plancha, tomate, pepino, aceitunas y queso feta', 450, 1, NOW()), -- Almuerzo
  ('e9c0d1e2-f3a4-4567-b890-123456789012'::uuid, 'f4a5b6c7-d8e9-4012-f345-678901234567'::uuid, 'Salmón al Horno con Verduras', 'Salmón al horno con brócoli, calabacín y patata asada', 480, 2, NOW()), -- Cena
  
  -- Viernes: Almuerzo Y Cena
  ('e0d1e2f3-a4b5-4678-c901-234567890123'::uuid, 'd2e3f4a5-b6c7-4890-d123-456789012345'::uuid, 'Bowl de Quinoa y Verduras', 'Bowl nutritivo con quinoa, brócoli, zanahoria, aguacate y semillas', 420, 1, NOW()), -- Almuerzo
  ('e0d1e2f3-a4b5-4678-c901-234567890123'::uuid, 'a5b6c7d8-e9f0-4123-a456-789012345678'::uuid, 'Pasta Integral con Verduras', 'Pasta integral con verduras salteadas y salsa de tomate natural', 420, 2, NOW())  -- Cena
ON CONFLICT DO NOTHING;

-- ============================================
-- RESUMEN
-- ============================================

-- Verificar que todo se creó correctamente
SELECT 
  'Usuarios creados' as tipo,
  COUNT(*) as cantidad
FROM users
WHERE email IN ('cliente1@zonaazul.com', 'cliente2@zonaazul.com')

UNION ALL

SELECT 
  'Suscripciones activas' as tipo,
  COUNT(*) as cantidad
FROM subscriptions
WHERE user_id IN (
  'a1b2c3d4-e5f6-4789-a012-345678901234'::uuid,
  'b2c3d4e5-f6a7-4890-b123-456789012345'::uuid
)
AND status = 'active'

UNION ALL

SELECT 
  'Planes nutricionales' as tipo,
  COUNT(*) as cantidad
FROM meal_plans
WHERE user_id IN (
  'a1b2c3d4-e5f6-4789-a012-345678901234'::uuid,
  'b2c3d4e5-f6a7-4890-b123-456789012345'::uuid
)
AND status = 'active';

-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================
-- 
-- Para probar el cambio:
-- 1. Inicia sesión con: cliente1@zonaazul.com (tiene 1 comida/día)
-- 2. Ve a /suscriptor/plan
-- 3. Deberías ver botones "Almuerzo" y "Cena" para cada día
-- 4. Puedes alternar entre ellos para ver diferentes comidas
-- 
-- Para comparar:
-- 1. Inicia sesión con: cliente2@zonaazul.com (tiene 2 comidas/día)
-- 2. Ve a /suscriptor/plan
-- 3. Deberías ver AMBAS comidas (almuerzo y cena) sin botones de selección
-- 
-- NOTA: Las contraseñas para ambos usuarios son "password123"
-- Los hashes fueron generados con bcrypt usando: node scripts/generate-password-hash.js password123
-- En producción, deberías usar contraseñas más seguras y únicas para cada usuario.

