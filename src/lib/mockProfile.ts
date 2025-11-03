export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  subscriptionStatus: 'active' | 'inactive' | 'expired'
  subscriptionEndDate?: string
  goals: {
    weight?: number
    calories?: number
    water?: number
  }
}

export const mockProfile: UserProfile = {
  id: 'user-1',
  name: 'Juan Pérez',
  email: 'juan.perez@example.com',
  phone: '+34 612 345 678',
  subscriptionStatus: 'active',
  subscriptionEndDate: '2025-12-31',
  goals: {
    weight: 75,
    calories: 2000,
    water: 2000,
  },
}

