"use client"

import { useState, useEffect } from 'react'

export const AVAILABLE_ROLES = ['invitado', 'suscriptor', 'admin', 'nutricionista', 'repartidor'] as const

export type UserRole = (typeof AVAILABLE_ROLES)[number]

export interface AuthState {
    role: UserRole
    isAuthenticated: boolean
    userId?: string
}

// Función helper para leer cookies del cliente
function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null
    return null
}

// Obtener estado de autenticación desde cookies y servidor
const getStoredAuth = async (): Promise<AuthState> => {
    if (typeof window === 'undefined') return { role: 'invitado', isAuthenticated: false }

    try {
        // Primero intentar obtener del servidor (más seguro)
        const response = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
        })

        if (response.ok) {
            const data = await response.json()
            if (data.authenticated) {
                return {
                    role: data.role as UserRole,
                    isAuthenticated: true,
                    userId: data.userId,
                }
            }
        }
    } catch (error) {
        console.warn('Error fetching session from server, falling back to cookies:', error)
    }

    // Fallback a cookies del cliente
    const cookieRole = getCookie('user_role') as UserRole | null
    const cookieUserId = getCookie('user_id') ?? undefined

    if (cookieRole && AVAILABLE_ROLES.includes(cookieRole)) {
        return {
            role: cookieRole,
            isAuthenticated: cookieRole !== 'invitado',
            userId: cookieUserId,
        }
    }

    return { role: 'invitado', isAuthenticated: false }
}

export function useAuth() {
    const [auth, setAuth] = useState<AuthState>({ role: 'invitado', isAuthenticated: false })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Cargar estado inicial desde servidor
        getStoredAuth().then((authState) => {
            setAuth(authState)
            setLoading(false)
        })

        // Polling periódico para verificar sesión (cada 30 segundos)
        const interval = setInterval(() => {
            getStoredAuth().then((authState) => {
                setAuth(authState)
            })
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            })
        } catch (error) {
            console.error('Error al cerrar sesión:', error)
        }

        setAuth({ role: 'invitado', isAuthenticated: false })
    }

    return { ...auth, logout, loading }
}

