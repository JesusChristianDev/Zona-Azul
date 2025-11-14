-- ============================================
-- MIGRACIÓN: Actualizar must_change_password para usuarios existentes
-- ============================================
-- Este script actualiza los usuarios existentes (creados antes de implementar
-- la funcionalidad de cambio obligatorio de contraseña) para que no tengan
-- que cambiar su contraseña.
--
-- IMPORTANTE: Solo los nuevos usuarios suscriptores creados después de esta
-- migración tendrán must_change_password = true por defecto.
-- ============================================

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

