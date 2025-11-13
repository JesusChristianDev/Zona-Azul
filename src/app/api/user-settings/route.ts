import { NextRequest, NextResponse } from 'next/server'
import { getUserSettings, updateUserSettings } from '@/lib/db'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener configuraciones del usuario
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const userId = cookieStore.get('user_id')?.value

        if (!userId) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            )
        }

        const settings = await getUserSettings(userId)

        // Si no hay configuraciones, retornar valores por defecto
        if (!settings) {
            return NextResponse.json({
                settings: {
                    notifications_enabled: true,
                    notifications_new_messages: true,
                    notifications_order_updates: true,
                    notifications_plan_assignments: true,
                    notifications_appointments: true,
                    notifications_new_orders: true,
                    notifications_weekly_menu: true,
                    notifications_menu_changes_approved: true,
                    notifications_order_status: true,
                    notifications_renewal_reminder: true,
                    notifications_plan_approval: true,
                    notifications_consultation_required: true,
                    preferences_language: 'es',
                    preferences_theme: 'light',
                    preferences_email_notifications: false,
                }
            })
        }

        return NextResponse.json({ settings })
    } catch (error) {
        console.error('Error fetching user settings:', error)
        return NextResponse.json(
            { error: 'Error al obtener configuraciones' },
            { status: 500 }
        )
    }
}

// POST - Actualizar configuraciones del usuario
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const userId = cookieStore.get('user_id')?.value

        if (!userId) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const {
            notifications_enabled,
            notifications_new_messages,
            notifications_order_updates,
            notifications_plan_assignments,
            notifications_appointments,
            notifications_new_orders,
            notifications_weekly_menu,
            notifications_menu_changes_approved,
            notifications_order_status,
            notifications_renewal_reminder,
            notifications_plan_approval,
            notifications_consultation_required,
            preferences_language,
            preferences_theme,
            preferences_email_notifications,
        } = body

        const updatedSettings = await updateUserSettings(userId, {
            notifications_enabled,
            notifications_new_messages,
            notifications_order_updates,
            notifications_plan_assignments,
            notifications_appointments,
            notifications_new_orders,
            notifications_weekly_menu,
            notifications_menu_changes_approved,
            notifications_order_status,
            notifications_renewal_reminder,
            notifications_plan_approval,
            notifications_consultation_required,
            preferences_language,
            preferences_theme,
            preferences_email_notifications,
        })

        if (!updatedSettings) {
            return NextResponse.json(
                { error: 'Error al actualizar configuraciones' },
                { status: 500 }
            )
        }

        return NextResponse.json({ settings: updatedSettings })
    } catch (error) {
        console.error('Error updating user settings:', error)
        return NextResponse.json(
            { error: 'Error al actualizar configuraciones' },
            { status: 500 }
        )
    }
}

