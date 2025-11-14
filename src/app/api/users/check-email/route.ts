import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns'
import { promisify } from 'util'

export const dynamic = 'force-dynamic'

const resolveMx = promisify(dns.resolveMx)

// GET - Verificar si un email existe globalmente (validar dominio)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    
    // Validar formato básico
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ 
        exists: false,
        email: trimmedEmail,
        reason: 'Formato inválido'
      })
    }

    // Extraer dominio
    const domain = trimmedEmail.split('@')[1]
    
    try {
      // Verificar si el dominio tiene registros MX (Mail Exchange)
      // Esto indica que el dominio puede recibir emails
      const mxRecords = await resolveMx(domain)
      
      if (mxRecords && mxRecords.length > 0) {
        // El dominio tiene registros MX, por lo tanto puede recibir emails
        return NextResponse.json({ 
          exists: true,
          email: trimmedEmail,
          domain: domain,
          reason: 'Dominio válido con registros MX'
        })
      } else {
        // No hay registros MX, pero el dominio podría existir
        // Intentar verificar si el dominio existe con A record
        try {
          const dnsResolve = promisify(dns.resolve4)
          await dnsResolve(domain)
          return NextResponse.json({ 
            exists: true,
            email: trimmedEmail,
            domain: domain,
            reason: 'Dominio existe pero sin registros MX'
          })
        } catch {
          return NextResponse.json({ 
            exists: false,
            email: trimmedEmail,
            domain: domain,
            reason: 'Dominio no encontrado'
          })
        }
      }
    } catch (dnsError: any) {
      // Error al resolver el dominio
      if (dnsError.code === 'ENOTFOUND' || dnsError.code === 'ENODATA') {
        return NextResponse.json({ 
          exists: false,
          email: trimmedEmail,
          domain: domain,
          reason: 'Dominio no encontrado'
        })
      }
      
      // Otro error DNS
      console.error('Error DNS:', dnsError)
      return NextResponse.json({ 
        exists: false,
        email: trimmedEmail,
        domain: domain,
        reason: 'Error al verificar dominio'
      })
    }
  } catch (error: any) {
    console.error('Error checking email:', error)
    return NextResponse.json(
      { error: 'Error al verificar el email', details: error?.message },
      { status: 500 }
    )
  }
}

