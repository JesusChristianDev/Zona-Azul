"use client"

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'next/navigation'
import { usePanel } from '../../contexts/PanelContext'
import * as api from '../../lib/api'
import { useNotifications } from '../../hooks/useNotifications'

// Hook para detectar si es móvil
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640) // sm breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

interface UserSettings {
  notifications: {
    enabled: boolean
    newMessages: boolean
    orderUpdates: boolean
    planAssignments: boolean
    appointments: boolean
    newOrders: boolean
    weeklyMenu: boolean
    menuChangesApproved: boolean
    orderStatus: boolean
    renewalReminder: boolean
    planApproval: boolean
    consultationRequired: boolean
  }
  preferences: {
    language: string
    theme: 'light' | 'dark' | 'auto'
    emailNotifications: boolean
  }
  accessibility: {
    fontSize: 'small' | 'medium' | 'large' | 'xlarge'
    highContrast: boolean
    reduceAnimations: boolean
  }
}

const defaultSettings: UserSettings = {
  notifications: {
    enabled: true,
    newMessages: true,
    orderUpdates: true,
    planAssignments: true,
    appointments: true,
    newOrders: true,
    weeklyMenu: true,
    menuChangesApproved: true,
    orderStatus: true,
    renewalReminder: true,
    planApproval: true,
    consultationRequired: true,
  },
  preferences: {
    language: 'es',
    theme: 'light',
    emailNotifications: false,
  },
  accessibility: {
    fontSize: 'medium',
    highContrast: false,
    reduceAnimations: false,
  },
}

interface AjustesComponentProps {
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
}

