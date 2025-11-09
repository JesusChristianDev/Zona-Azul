// Usuarios mock para autenticación
// En producción, esto vendría de una base de datos

export interface User {
  id: string
  email: string
  password: string // En producción, esto sería un hash
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
  name: string
  createdAt: string
}

export const mockUsers: User[] = [
  {
    id: 'admin-1',
    email: 'admin@zonaazul.com',
    password: 'admin123', // En producción: hash bcrypt
    role: 'admin',
    name: 'Administrador Zona Azul',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'suscriptor-1',
    email: 'cliente@zonaazul.com',
    password: 'cliente123',
    role: 'suscriptor',
    name: 'Gregorio',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'nutricionista-1',
    email: 'nutricionista@zonaazul.com',
    password: 'nutri123',
    role: 'nutricionista',
    name: 'Dra. María García',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'repartidor-1',
    email: 'repartidor@zonaazul.com',
    password: 'repartidor123',
    role: 'repartidor',
    name: 'Carlos Repartidor',
    createdAt: '2025-01-01T00:00:00Z',
  },
  // Usuarios adicionales para testing
  {
    id: 'suscriptor-2',
    email: 'test@zonaazul.com',
    password: 'test123',
    role: 'suscriptor',
    name: 'Paco',
    createdAt: '2025-01-01T00:00:00Z',
  },
]

// Función helper para obtener todos los usuarios (mock + localStorage)
export function getAllUsers(): User[] {
  // En el servidor, solo retornar mockUsers
  if (typeof window === 'undefined') {
    return mockUsers
  }

  // En el cliente, combinar mockUsers con usuarios de localStorage
  try {
    const stored = localStorage.getItem('zona_azul_users')
    if (stored) {
      const storedUsers: User[] = JSON.parse(stored)
      // Combinar usuarios, evitando duplicados por ID
      const usersMap = new Map<string, User>()
      
      // Primero agregar mockUsers
      mockUsers.forEach((u) => usersMap.set(u.id, u))
      
      // Luego agregar usuarios de localStorage (tienen prioridad si hay duplicados)
      storedUsers.forEach((u) => {
        // Solo incluir si tiene los campos necesarios para login
        if (u.email && u.password && u.role) {
          usersMap.set(u.id, u)
        }
      })
      
      return Array.from(usersMap.values())
    }
  } catch (error) {
    console.error('Error loading users from localStorage:', error)
  }
  
  return mockUsers
}

// Función helper para validar credenciales
export function validateCredentials(email: string, password: string): User | null {
  const allUsers = getAllUsers()
  const user = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) return null
  if (user.password !== password) return null
  return user
}

