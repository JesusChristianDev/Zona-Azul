-- ============================================
-- DATOS DE EJEMPLO PARA ZONA AZUL
-- Ejecutar después de schema_completo.sql
-- ============================================

-- Limpiar datos existentes (opcional, comentar si no quieres borrar datos)
-- TRUNCATE TABLE payment_history CASCADE;
-- TRUNCATE TABLE subscription_contracts CASCADE;
-- TRUNCATE TABLE subscriptions CASCADE;
-- TRUNCATE TABLE subscription_group_members CASCADE;
-- TRUNCATE TABLE subscription_groups CASCADE;
-- TRUNCATE TABLE messages CASCADE;
-- TRUNCATE TABLE appointments CASCADE;
-- TRUNCATE TABLE order_items CASCADE;
-- TRUNCATE TABLE orders CASCADE;
-- TRUNCATE TABLE progress CASCADE;
-- TRUNCATE TABLE meal_plan_day_meals CASCADE;
-- TRUNCATE TABLE meal_plan_days CASCADE;
-- TRUNCATE TABLE meal_plans CASCADE;
-- TRUNCATE TABLE profiles CASCADE;
-- TRUNCATE TABLE users CASCADE;

-- ============================================
-- 1. USUARIOS
-- ============================================

-- Admin
INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES
    ('00000000-0000-0000-0000-000000000001', 'javier.rodriguez@zonaazul.com', 'Javier Rodríguez', 'admin', '$2a$10$placeholder', NOW())
ON CONFLICT (id) DO NOTHING;

-- Nutricionistas
INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES
    ('00000000-0000-0000-0000-000000000010', 'maria.gonzalez.nutri@zonaazul.com', 'María González', 'nutricionista', '$2a$10$placeholder', NOW()),
    ('00000000-0000-0000-0000-000000000011', 'carlos.martinez.nutri@zonaazul.com', 'Carlos Martínez', 'nutricionista', '$2a$10$placeholder', NOW())
ON CONFLICT (id) DO NOTHING;

-- Suscriptores
INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES
    ('00000000-0000-0000-0000-000000000020', 'ana.garcia.martinez@gmail.com', 'Ana García Martínez', 'suscriptor', '$2a$10$placeholder', NOW()),
    ('00000000-0000-0000-0000-000000000021', 'juan.perez.fernandez@hotmail.com', 'Juan Pérez Fernández', 'suscriptor', '$2a$10$placeholder', NOW()),
    ('00000000-0000-0000-0000-000000000022', 'laura.sanchez.lopez@yahoo.es', 'Laura Sánchez López', 'suscriptor', '$2a$10$placeholder', NOW()),
    ('00000000-0000-0000-0000-000000000023', 'pedro.lopez.garcia@outlook.com', 'Pedro López García', 'suscriptor', '$2a$10$placeholder', NOW())
ON CONFLICT (id) DO NOTHING;

