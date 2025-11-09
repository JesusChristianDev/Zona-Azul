/**
 * Utilidades para almacenamiento personalizado por usuario
 */

/**
 * Genera una clave de localStorage personalizada para un usuario
 */
export function getUserStorageKey(baseKey: string, userId?: string): string {
  if (!userId) {
    // Si no hay userId, usar una clave compartida (para datos públicos)
    return baseKey
  }
  return `${baseKey}_user_${userId}`
}

/**
 * Obtiene el userId desde las cookies del cliente
 */
export function getUserIdFromCookies(): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; user_id=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

/**
 * Obtiene datos del localStorage personalizados por usuario
 */
export function getUserData<T>(baseKey: string, userId?: string, defaultValue?: T): T | null {
  const storageKey = getUserStorageKey(baseKey, userId)
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      return JSON.parse(stored) as T
    }
    return defaultValue || null
  } catch (error) {
    console.error(`Error loading ${baseKey}:`, error)
    return defaultValue || null
  }
}

/**
 * Guarda datos en localStorage personalizados por usuario
 */
export function setUserData<T>(baseKey: string, data: T, userId?: string): void {
  const storageKey = getUserStorageKey(baseKey, userId)
  try {
    localStorage.setItem(storageKey, JSON.stringify(data))
    // Notificar actualización
    window.dispatchEvent(new CustomEvent(`${baseKey}_updated`, { detail: { userId } }))
  } catch (error) {
    console.error(`Error saving ${baseKey}:`, error)
  }
}

/**
 * Elimina datos del localStorage personalizados por usuario
 */
export function removeUserData(baseKey: string, userId?: string): void {
  const storageKey = getUserStorageKey(baseKey, userId)
  try {
    localStorage.removeItem(storageKey)
  } catch (error) {
    console.error(`Error removing ${baseKey}:`, error)
  }
}

