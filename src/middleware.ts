import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(peticion: NextRequest) {
  const url = new URL(peticion.url)
  const ruta = url.pathname

  // Permitir siempre archivos estáticos, API de Next.js, etc.
  if (
    ruta.startsWith('/_next') ||
    ruta.startsWith('/api/autenticacion') ||
    ruta.startsWith('/api/email') ||
    ruta === '/favicon.ico' ||
    ruta.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  // Rutas públicas: autenticación y menú del cliente (sin sesión)
  if (ruta.startsWith('/autenticacion') || ruta.startsWith('/cliente/menu')) {
    return NextResponse.next()
  }

  // Si la ruta es la raíz, redirigir al menú del cliente
  if (ruta === '/') {
    return NextResponse.redirect(new URL('/cliente/menu', peticion.url))
  }

  // Inicializar Supabase en middleware
  let peticionActualizada = peticion;
  let response = NextResponse.next({
    request: {
      headers: peticionActualizada.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return peticionActualizada.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => peticionActualizada.cookies.set(name, value))
          response = NextResponse.next({
            request: { headers: peticionActualizada.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Si no hay sesión, redirigir al login
  if (!user) {
    return NextResponse.redirect(new URL('/autenticacion/iniciar-sesion', peticion.url))
  }

  // Obtener rol desde la tabla perfiles
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rol = perfil?.rol || 'cliente'

  // Protección según rol
  if (ruta.startsWith('/administrador') && rol !== 'administrador') {
    return NextResponse.redirect(new URL('/autenticacion/iniciar-sesion', peticion.url))
  }
  if (ruta.startsWith('/empleado') && !['empleado', 'administrador'].includes(rol)) {
    return NextResponse.redirect(new URL('/autenticacion/iniciar-sesion', peticion.url))
  }

  // Permitir el acceso si todo está bien
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
