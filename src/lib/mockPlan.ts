export interface MealPlan {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  meals: Meal[]
  totalCalories: number
  createdBy: string
}

export interface Meal {
  id: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein: number
  carbs: number
  fats: number
  ingredients: string[]
  instructions?: string
}

export const mockMealPlan: MealPlan = {
  id: 'plan-1',
  name: 'Plan Saludable Semanal',
  description: 'Plan balanceado de 7 días diseñado por nutricionista',
  startDate: '2025-01-20',
  endDate: '2025-01-27',
  createdBy: 'Dra. María García',
  totalCalories: 2000,
  meals: [
    {
      id: 'meal-1',
      name: 'Avena con frutas',
      type: 'breakfast',
      calories: 350,
      protein: 12,
      carbs: 55,
      fats: 8,
      ingredients: ['Avena', 'Plátano', 'Frutos rojos', 'Miel'],
    },
    {
      id: 'meal-2',
      name: 'Pollo al horno con quinoa',
      type: 'lunch',
      calories: 620,
      protein: 45,
      carbs: 55,
      fats: 18,
      ingredients: ['Pecho de pollo', 'Quinoa', 'Verduras al vapor'],
    },
    {
      id: 'meal-3',
      name: 'Salmón con verduras',
      type: 'dinner',
      calories: 480,
      protein: 38,
      carbs: 25,
      fats: 22,
      ingredients: ['Salmón', 'Espárragos', 'Brócoli', 'Aceite de oliva'],
    },
  ],
}

