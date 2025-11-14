import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET: Obtener contrato de una suscripción
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const subscriptionId = params.id

        const { data, error } = await supabase
            .from('subscription_contracts')
            .select('*')
            .eq('subscription_id', subscriptionId)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                // No existe contrato, generarlo
                return await generateContract(subscriptionId)
            }
            console.error('Error fetching contract:', error)
            return NextResponse.json(
                { error: 'Error al obtener contrato' },
                { status: 500 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Error inesperado al obtener contrato' },
            { status: 500 }
        )
    }
}

// POST: Generar y firmar contrato
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const subscriptionId = params.id
        const body = await request.json()
        const { signed_by, signature_method, signature_image, ip_address, user_agent } = body

        if (!signed_by) {
            return NextResponse.json(
                { error: 'Falta el ID del usuario que firma' },
                { status: 400 }
            )
        }

        // Obtener o generar contrato
        let contract = await getOrGenerateContract(subscriptionId)

        if (!contract) {
            return NextResponse.json(
                { error: 'Error al generar contrato' },
                { status: 500 }
            )
        }

        // Verificar que el contrato no esté ya firmado
        if (contract.signed) {
            return NextResponse.json(
                { error: 'Este contrato ya ha sido firmado' },
                { status: 400 }
            )
        }

        // Preparar datos de actualización
        const updateData: any = {
            signed: true,
            signed_at: new Date().toISOString(),
            signed_by,
            signature_method: signature_method || 'checkbox_acceptance',
            ip_address: ip_address || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            user_agent: user_agent || request.headers.get('user-agent') || 'unknown',
        }

        // Si hay imagen de firma, agregarla
        if (signature_image) {
            updateData.signature_image = signature_image
        }

        // Firmar contrato
        const { data, error } = await supabase
            .from('subscription_contracts')
            .update(updateData)
            .eq('id', contract.id)
            .select()
            .single()

        if (error) {
            console.error('Error signing contract:', error)
            return NextResponse.json(
                { error: 'Error al firmar contrato' },
                { status: 500 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Error inesperado al firmar contrato' },
            { status: 500 }
        )
    }
}

// Función auxiliar para generar contrato
async function generateContract(subscriptionId: string) {
    try {
        // Obtener información de la suscripción
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select(`
        *,
        subscription_plans:plan_id (
          name,
          duration_months,
          base_price,
          discount_percentage
        ),
        users:user_id (
          name,
          email
        )
      `)
            .eq('id', subscriptionId)
            .single()

        if (subError || !subscription) {
            return NextResponse.json(
                { error: 'Suscripción no encontrada' },
                { status: 404 }
            )
        }

        const plan = subscription.subscription_plans
        const user = subscription.users

        // Generar texto del contrato
        const contractText = generateContractText(
            plan.name,
            plan.duration_months,
            plan.base_price,
            plan.discount_percentage,
            subscription.price,
            user.name,
            user.email
        )

        // Crear contrato
        const { data, error } = await supabase
            .from('subscription_contracts')
            .insert({
                subscription_id: subscriptionId,
                contract_text: contractText,
                contract_type: plan.name.toLowerCase() as 'mensual' | 'trimestral' | 'anual',
                signed: false,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating contract:', error)
            return NextResponse.json(
                { error: 'Error al generar contrato' },
                { status: 500 }
            )
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error in generateContract:', error)
        return NextResponse.json(
            { error: 'Error inesperado al generar contrato' },
            { status: 500 }
        )
    }
}

// Función auxiliar para obtener o generar contrato
async function getOrGenerateContract(subscriptionId: string) {
    const { data, error } = await supabase
        .from('subscription_contracts')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .single()

    if (error && error.code === 'PGRST116') {
        // No existe, generar
        const response = await generateContract(subscriptionId)
        const contractData = await response.json()
        return contractData
    }

    return data
}

// Función para generar texto del contrato
function generateContractText(
    planName: string,
    durationMonths: number,
    basePrice: number,
    discountPercentage: number,
    finalPrice: number,
    userName: string,
    userEmail: string
): string {
    const discountText = discountPercentage > 0
        ? `\nDescuento aplicado: ${discountPercentage}%\nPrecio final: €${finalPrice.toFixed(2)}`
        : `\nPrecio: €${finalPrice.toFixed(2)}`

    return `
CONTRATO DE SUSCRIPCIÓN NUTRICIONAL - ZONA AZUL

Este contrato establece los términos y condiciones para la suscripción al plan nutricional de Zona Azul.

DATOS DEL CLIENTE:
- Nombre: ${userName}
- Email: ${userEmail}

PLAN SELECCIONADO:
- Plan: ${planName}
- Duración: ${durationMonths} ${durationMonths === 1 ? 'mes' : 'meses'}
- Precio base: €${basePrice.toFixed(2)}${discountText}

CONDICIONES:
1. La activación del plan requiere una reunión presencial con el administrador.
2. El plan incluye menús semanales personalizados generados automáticamente.
3. Las modificaciones de menú requieren aprobación del nutricionista.
4. El pago debe realizarse según el método acordado.
5. La suscripción se renovará automáticamente a menos que se cancele con 7 días de antelación.

ACEPTACIÓN:
Al firmar este contrato, el cliente acepta todos los términos y condiciones establecidos.

Fecha: ${new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}

Firma del cliente: [Firma electrónica]

Zona Azul - Bienestar Integral
  `.trim()
}