-- Repartidores
INSERT INTO users (id, email, name, role, password_hash, created_at) VALUES
    ('00000000-0000-0000-0000-000000000030', 'roberto.fernandez.delivery@zonaazul.com', 'Roberto Fernández', 'repartidor', '$2a$10$placeholder', NOW()),
    ('00000000-0000-0000-0000-000000000031', 'sofia.ramirez.delivery@zonaazul.com', 'Sofía Ramírez', 'repartidor', '$2a$10$placeholder', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. PERFILES
-- ============================================

INSERT INTO profiles (user_id, address, delivery_instructions, created_at, updated_at) VALUES
    -- Admin
    ('00000000-0000-0000-0000-000000000001', 'Calle Principal 1, Madrid', NULL, NOW(), NOW()),
    
    -- Nutricionistas
    ('00000000-0000-0000-0000-000000000010', 'Calle Nutrición 10, Madrid', NULL, NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000011', 'Avenida Salud 11, Barcelona', NULL, NOW(), NOW()),
    
    -- Suscriptores
    ('00000000-0000-0000-0000-000000000020', 'Calle Usuario 20, Madrid', 'Dejar en el buzón', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000021', 'Calle Usuario 21, Valencia', NULL, NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000022', 'Calle Usuario 22, Sevilla', NULL, NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000023', 'Calle Usuario 23, Bilbao', NULL, NOW(), NOW()),
    
    -- Repartidores
    ('00000000-0000-0000-0000-000000000030', 'Calle Reparto 30, Madrid', NULL, NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000031', 'Calle Reparto 31, Barcelona', NULL, NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. COMIDAS (Menú del local - is_menu_item = true)
-- ============================================

INSERT INTO meals (id, name, description, type, calories, protein, carbs, fats, ingredients, instructions, image_url, price, available, is_menu_item, created_at, updated_at) VALUES
    -- Desayunos del menú
    ('10000000-0000-0000-0000-000000000001', 'Tostadas Integrales con Aguacate', 'Pan integral tostado con aguacate, tomate y aceite de oliva', 'breakfast', 350, 12, 45, 18, ARRAY['Pan integral', 'Aguacate', 'Tomate', 'Aceite de oliva', 'Sal', 'Pimienta'], 'Tostar el pan, machacar el aguacate y servir con tomate en rodajas.', NULL, 8.50, true, true, NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000002', 'Bowl de Avena y Frutas', 'Avena con frutas frescas, frutos secos y miel', 'breakfast', 420, 15, 65, 12, ARRAY['Avena', 'Plátano', 'Fresas', 'Nueces', 'Miel'], 'Cocer la avena, añadir frutas y frutos secos, endulzar con miel.', NULL, 9.00, true, true, NOW(), NOW()),
    
    -- Comidas del menú
    ('10000000-0000-0000-0000-000000000010', 'Ensalada Mediterránea', 'Ensalada con tomate, pepino, queso feta, aceitunas y vinagreta', 'lunch', 380, 18, 25, 28, ARRAY['Lechuga', 'Tomate', 'Pepino', 'Queso feta', 'Aceitunas', 'Aceite de oliva'], 'Cortar las verduras, añadir queso y aceitunas, aliñar.', NULL, 12.50, true, true, NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000011', 'Pollo a la Plancha con Verduras', 'Pechuga de pollo con verduras al vapor y arroz integral', 'lunch', 450, 42, 35, 12, ARRAY['Pollo', 'Brócoli', 'Zanahoria', 'Arroz integral', 'Aceite de oliva'], 'Cocinar el pollo a la plancha, hervir las verduras y el arroz.', NULL, 14.00, true, true, NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000012', 'Salmón con Patatas', 'Salmón al horno con patatas asadas y ensalada', 'lunch', 520, 38, 40, 22, ARRAY['Salmón', 'Patatas', 'Ensalada', 'Limón', 'Aceite de oliva'], 'Hornear el salmón y las patatas, servir con ensalada.', NULL, 16.50, true, true, NOW(), NOW()),
    
    -- Cenas del menú
    ('10000000-0000-0000-0000-000000000020', 'Crema de Verduras', 'Crema de calabacín y zanahoria con pan integral', 'dinner', 280, 8, 35, 12, ARRAY['Calabacín', 'Zanahoria', 'Cebolla', 'Caldo vegetal', 'Nata', 'Pan integral'], 'Cocer las verduras, triturar y servir con pan.', NULL, 10.00, true, true, NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000021', 'Tortilla de Verduras', 'Tortilla con espinacas, champiñones y queso', 'dinner', 320, 20, 15, 22, ARRAY['Huevos', 'Espinacas', 'Champiñones', 'Queso', 'Aceite de oliva'], 'Saltear las verduras, añadir huevos y cocinar la tortilla.', NULL, 11.50, true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. COMIDAS (Para planes nutricionales - is_menu_item = false)
-- ============================================

INSERT INTO meals (id, name, description, type, calories, protein, carbs, fats, ingredients, instructions, image_url, price, available, is_menu_item, created_at, updated_at) VALUES
    -- Desayunos para planes
    ('20000000-0000-0000-0000-000000000001', 'Batido Proteico Verde', 'Batido con espinacas, plátano, proteína y leche de almendras', 'breakfast', 280, 25, 30, 8, ARRAY['Espinacas', 'Plátano', 'Proteína en polvo', 'Leche de almendras'], 'Mezclar todos los ingredientes en licuadora.', NULL, NULL, true, false, NOW(), NOW()),
    ('20000000-0000-0000-0000-000000000002', 'Yogur con Granola y Frutos Rojos', 'Yogur griego con granola casera y frutos rojos', 'breakfast', 320, 20, 40, 10, ARRAY['Yogur griego', 'Granola', 'Arándanos', 'Fresas'], 'Servir el yogur, añadir granola y frutos rojos.', NULL, NULL, true, false, NOW(), NOW()),
    
    -- Comidas para planes
    ('20000000-0000-0000-0000-000000000010', 'Pescado Blanco con Quinoa', 'Merluza al vapor con quinoa y verduras al vapor', 'lunch', 380, 35, 45, 10, ARRAY['Merluza', 'Quinoa', 'Calabacín', 'Brócoli', 'Aceite de oliva'], 'Cocinar el pescado al vapor, hervir la quinoa y las verduras.', NULL, NULL, true, false, NOW(), NOW()),
    ('20000000-0000-0000-0000-000000000011', 'Pavo con Boniato', 'Pechuga de pavo con boniato asado y ensalada', 'lunch', 400, 38, 42, 8, ARRAY['Pavo', 'Boniato', 'Lechuga', 'Tomate', 'Aceite de oliva'], 'Asar el pavo y el boniato, servir con ensalada.', NULL, NULL, true, false, NOW(), NOW()),
    ('20000000-0000-0000-0000-000000000012', 'Lentejas con Verduras', 'Lentejas estofadas con verduras y arroz integral', 'lunch', 420, 22, 60, 8, ARRAY['Lentejas', 'Cebolla', 'Zanahoria', 'Pimiento', 'Arroz integral'], 'Cocer las lentejas con verduras, servir con arroz.', NULL, NULL, true, false, NOW(), NOW()),
    
    -- Cenas para planes
    ('20000000-0000-0000-0000-000000000020', 'Ensalada de Garbanzos', 'Ensalada de garbanzos con verduras y vinagreta de limón', 'dinner', 300, 15, 40, 10, ARRAY['Garbanzos', 'Pepino', 'Tomate', 'Cebolla', 'Limón', 'Aceite de oliva'], 'Mezclar los garbanzos con las verduras y aliñar.', NULL, NULL, true, false, NOW(), NOW()),
    ('20000000-0000-0000-0000-000000000021', 'Tofu Salteado con Verduras', 'Tofu salteado con brócoli, zanahoria y arroz integral', 'dinner', 320, 20, 35, 12, ARRAY['Tofu', 'Brócoli', 'Zanahoria', 'Arroz integral', 'Salsa de soja'], 'Saltear el tofu y las verduras, servir con arroz.', NULL, NULL, true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. SUSCRIPCIONES
-- ============================================

-- Obtener IDs de planes (asumiendo que ya existen)
DO $$
DECLARE
    plan_mensual_id UUID;
    plan_trimestral_id UUID;
    plan_anual_id UUID;
BEGIN
    SELECT id INTO plan_mensual_id FROM subscription_plans WHERE name = 'Mensual' LIMIT 1;
    SELECT id INTO plan_trimestral_id FROM subscription_plans WHERE name = 'Trimestral' LIMIT 1;
    SELECT id INTO plan_anual_id FROM subscription_plans WHERE name = 'Anual' LIMIT 1;

    -- Suscripción activa para Ana
    IF plan_mensual_id IS NOT NULL THEN
        INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, end_date, price, discount_applied, meals_per_day, admin_approved, nutricionista_approved, requires_consultation, consultation_completed, created_at, updated_at)
        VALUES (
            '30000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000020',
            plan_mensual_id,
            'active',
            CURRENT_DATE - INTERVAL '10 days',
            CURRENT_DATE + INTERVAL '20 days',
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
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Suscripción activa para Juan (2 comidas)
    IF plan_trimestral_id IS NOT NULL THEN
        INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, end_date, price, discount_applied, meals_per_day, admin_approved, nutricionista_approved, requires_consultation, consultation_completed, created_at, updated_at)
        VALUES (
            '30000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000021',
            plan_trimestral_id,
            'active',
            CURRENT_DATE - INTERVAL '30 days',
            CURRENT_DATE + INTERVAL '60 days',
            825.00,
            0,
            2,
            true,
            true,
            true,
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Suscripción pendiente para Laura
    IF plan_mensual_id IS NOT NULL THEN
        INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, end_date, price, discount_applied, meals_per_day, admin_approved, nutricionista_approved, requires_consultation, consultation_completed, created_at, updated_at)
        VALUES (
            '30000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000022',
            plan_mensual_id,
            'pending_approval',
            NULL,
            NULL,
            150.00,
            0,
            1,
            false,
            false,
            true,
            false,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- ============================================
-- 6. PLANES NUTRICIONALES
-- Solo para usuarios con suscripciones activas
-- ============================================

-- Plan para Ana (tiene suscripción activa)
INSERT INTO meal_plans (id, user_id, nutricionista_id, name, start_date, end_date, status, created_at, updated_at) VALUES
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'Plan Personalizado Ana', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Plan para Juan (tiene suscripción activa)
INSERT INTO meal_plans (id, user_id, nutricionista_id, name, start_date, end_date, status, created_at, updated_at) VALUES
    ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', 'Plan Personalizado Juan', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- NOTA: Laura y Pedro NO tienen planes porque no tienen suscripciones activas

-- Días del plan para Ana (Lunes a Viernes)
INSERT INTO meal_plan_days (id, meal_plan_id, day_name, day_number, created_at) VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Lunes', 1, NOW()),
    ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Martes', 2, NOW()),
    ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'Miércoles', 3, NOW()),
    ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'Jueves', 4, NOW()),
    ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'Viernes', 5, NOW())
ON CONFLICT (id) DO NOTHING;

-- Comidas asignadas a los días
-- Usamos subconsultas para obtener nombre, descripción y calorías de las comidas
INSERT INTO meal_plan_day_meals (id, meal_plan_day_id, meal_id, meal_name, meal_description, calories, order_index, created_at) 
SELECT 
    v.id_val::uuid,
    v.day_id::uuid,
    v.meal_id_val::uuid,
    m.name,
    m.description,
    m.calories,
    v.order_val,
    NOW()
FROM (VALUES
    ('60000000-0000-0000-0000-000000000001'::text, '50000000-0000-0000-0000-000000000001'::text, '20000000-0000-0000-0000-000000000001'::text, 1),
    ('60000000-0000-0000-0000-000000000002'::text, '50000000-0000-0000-0000-000000000001'::text, '20000000-0000-0000-0000-000000000010'::text, 2),
    ('60000000-0000-0000-0000-000000000003'::text, '50000000-0000-0000-0000-000000000002'::text, '20000000-0000-0000-0000-000000000002'::text, 1),
    ('60000000-0000-0000-0000-000000000004'::text, '50000000-0000-0000-0000-000000000002'::text, '20000000-0000-0000-0000-000000000011'::text, 2),
    ('60000000-0000-0000-0000-000000000005'::text, '50000000-0000-0000-0000-000000000003'::text, '20000000-0000-0000-0000-000000000001'::text, 1),
    ('60000000-0000-0000-0000-000000000006'::text, '50000000-0000-0000-0000-000000000003'::text, '20000000-0000-0000-0000-000000000012'::text, 2)
) AS v(id_val, day_id, meal_id_val, order_val)
JOIN meals m ON m.id = v.meal_id_val::uuid
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. PEDIDOS
-- ============================================

INSERT INTO orders (id, user_id, repartidor_id, status, delivery_address, delivery_instructions, total_amount, estimated_delivery_time, actual_delivery_time, created_at, updated_at) VALUES
    ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000030', 'entregado', 'Calle Usuario 20, Madrid, 28003', 'Dejar en el buzón', 12.50, (CURRENT_DATE - INTERVAL '2 days')::timestamp + TIME '13:00:00', (CURRENT_DATE - INTERVAL '2 days')::timestamp + TIME '13:30:00', NOW(), NOW()),
    ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000031', 'en_camino', 'Calle Usuario 21, Valencia, 46001', NULL, 14.00, (CURRENT_DATE - INTERVAL '1 day')::timestamp + TIME '13:30:00', NULL, NOW(), NOW()),
    ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000020', NULL, 'pendiente', NULL, 'Recoger en Tienda Principal', 16.50, (CURRENT_DATE + INTERVAL '1 day')::timestamp + TIME '14:00:00', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Items de pedidos
INSERT INTO order_items (id, order_id, meal_id, quantity, price, created_at) VALUES
    ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000010', 1, 12.50, NOW()),
    ('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000011', 1, 14.00, NOW()),
    ('80000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000012', 1, 16.50, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. CITAS
-- ============================================

INSERT INTO appointments (id, user_id, nutricionista_id, date_time, status, notes, created_at, updated_at) VALUES
    ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', (CURRENT_DATE + INTERVAL '5 days')::timestamp + TIME '10:00:00', 'confirmada', 'Consulta inicial para plan nutricional', NOW(), NOW()),
    ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', (CURRENT_DATE + INTERVAL '7 days')::timestamp + TIME '11:00:00', 'confirmada', 'Seguimiento mensual', NOW(), NOW()),
    ('90000000-0000-0000-0000-000000000003', NULL, '00000000-0000-0000-0000-000000000010', (CURRENT_DATE + INTERVAL '10 days')::timestamp + TIME '15:00:00', 'pendiente', 'Consulta de nuevo cliente - Datos: Nombre: Test, Email: test@example.com, Teléfono: +34 600 000 999', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 9. MENSAJES
-- ============================================

INSERT INTO messages (id, from_user_id, to_user_id, subject, message, read, created_at, updated_at) VALUES
    ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'Consulta sobre plan', 'Hola, tengo una pregunta sobre mi plan nutricional', false, NOW() - INTERVAL '2 days', NOW()),
    ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', 'Re: Consulta sobre plan', 'Claro, ¿en qué puedo ayudarte?', true, NOW() - INTERVAL '1 day', NOW()),
    ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', 'Modificación de menú', 'Me gustaría cambiar algunas comidas de mi plan', false, NOW() - INTERVAL '3 hours', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 10. PROGRESO
-- ============================================

INSERT INTO progress (id, user_id, date, weight, calories, water, protein, carbs, fats, mood, sleep_hours, steps, notes, created_at, updated_at) VALUES
    ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', CURRENT_DATE - INTERVAL '2 days', 65.2, 1800, 2000, 120, 200, 60, 'good', 7.5, 8500, 'Todo bien', NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000020', CURRENT_DATE - INTERVAL '1 day', 65.0, 1750, 2200, 115, 190, 58, 'excellent', 8.0, 9200, 'Muy bien', NOW(), NOW()),
    ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000021', CURRENT_DATE - INTERVAL '1 day', 78.5, 2200, 2500, 150, 250, 75, 'good', 7.0, 10000, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FIN DE DATOS DE EJEMPLO
-- ============================================

