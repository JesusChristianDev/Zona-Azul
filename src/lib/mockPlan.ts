export interface MealPlanDay {
  day: string
  totalCalories: number
  meals: Array<{
    name: string
    calories: number
    description: string
  }>
}

export interface MealPlan {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  meals: Meal[]
  totalCalories: number
  createdBy: string
  days: MealPlanDay[]
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
  days: [
    {
      day: 'Lunes',
      totalCalories: 1980,
      meals: [
        {
          name: 'Avena con frutas',
          calories: 350,
          description: 'Avena integral con plátano, frutos rojos y miel orgánica.',
        },
        {
          name: 'Pollo al horno con quinoa',
          calories: 620,
          description: 'Pechuga marinada con hierbas, quinoa tricolor y vegetales al vapor.',
        },
        {
          name: 'Snack: Mix energía',
          calories: 210,
          description: 'Nueces activadas, almendras y chips de coco sin azúcar.',
        },
        {
          name: 'Salmón con verduras',
          calories: 480,
          description: 'Filete de salmón al horno con espárragos y brócoli al vapor.',
        },
      ],
    },
    {
      day: 'Martes',
      totalCalories: 2020,
      meals: [
        {
          name: 'Smoothie Verde Vital',
          calories: 280,
          description: 'Espinaca, piña, pepino y proteína vegetal.',
        },
        {
          name: 'Wrap proteico',
          calories: 540,
          description: 'Tortilla integral con falafel, hummus y vegetales frescos.',
        },
        {
          name: 'Snack: Yogurt con semillas',
          calories: 190,
          description: 'Yogurt griego con chía, linaza y un toque de miel.',
        },
        {
          name: 'Bowl Vitalidad',
          calories: 520,
          description: 'Base de quinoa, garbanzos especiados, aguacate y salsa tahini.',
        },
      ],
    },
    {
      day: 'Miércoles',
      totalCalories: 1950,
      meals: [
        {
          name: 'Tostadas de aguacate',
          calories: 320,
          description: 'Pan multigrano, aguacate, semillas de girasol y limón.',
        },
        {
          name: 'Poke integral',
          calories: 580,
          description: 'Arroz integral, atún fresco, mango y edamame con soya ligera.',
        },
        {
          name: 'Snack: Smoothie Azul',
          calories: 210,
          description: 'Blueberries, plátano, leche de almendra y espirulina.',
        },
        {
          name: 'Crema de coliflor',
          calories: 420,
          description: 'Coliflor rostizada, cúrcuma y crocante de garbanzo.',
        },
      ],
    },
    {
      day: 'Jueves',
      totalCalories: 2075,
      meals: [
        {
          name: 'Overnight oats chai',
          calories: 340,
          description: 'Avena reposada con especias chai, pera y nueces.',
        },
        {
          name: 'Ensalada Omega',
          calories: 510,
          description: 'Mix de hojas, salmón ahumado, nueces y vinagreta cítrica.',
        },
        {
          name: 'Snack: Fruta + proteína',
          calories: 185,
          description: 'Manzana verde con crema de cacahuate natural.',
        },
        {
          name: 'Tacos de lechuga',
          calories: 480,
          description: 'Relleno de pavo especiado, pico de gallo y crema de aguacate.',
        },
      ],
    },
    {
      day: 'Viernes',
      totalCalories: 2005,
      meals: [
        {
          name: 'Panqueques de avena',
          calories: 360,
          description: 'Panqueques integrales con frutos rojos y sirope de agave.',
        },
        {
          name: 'Bowl mediterráneo',
          calories: 560,
          description: 'Couscous, falafel horneado, aceitunas kalamata y tzatziki.',
        },
        {
          name: 'Snack: Golden latte',
          calories: 150,
          description: 'Leche de coco con cúrcuma, jengibre y pimienta negra.',
        },
        {
          name: 'Pescado blanco con puré de coliflor',
          calories: 440,
          description: 'Filete a la plancha con puré sedoso de coliflor y espinacas salteadas.',
        },
      ],
    },
  ],
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

