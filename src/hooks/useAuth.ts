"use client"

import { useState, useEffect } from 'react'

export type UserRole = 'invitado' | 'suscriptor' | 'admin'

export interface AuthState {
    role: UserRole
    isAuthenticated: boolean
    userId?: string
}

export function useAuth() {
    const [auth, setAuth] = useState<AuthState>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('user_role')
            if (stored) {
                return { role: stored as UserRole, isAuthenticated: true }
            }
        }
        return { role: 'invitado', isAuthenticated: false }
    })

    const loginAs = (role: UserRole, userId?: string) => {
        setAuth({ role, isAuthenticated: true, userId })
        if (typeof window !== 'undefined') {
            localStorage.setItem('user_role', role)
            if (userId) localStorage.setItem('user_id', userId)
        }
    }

    const logout = () => {
        setAuth({ role: 'invitado', isAuthenticated: false })
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user_role')
            localStorage.removeItem('user_id')
        }
    }

    return { ...auth, loginAs, logout }
}