// Componente para mostrar información de cuenta
function AccountInfoSection({
  userId,
  role,
  userName,
  userEmail
}: {
  userId: string | null
  role: 'admin' | 'suscriptor' | 'nutricionista' | 'repartidor'
  userName: string | null
  userEmail: string | null
}) {
  const [profile, setProfile] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!userId) return

    const loadAccountInfo = async () => {
      try {
        setLoading(true)

        // Cargar perfil
        try {
          const profileData = await api.getProfile()
          if (profileData) {
            setProfile(profileData)
          }
        } catch (error) {
          console.error('Error loading profile:', error)
        }

        // Cargar datos del usuario (para created_at y avatar_url)
        try {
          const userInfo = await api.getUserById(userId)
          if (userInfo) {
            setUserData(userInfo)
            if (userInfo.avatar_url) {
              setAvatarUrl(userInfo.avatar_url)
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error)
        }

        // Cargar suscripción (solo para suscriptores)
        if (role === 'suscriptor') {
          try {
            const subResponse = await fetch(`/api/subscriptions?user_id=${userId}`)
            if (subResponse.ok) {
              const subData = await subResponse.json()
              const activeSub = subData.find((sub: any) =>
                sub.status === 'active' || sub.status === 'pending_approval'
              )
              if (activeSub) {
                setSubscription(activeSub)
              }
            }
          } catch (error) {
            console.error('Error loading subscription:', error)
          }
        }
      } catch (error) {
        console.error('Error loading account info:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAccountInfo()
  }, [userId, role])

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona una imagen válida')
      return
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe ser menor a 2MB')
      return
    }

    try {
      setUploadingAvatar(true)

      // Convertir a base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string

        try {
          // Actualizar avatar en el servidor
          const response = await fetch('/api/users/avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              avatar_url: base64String,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            setAvatarUrl(data.avatar_url)
            // Actualizar userData también
            if (userData) {
              setUserData({ ...userData, avatar_url: data.avatar_url })
            }
          } else {
            const errorData = await response.json()
            alert(errorData.error || 'Error al actualizar la foto de perfil')
          }
        } catch (error) {
          console.error('Error uploading avatar:', error)
          alert('Error al subir la imagen')
        } finally {
          setUploadingAvatar(false)
        }
      }

      reader.onerror = () => {
        setUploadingAvatar(false)
        alert('Error al leer el archivo')
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error processing avatar:', error)
      setUploadingAvatar(false)
      alert('Error al procesar la imagen')
    }
  }

  const handleRemoveAvatar = async () => {
    if (!userId) return

    if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) {
      return
    }

    try {
      setUploadingAvatar(true)
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar_url: null,
        }),
      })

      if (response.ok) {
        setAvatarUrl(null)
        if (userData) {
          setUserData({ ...userData, avatar_url: null })
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Error al eliminar la foto de perfil')
      }
    } catch (error) {
      console.error('Error removing avatar:', error)
      alert('Error al eliminar la imagen')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    suscriptor: 'Suscriptor',
    nutricionista: 'Nutricionista',
    repartidor: 'Repartidor',
  }

  if (loading) {
    return (
      <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Información de cuenta</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Cargando...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Información de cuenta</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Datos personales y configuración de cuenta</p>
        </div>
      </div>

      {/* Foto de perfil */}
      <div className="mb-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-600">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto de perfil"
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center border-4 border-white dark:border-slate-700 shadow-lg">
                <span className="text-3xl font-bold text-white">
                  {userName?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Foto de perfil</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {avatarUrl ? 'Actualiza o elimina tu foto de perfil' : 'Añade una foto para personalizar tu cuenta'}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center sm:justify-start">
              <label className="cursor-pointer px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium inline-flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
              {avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre completo</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{userName || 'No disponible'}</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-all">{userEmail || 'No disponible'}</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Teléfono</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {profile?.phone || userData?.phone || (
              <span className="text-gray-400 dark:text-gray-500 italic">No proporcionado</span>
            )}
          </p>
        </div>

        {userData?.created_at && (
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cuenta creada</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {new Date(userData.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        )}

        {role === 'suscriptor' && subscription && (
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estado de suscripción</p>
            <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold ${subscription.status === 'active'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : subscription.status === 'pending_approval'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                : subscription.status === 'expired'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : 'bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-300'
              }`}>
              {subscription.status === 'active' && '✓ Activa'}
              {subscription.status === 'pending_approval' && '⏳ Pendiente'}
              {subscription.status === 'expired' && '✗ Expirada'}
              {subscription.status === 'cancelled' && '○ Cancelada'}
              {!['active', 'pending_approval', 'expired', 'cancelled'].includes(subscription.status) && subscription.status}
            </span>
          </div>
        )}

        {role === 'suscriptor' && subscription?.end_date && (
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Suscripción hasta</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {new Date(subscription.end_date).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        )}

        {role === 'suscriptor' && subscription?.meals_per_day && (
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Comidas por día</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {subscription.meals_per_day === 1 ? '1 comida (Almuerzo o Cena)' : `${subscription.meals_per_day} comidas (Almuerzo y Cena)`}
            </p>
          </div>
        )}

        {profile?.goals_calories && (
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Objetivo de calorías</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile.goals_calories} kcal/día</p>
          </div>
        )}

        {profile?.goals_water && (
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Objetivo de agua</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile.goals_water} ml/día</p>
          </div>
        )}

        {profile?.goals_weight && (
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Peso objetivo</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{profile.goals_weight} kg</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default function AjustesComponent({ role }: AjustesComponentProps) {
  const { userId, userName, userEmail, role: userRole, loading: authLoading } = useAuth()
  const router = useRouter() // Solo para navegación específica (ej: cambiar contraseña)
  const { isSupported, permission, requestPermission, isGranted } = useNotifications()
  const isMobile = useIsMobile()
  const { isSettingsOpen, setIsSettingsOpen, setIsNotificationsOpen, setIsMessagesOpen } = usePanel()
  const panelRef = useRef<HTMLDivElement>(null)
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [originalSettings, setOriginalSettings] = useState<UserSettings>(defaultSettings)
  const [loading, setLoading] = useState(false) // Iniciar como false para mostrar inmediatamente
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [themeInitialized, setThemeInitialized] = useState(false)

  // Cache para evitar cargar ajustes múltiples veces
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  // Cargar ajustes SOLO para mostrar en el panel (las preferencias ya se aplicaron en UserPreferencesLoader)
  // Esto es solo para poblar el formulario de ajustes
  useEffect(() => {
    // Solo cargar si tenemos userId, el rol coincide, no está cargando la autenticación, y NO se han cargado ya
    if (!authLoading && userId && (!userRole || userRole === role) && !settingsLoaded) {
      const loadSettings = async () => {
        try {
          const dbSettings = await api.getUserSettings()
          if (dbSettings) {
            const loadedSettings: UserSettings = {
              notifications: {
                enabled: dbSettings.notifications_enabled ?? true,
                newMessages: dbSettings.notifications_new_messages ?? true,
                orderUpdates: dbSettings.notifications_order_updates ?? true,
                planAssignments: dbSettings.notifications_plan_assignments ?? true,
                appointments: dbSettings.notifications_appointments ?? true,
                newOrders: dbSettings.notifications_new_orders ?? true,
                weeklyMenu: dbSettings.notifications_weekly_menu ?? true,
                menuChangesApproved: dbSettings.notifications_menu_changes_approved ?? true,
                orderStatus: dbSettings.notifications_order_status ?? true,
                renewalReminder: dbSettings.notifications_renewal_reminder ?? true,
                planApproval: dbSettings.notifications_plan_approval ?? true,
                consultationRequired: dbSettings.notifications_consultation_required ?? true,
              },
              preferences: {
                language: dbSettings.preferences_language || 'es',
                theme: (dbSettings.preferences_theme as 'light' | 'dark' | 'auto') || 'light',
                emailNotifications: dbSettings.preferences_email_notifications ?? false,
              },
              accessibility: {
                fontSize: (dbSettings.accessibility_font_size as 'small' | 'medium' | 'large' | 'xlarge') || 'medium',
                highContrast: dbSettings.accessibility_high_contrast ?? false,
                reduceAnimations: dbSettings.accessibility_reduce_animations ?? false,
              },
            }

            // Marcar como cargado ANTES de actualizar estado
            setSettingsLoaded(true)

            // Actualizar estado en batch para evitar múltiples re-renderizados
            setSettings(loadedSettings)
            setOriginalSettings(JSON.parse(JSON.stringify(loadedSettings))) // Deep copy

            // NO aplicar ajustes aquí - ya se aplicaron en UserPreferencesLoader
            // Solo marcar el tema como inicializado si existe
            if (loadedSettings.preferences.theme) {
              setThemeInitialized(true)
            }
          } else {
            // Si no hay ajustes en BD, marcar como cargado igualmente para evitar intentos futuros
            setSettingsLoaded(true)
          }
        } catch (error) {
          console.error('Error loading settings:', error)
          // Marcar como cargado incluso si hay error para evitar loops
          setSettingsLoaded(true)
        }
      }

      // Cargar en segundo plano
      loadSettings()
    }
  }, [userId, userRole, role, authLoading, settingsLoaded])

  // Aplicar tema SOLO cuando el usuario lo cambia explícitamente, NO al montar el componente
  // Esto evita que el tema cambie cuando se abre el panel de ajustes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!themeInitialized) return // No hacer nada si el tema no está inicializado

    // Solo aplicar el tema si el usuario lo cambió explícitamente (no al cargar desde BD)
    // El tema ya se aplicó cuando se cargaron los ajustes desde la BD
    applyTheme(settings.preferences.theme)

    // Si el tema es "auto", escuchar cambios en la preferencia del sistema
    if (settings.preferences.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        applyTheme('auto')
      }

      // Escuchar cambios
      mediaQuery.addEventListener('change', handleChange)

      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    }
  }, [settings.preferences.theme, themeInitialized])

  // Cerrar otros paneles cuando se abre ajustes (solo si se abre como panel)
  useEffect(() => {
    // Si estamos usando el panel (no navegación), cerrar otros paneles
    setIsNotificationsOpen(false)
    setIsMessagesOpen(false)
  }, [setIsNotificationsOpen, setIsMessagesOpen])

  // Prevenir salida del navegador si hay cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = 'Tienes cambios sin guardar. ¿Estás seguro de que deseas salir?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [settings, originalSettings])

  const handleSave = async () => {
    if (!userId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Si las notificaciones están habilitadas pero no tenemos permiso, solicitarlo
      if (settings.notifications.enabled && !isGranted && isSupported) {
        const granted = await requestPermission()
        if (!granted) {
          setError('Se requiere permiso de notificaciones para activar esta función')
          setSaving(false)
          return
        }
      }

      // Guardar ajustes en la base de datos
      await api.updateUserSettings({
        notifications_enabled: settings.notifications.enabled,
        notifications_new_messages: settings.notifications.newMessages,
        notifications_order_updates: settings.notifications.orderUpdates,
        notifications_plan_assignments: settings.notifications.planAssignments,
        notifications_appointments: settings.notifications.appointments,
        notifications_new_orders: settings.notifications.newOrders,
        notifications_weekly_menu: settings.notifications.weeklyMenu,
        notifications_menu_changes_approved: settings.notifications.menuChangesApproved,
        notifications_order_status: settings.notifications.orderStatus,
        notifications_renewal_reminder: settings.notifications.renewalReminder,
        notifications_plan_approval: settings.notifications.planApproval,
        notifications_consultation_required: settings.notifications.consultationRequired,
        preferences_language: settings.preferences.language,
        preferences_theme: settings.preferences.theme,
        preferences_email_notifications: settings.preferences.emailNotifications,
        accessibility_font_size: settings.accessibility.fontSize,
        accessibility_high_contrast: settings.accessibility.highContrast,
        accessibility_reduce_animations: settings.accessibility.reduceAnimations,
      })

      setSuccess('Ajustes guardados correctamente')
      setOriginalSettings(JSON.parse(JSON.stringify(settings))) // Actualizar originales
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Error al guardar los ajustes')
      setTimeout(() => setError(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  const updateNotificationSetting = (key: keyof UserSettings['notifications'], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }))
  }

  // Función para aplicar el tema
  const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // Auto: usar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  const updatePreference = (key: keyof UserSettings['preferences'], value: any) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        preferences: {
          ...prev.preferences,
          [key]: value,
        },
      }

      // Aplicar tema inmediatamente si cambió
      if (key === 'theme') {
        setThemeInitialized(true) // Marcar como inicializado cuando el usuario cambia el tema
        applyTheme(value)
      }

      return newSettings
    })
  }

  const handleRequestNotificationPermission = async () => {
    if (!isSupported) {
      setError('Las notificaciones no están soportadas en este navegador')
      return
    }

    const granted = await requestPermission()
    if (granted) {
      setSuccess('Permiso de notificaciones concedido')
      updateNotificationSetting('enabled', true)
    } else {
      setError('Permiso de notificaciones denegado. Puedes activarlo manualmente en la configuración del navegador.')
    }
  }

  // Función para detectar si hay cambios sin guardar
  const hasUnsavedChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings)
  }

  // Función para manejar el cierre/volver (solo cerrar panel, sin navegar)
  const handleExit = () => {
    if (hasUnsavedChanges()) {
      setShowExitConfirm(true)
    } else {
      setIsSettingsOpen(false)
    }
  }

  // Función para descartar cambios y salir (solo cerrar panel, sin navegar)
  const handleDiscardAndExit = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings))) // Restaurar originales
    setShowExitConfirm(false)
    setIsSettingsOpen(false)
  }

  // Función para guardar y salir
  const handleSaveAndExit = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Si las notificaciones están habilitadas pero no tenemos permiso, solicitarlo
      if (settings.notifications.enabled && !isGranted && isSupported) {
        const granted = await requestPermission()
        if (!granted) {
          setError('Se requiere permiso de notificaciones para activar esta función')
          setSaving(false)
          return
        }
      }

      // Guardar ajustes en la base de datos
      await api.updateUserSettings({
        notifications_enabled: settings.notifications.enabled,
        notifications_new_messages: settings.notifications.newMessages,
        notifications_order_updates: settings.notifications.orderUpdates,
        notifications_plan_assignments: settings.notifications.planAssignments,
        notifications_appointments: settings.notifications.appointments,
        notifications_new_orders: settings.notifications.newOrders,
        notifications_weekly_menu: settings.notifications.weeklyMenu,
        notifications_menu_changes_approved: settings.notifications.menuChangesApproved,
        notifications_order_status: settings.notifications.orderStatus,
        notifications_renewal_reminder: settings.notifications.renewalReminder,
        notifications_plan_approval: settings.notifications.planApproval,
        notifications_consultation_required: settings.notifications.consultationRequired,
        preferences_language: settings.preferences.language,
        preferences_theme: settings.preferences.theme,
        preferences_email_notifications: settings.preferences.emailNotifications,
        accessibility_font_size: settings.accessibility.fontSize,
        accessibility_high_contrast: settings.accessibility.highContrast,
        accessibility_reduce_animations: settings.accessibility.reduceAnimations,
      })

      setSuccess('Ajustes guardados correctamente')
      setOriginalSettings(JSON.parse(JSON.stringify(settings))) // Actualizar originales
      setShowExitConfirm(false)
      // Cerrar panel (sin navegar)
      setIsSettingsOpen(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Error al guardar los ajustes')
    } finally {
      setSaving(false)
    }
  }

  // Renderizar siempre el panel, incluso durante la autenticación
  // ProtectedRoute ya maneja la validación de acceso
  // Solo verificar después de que termine la autenticación para evitar renderizar innecesariamente
  // También verificar que estamos en el cliente
  if (typeof window === 'undefined') {
    return null
  }

  if (!authLoading && (!userId || (userRole && userRole !== role))) {
    return null
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    suscriptor: 'Suscriptor',
    nutricionista: 'Nutricionista',
    repartidor: 'Repartidor',
  }

  // No renderizar si no está abierto (similar a NotificationsPanel y MessagesWidget)
  if (!isSettingsOpen) {
    return null
  }

  return (
    <>
      {/* Overlay - siempre visible (móvil y desktop) - z-index menor para que el dashboard sea visible */}
      <div
        className="fixed inset-0 bg-black/20 z-[45] animate-in fade-in duration-200"
        data-nextjs-scroll-focus-boundary
        onClick={(e) => {
          e.stopPropagation()
          handleExit()
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Panel de ajustes */}
      <div
        ref={panelRef}
        className="fixed inset-0 sm:inset-auto sm:top-16 sm:left-auto sm:right-4 sm:bottom-4 sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:h-[calc(100vh-6rem)] bg-white dark:bg-slate-900 sm:rounded-xl sm:shadow-2xl z-[50] flex flex-col overflow-hidden border-0 sm:border border-gray-200 dark:border-slate-700 animate-in fade-in slide-in-from-right-4 sm:slide-in-from-bottom-4 duration-200"
        data-nextjs-scroll-focus-boundary
        style={isMobile ? {
          height: '100dvh',
          maxHeight: '100dvh',
        } : {}}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header fijo */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex-shrink-0 bg-gradient-to-r from-primary/10 via-accent/10 to-highlight/10 dark:from-primary/20 dark:via-accent/20 dark:to-highlight/20 sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 dark:bg-primary/30 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base sm:text-lg truncate text-gray-900 dark:text-gray-100">Ajustes</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                {roleLabels[role] || 'Configuración'}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleExit()
            }}
            className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 sm:hover:bg-gray-100 dark:sm:hover:bg-slate-700 rounded-lg transition-all duration-200 flex-shrink-0 active:scale-95"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 bg-gray-50 dark:bg-slate-900">
          <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Mensajes de éxito/error */}
            {success && (
              <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 p-4 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">{success}</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 p-4 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
              </div>
            )}

            {/* ==================== SECCIÓN 1: INFORMACIÓN DE CUENTA ==================== */}
            <AccountInfoSection userId={userId} role={role} userName={userName} userEmail={userEmail} />

            {/* ==================== SECCIÓN 2: PREFERENCIAS ==================== */}
            <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Preferencias</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Personaliza tu experiencia</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Idioma */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Idioma</label>
                  <select
                    value={settings.preferences.language}
                    onChange={(e) => updatePreference('language', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>

                {/* Tema */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Tema</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['light', 'dark', 'auto'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => updatePreference('theme', theme)}
                        className={`p-4 rounded-lg border-2 transition-all ${settings.preferences.theme === theme
                          ? 'border-primary bg-primary/5 dark:bg-primary/20'
                          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                          } bg-white dark:bg-slate-700`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          {theme === 'light' ? (
                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          ) : theme === 'dark' ? (
                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Oscuro' : 'Automático'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notificaciones por email */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Notificaciones por email</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Recibir notificaciones importantes por correo electrónico</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.preferences.emailNotifications}
                      onChange={(e) => updatePreference('emailNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* ==================== SECCIÓN 3: NOTIFICACIONES ==================== */}
            <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Notificaciones</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Controla qué notificaciones recibes</p>
                </div>
              </div>

              {/* Estado de permisos */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Estado de permisos</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {!isSupported
                        ? 'Las notificaciones no están disponibles en este navegador'
                        : permission === 'granted'
                          ? '✅ Permisos concedidos'
                          : permission === 'denied'
                            ? '❌ Permisos denegados. Actívalos en la configuración del navegador'
                            : '⚠️ Permisos pendientes. Actívalos para recibir notificaciones'}
                    </p>
                  </div>
                  {isSupported && permission !== 'granted' && (
                    <button
                      onClick={handleRequestNotificationPermission}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Solicitar permiso
                    </button>
                  )}
                </div>
              </div>

              {/* Toggle principal de notificaciones */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Activar notificaciones</h3>
                    <p className="text-sm text-gray-600">Recibir notificaciones en este dispositivo</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.enabled}
                      onChange={(e) => updateNotificationSetting('enabled', e.target.checked)}
                      disabled={!isGranted}
                      className="sr-only peer"
                    />
                    <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                  </label>
                </div>
              </div>

              {/* Opciones específicas de notificaciones */}
              <div className="space-y-6">
                {/* Categoría: Mensajería */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Mensajería
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">Nuevos mensajes</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme cuando reciba mensajes del nutricionista</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.newMessages}
                          onChange={(e) => updateNotificationSetting('newMessages', e.target.checked)}
                          disabled={!settings.notifications.enabled}
                          className="sr-only peer"
                        />
                        <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Categoría: Pedidos (solo para suscriptores y admin) */}
                {(role === 'suscriptor' || role === 'admin') && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Pedidos
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Actualizaciones de pedidos</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme sobre cambios en el estado de mis pedidos</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.orderUpdates}
                            onChange={(e) => updateNotificationSetting('orderUpdates', e.target.checked)}
                            disabled={!settings.notifications.enabled}
                            className="sr-only peer"
                          />
                          <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Categoría: Plan Nutricional (solo para suscriptores) */}
                {role === 'suscriptor' && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Plan Nutricional
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Asignación de planes</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme cuando me asignen un nuevo plan nutricional</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.planAssignments}
                            onChange={(e) => updateNotificationSetting('planAssignments', e.target.checked)}
                            disabled={!settings.notifications.enabled}
                            className="sr-only peer"
                          />
                          <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Aprobación de plan</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme cuando se apruebe o rechace mi plan nutricional</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.planApproval}
                            onChange={(e) => updateNotificationSetting('planApproval', e.target.checked)}
                            disabled={!settings.notifications.enabled}
                            className="sr-only peer"
                          />
                          <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Consulta requerida</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme cuando se requiera una consulta con el nutricionista</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.consultationRequired}
                            onChange={(e) => updateNotificationSetting('consultationRequired', e.target.checked)}
                            disabled={!settings.notifications.enabled}
                            className="sr-only peer"
                          />
                          <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Categoría: Menú Semanal (solo para suscriptores) */}
                {role === 'suscriptor' && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Menú Semanal
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Menú semanal generado</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme cuando se genere mi nuevo menú semanal</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.weeklyMenu}
                            onChange={(e) => updateNotificationSetting('weeklyMenu', e.target.checked)}
                            disabled={!settings.notifications.enabled}
                            className="sr-only peer"
                          />
                          <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Cambios aprobados</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme cuando se aprueben o rechacen cambios en mi menú</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.menuChangesApproved}
                            onChange={(e) => updateNotificationSetting('menuChangesApproved', e.target.checked)}
                            disabled={!settings.notifications.enabled}
                            className="sr-only peer"
                          />
                          <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Categoría: Suscripción (solo para suscriptores) */}
                {role === 'suscriptor' && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Suscripción
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Recordatorio de renovación</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme antes de que expire mi suscripción (7 días antes)</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.renewalReminder}
                            onChange={(e) => updateNotificationSetting('renewalReminder', e.target.checked)}
                            disabled={!settings.notifications.enabled}
                            className="sr-only peer"
                          />
                          <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">Estado de pedidos</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme sobre actualizaciones en el estado de mis pedidos</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.notifications.orderStatus}
                            onChange={(e) => updateNotificationSetting('orderStatus', e.target.checked)}
                            disabled={!settings.notifications.enabled}
                            className="sr-only peer"
                          />
                          <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {role === 'nutricionista' && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">Nuevas citas</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme sobre nuevas solicitudes de cita</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.appointments}
                        onChange={(e) => updateNotificationSetting('appointments', e.target.checked)}
                        disabled={!settings.notifications.enabled}
                        className="sr-only peer"
                      />
                      <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                )}

                {role === 'repartidor' && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">Nuevos pedidos</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Notificarme cuando se me asignen nuevos pedidos</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.newOrders}
                        onChange={(e) => updateNotificationSetting('newOrders', e.target.checked)}
                        disabled={!settings.notifications.enabled}
                        className="sr-only peer"
                      />
                      <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                )}
              </div>
            </section>

            {/* ==================== SECCIÓN 4: ACCESIBILIDAD ==================== */}
            <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Accesibilidad</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Personaliza la experiencia según tus necesidades</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Tamaño de fuente */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Tamaño de fuente</label>
                  <select
                    value={settings.accessibility.fontSize}
                    onChange={(e) => {
                      const fontSize = e.target.value as 'small' | 'medium' | 'large' | 'xlarge'
                      const newSettings = {
                        ...settings,
                        accessibility: {
                          ...settings.accessibility,
                          fontSize
                        }
                      }
                      setSettings(newSettings)
                      // Aplicar inmediatamente (usando rem para responsive)
                      const fontSizeMap = {
                        small: '0.875rem',    // 14px base
                        medium: '1rem',       // 16px base
                        large: '1.125rem',    // 18px base
                        xlarge: '1.25rem'     // 20px base
                      }
                      document.documentElement.style.fontSize = fontSizeMap[fontSize]
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="small">Pequeño (0.875rem)</option>
                    <option value="medium">Mediano (1rem)</option>
                    <option value="large">Grande (1.125rem)</option>
                    <option value="xlarge">Muy grande (1.25rem)</option>
                  </select>
                </div>

                {/* Modo de alto contraste */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a4 4 0 004-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4zm0 0H7" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Modo de alto contraste</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Aumenta el contraste para mejorar la legibilidad</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.accessibility.highContrast}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings,
                          accessibility: {
                            ...settings.accessibility,
                            highContrast: e.target.checked
                          }
                        }
                        setSettings(newSettings)
                        // Aplicar inmediatamente
                        if (e.target.checked) {
                          document.documentElement.classList.add('high-contrast')
                        } else {
                          document.documentElement.classList.remove('high-contrast')
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Reducir animaciones */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Reducir animaciones</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Desactiva animaciones para una experiencia más estática</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.accessibility.reduceAnimations}
                      onChange={(e) => {
                        const newSettings = {
                          ...settings,
                          accessibility: {
                            ...settings.accessibility,
                            reduceAnimations: e.target.checked
                          }
                        }
                        setSettings(newSettings)
                        // Aplicar inmediatamente
                        if (e.target.checked) {
                          document.documentElement.classList.add('reduce-motion')
                        } else {
                          document.documentElement.classList.remove('reduce-motion')
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="toggle-switch w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* ==================== SECCIÓN 5: SEGURIDAD Y PRIVACIDAD ==================== */}
            <section className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Seguridad y privacidad</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gestiona tu contraseña, seguridad y datos personales</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Cambiar contraseña */}
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Cambiar contraseña</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Actualiza tu contraseña para mantener tu cuenta segura</p>
                    </div>
                    <button
                      onClick={() => router.push('/change-password')}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0"
                    >
                      Cambiar contraseña
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
                    <p>• Mínimo 8 caracteres</p>
                    <p>• Debe incluir mayúsculas, minúsculas y números</p>
                  </div>
                </div>

                {/* Exportar datos */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Datos personales</h3>
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/users/export-data')
                          if (response.ok) {
                            const blob = await response.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `zona-azul-datos-${new Date().toISOString().split('T')[0]}.json`
                            document.body.appendChild(a)
                            a.click()
                            window.URL.revokeObjectURL(url)
                            document.body.removeChild(a)
                            alert('✅ Datos exportados correctamente')
                          } else {
                            const errorData = await response.json()
                            alert(errorData.error || 'Error al exportar los datos')
                          }
                        } catch (error) {
                          console.error('Error exporting data:', error)
                          alert('Error al exportar los datos')
                        }
                      }}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-600"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-gray-100">Exportar mis datos</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Descarga una copia de todos tus datos personales</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <button
                      onClick={async () => {
                        if (!confirm('⚠️ ¿Estás seguro de que quieres eliminar tu cuenta?\n\nEsta acción es IRREVERSIBLE y eliminará:\n- Tu perfil y datos personales\n- Tus suscripciones\n- Tus pedidos e historial\n- Todos tus datos asociados\n\n¿Deseas continuar?')) {
                          return
                        }

                        const confirmText = prompt('Escribe "ELIMINAR" para confirmar la eliminación de tu cuenta:')
                        if (confirmText !== 'ELIMINAR') {
                          alert('Confirmación incorrecta. La eliminación ha sido cancelada.')
                          return
                        }

                        try {
                          const response = await fetch('/api/users/delete-account', {
                            method: 'DELETE',
                          })
                          if (response.ok) {
                            alert('✅ Tu cuenta ha sido eliminada. Serás redirigido...')
                            // Cerrar sesión y redirigir
                            window.location.href = '/login'
                          } else {
                            const errorData = await response.json()
                            alert(errorData.error || 'Error al eliminar la cuenta')
                          }
                        } catch (error) {
                          console.error('Error deleting account:', error)
                          alert('Error al eliminar la cuenta')
                        }
                      }}
                      className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <div className="text-left">
                          <p className="font-medium text-red-900 dark:text-red-300">Eliminar cuenta</p>
                          <p className="text-xs text-red-700 dark:text-red-400">Elimina permanentemente tu cuenta y todos tus datos</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-red-400 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Botones de acción - Responsive */}
            <div className="sticky bottom-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 z-10">
              {hasUnsavedChanges() && (
                <div className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-2 sm:mb-0 sm:mr-auto">
                  ⚠️ Tienes cambios sin guardar
                </div>
              )}
              <button
                onClick={handleExit}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 dark:active:bg-slate-600 transition-colors font-medium touch-manipulation"
              >
                {hasUnsavedChanges() ? 'Descartar' : 'Volver'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges()}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-primary text-white rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Guardando...</span>
                    <span className="sm:hidden">Guardando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de salida */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-2 border border-gray-200 dark:border-slate-700">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">¿Descartar cambios?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tienes cambios sin guardar. ¿Deseas guardarlos antes de salir o descartarlos?
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleDiscardAndExit}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 dark:active:bg-slate-600 transition-colors font-medium touch-manipulation"
              >
                Descartar y salir
              </button>
              <button
                onClick={handleSaveAndExit}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 active:bg-primary/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {saving ? 'Guardando...' : 'Guardar y salir'}
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 dark:active:bg-slate-600 transition-colors font-medium touch-manipulation"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
