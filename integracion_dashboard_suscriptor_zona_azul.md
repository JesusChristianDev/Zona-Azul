# Integración del Dashboard del Suscriptor en Zona-Azul

## Objetivo
Integrar el Dashboard del Suscriptor dentro del flujo de la aplicación Zona-Azul, manteniendo compatibilidad con TypeScript y TailwindCSS, con roles separados: Invitado, Suscriptor y Admin/Nutricionista.

---

## Estructura recomendada de carpetas

```
src/
├── components/
│   ├── dashboard/
│   │   ├── DashboardSuscriptor.tsx
│   │   ├── DashboardInvitado.tsx
│   │   └── DashboardAdmin.tsx
│   └── ui/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── SummaryCard.tsx
├── pages/
│   ├── Invitado.tsx
│   ├── Suscriptor.tsx
│   └── Admin.tsx
├── data/
│   ├── mockProfile.ts
│   ├── mockPlan.ts
│   └── mockProgress.ts
├── App.tsx
└── main.tsx
```

---

## Integración del Dashboard del Suscriptor
1. Crear el archivo: `src/components/dashboard/DashboardSuscriptor.tsx`
2. Pegar el código del dashboard adaptado a TypeScript.
3. Asegurarse que TailwindCSS y Recharts están instalados.

---

## Rutas y control de acceso

Instalar React Router:
```bash
npm install react-router-dom
```

Configurar rutas en `App.tsx`:
```tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import DashboardSuscriptor from "./components/dashboard/DashboardSuscriptor"
import Invitado from "./pages/Invitado"
import Admin from "./pages/Admin"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Invitado />} />
        <Route path="/suscriptor" element={<DashboardSuscriptor />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  )
}

export default App
```

Rutas definidas:
- `/` → Invitado
- `/suscriptor` → Dashboard del Suscriptor
- `/admin` → Panel Admin/Nutricionista

---

## Simulación de roles (temporal)
Archivo: `src/hooks/useAuth.ts`
```ts
import { useState } from "react"

export function useAuth() {
  const [role, setRole] = useState<"invitado" | "suscriptor" | "admin">("invitado")

  const loginAs = (r: "invitado" | "suscriptor" | "admin") => setRole(r)

  return { role, loginAs }
}
```
Permite mostrar contenido según el rol hasta que el backend real esté disponible.

---

## Preparación para backend futuro
Endpoints a implementar:
- `/api/profile`
- `/api/plan`
- `/api/progress`
- `/api/messages`

Las funciones mock actuales pueden reemplazarse directamente por llamadas a estas APIs.

---

## Subida a GitHub
```bash
git add .
git commit -m "Integración Dashboard Suscriptor + estructura global Zona Azul"
git push origin main
```

---

Este documento se puede dar directamente al agente Cursor para que configure la integración del dashboard en el proyecto actual.

