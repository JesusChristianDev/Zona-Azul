import { mockMealPlan } from '../../../lib/mockPlan'

export default function SuscriptorPlanPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Plan semanal personalizado</h2>
        <p className="mt-2 text-sm text-gray-600">
          Este es el plan con el que trabajaremos esta semana. Ajusta horarios, registra comentarios y mantente
          hidratado para potenciar tu Zona Azul personal.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {mockMealPlan.days.map((day) => (
          <article key={day.day} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">{day.day}</h3>
            <p className="mt-1 text-sm text-primary font-medium">
              Objetivo calórico: {day.totalCalories.toLocaleString()} kcal
            </p>
            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              {day.meals.map((meal) => (
                <li key={meal.name} className="rounded-xl bg-slate-50 p-3 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{meal.name}</span>
                    <span className="text-xs text-primary font-medium">{meal.calories} kcal</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{meal.description}</p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}

