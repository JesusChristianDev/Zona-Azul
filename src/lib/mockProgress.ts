export interface ProgressEntry {
  date: string
  weight?: number
  calories: number
  water: number
  protein: number
  carbs: number
  fats: number
}

export interface ProgressStats {
  weeklyData: ProgressEntry[]
  monthlyData: ProgressEntry[]
  averageCalories: number
  averageWater: number
  weightChange: number
  goalProgress: {
    calories: number // percentage
    water: number // percentage
    weight?: number // percentage
  }
}

export const mockProgress: ProgressStats = {
  weeklyData: [
    {
      date: '2025-01-20',
      weight: 76.5,
      calories: 1950,
      water: 1800,
      protein: 120,
      carbs: 220,
      fats: 65,
    },
    {
      date: '2025-01-21',
      weight: 76.3,
      calories: 2050,
      water: 2000,
      protein: 135,
      carbs: 240,
      fats: 70,
    },
    {
      date: '2025-01-22',
      weight: 76.1,
      calories: 1980,
      water: 1900,
      protein: 125,
      carbs: 225,
      fats: 68,
    },
    {
      date: '2025-01-23',
      calories: 2100,
      water: 2100,
      protein: 140,
      carbs: 250,
      fats: 72,
    },
    {
      date: '2025-01-24',
      calories: 1920,
      water: 1850,
      protein: 118,
      carbs: 215,
      fats: 63,
    },
    {
      date: '2025-01-25',
      calories: 2030,
      water: 2050,
      protein: 130,
      carbs: 235,
      fats: 69,
    },
    {
      date: '2025-01-26',
      calories: 1990,
      water: 1950,
      protein: 128,
      carbs: 228,
      fats: 67,
    },
  ],
  monthlyData: [],
  averageCalories: 2003,
  averageWater: 1950,
  weightChange: -0.4,
  goalProgress: {
    calories: 100, // 2003 / 2000 * 100
    water: 97.5, // 1950 / 2000 * 100
    weight: 98.1, // (75 / 76.5) * 100
  },
}

