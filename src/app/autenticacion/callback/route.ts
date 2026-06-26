import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await crearClienteServidor()
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

    if (session?.user) {
      // Checar si el usuario es nuevo (cuenta creada hace menos de 2 minutos)
      const createdAt = new Date(session.user.created_at).getTime()
      const now = new Date().getTime()
      const isNewUser = (now - createdAt) < 2 * 60 * 1000

      if (isNewUser && session.user.email) {
        const nombre = session.user.user_metadata?.full_name || session.user.user_metadata?.name || ''
        const origin = req.nextUrl.origin
        
        // Disparar correo de bienvenida en segundo plano
        fetch(`${origin}/api/email/bienvenida`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.user.email, nombre })
        }).catch(err => console.error('Error invocando API de correos en OAuth:', err))
      }
    }
  }
  return NextResponse.redirect(new URL('/cliente/menu', req.url))
}