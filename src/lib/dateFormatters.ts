/**
 * Formatea la fecha y hora de una cita de manera profesional y consistente
 * @param slot - String con la fecha/hora de la cita (formato: "lunes, 15 de enero a las 10:00")
 * @param dateTime - ISO string opcional para formatear desde fecha
 * @returns String formateado profesionalmente
 */
export function formatAppointmentDateTime(slot?: string, dateTime?: string): string {
  // Si tenemos dateTime, usarlo para formatear
  if (dateTime) {
    try {
      const date = new Date(dateTime)
      if (!isNaN(date.getTime())) {
        const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' })
        const day = date.getDate()
        const month = date.toLocaleDateString('es-ES', { month: 'long' })
        const year = date.getFullYear()
        const time = date.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })
        
        // Capitalizar primera letra del día y mes
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
        
        return `${capitalizedWeekday}, ${day} de ${capitalizedMonth} de ${year} a las ${time}`
      }
    } catch (error) {
      console.error('Error formatting dateTime:', error)
    }
  }
  
  // Si tenemos slot, intentar mejorarlo si es necesario
  if (slot) {
    // Si ya está bien formateado, capitalizar primera letra
    if (slot.includes(' a las ')) {
      return slot.charAt(0).toUpperCase() + slot.slice(1)
    }
    
    // Si es una fecha ISO o similar, intentar parsearla
    try {
      const date = new Date(slot)
      if (!isNaN(date.getTime())) {
        const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' })
        const day = date.getDate()
        const month = date.toLocaleDateString('es-ES', { month: 'long' })
        const year = date.getFullYear()
        const time = date.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })
        
        const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
        
        return `${capitalizedWeekday}, ${day} de ${capitalizedMonth} de ${year} a las ${time}`
      }
    } catch (error) {
      // Si no se puede parsear, devolver el slot original capitalizado
      return slot.charAt(0).toUpperCase() + slot.slice(1)
    }
    
    return slot.charAt(0).toUpperCase() + slot.slice(1)
  }
  
  return 'Fecha no disponible'
}

/**
 * Formatea una fecha de creación de manera profesional
 * @param createdAt - ISO string de la fecha de creación
 * @returns String formateado
 */
export function formatCreatedDate(createdAt?: string): string {
  if (!createdAt) return 'Fecha no disponible'
  
  try {
    const date = new Date(createdAt)
    if (isNaN(date.getTime())) return 'Fecha no disponible'
    
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/^\w/, (c) => c.toUpperCase())
  } catch (error) {
    console.error('Error formatting created date:', error)
    return 'Fecha no disponible'
  }
}

