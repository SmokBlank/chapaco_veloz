'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { CarritoProvider, useCarrito } from '@/contexto/CarritoContexto'
import { crearCliente } from '@/lib/supabase/cliente'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ShoppingCart } from 'lucide-react'

function ClienteLayoutInner({ children }: { children: React.ReactNode }) {
  const { cantidadTotal } = useCarrito()
  const [usuario, setUsuario] = useState<{ nombre: string } | null>(null)
  const supabase = crearCliente()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const extraerNombre = (perfil: any, session: any) => {
      let nombre = ''
      if (perfil?.nombre_completo) {
        nombre = perfil.nombre_completo
      } else if (session?.user?.user_metadata?.full_name) {
        nombre = session.user.user_metadata.full_name
      } else if (session?.user?.user_metadata?.name) {
        nombre = session.user.user_metadata.name
      } else {
        nombre = 'Usuario' // Evita decir "cliente" o "administrador"
      }
      return nombre.split(' ')[0]
    }

    const cargarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre_completo')
          .eq('id', session.user.id)
          .single()

        setUsuario({ nombre: extraerNombre(perfil, session) })
      } else {
        setUsuario(null)
      }
    }

    cargarSesion()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const actualizarPerfil = async () => {
          const { data: perfil } = await supabase
            .from('perfiles')
            .select('nombre_completo')
            .eq('id', session.user.id)
            .single()

          setUsuario({ nombre: extraerNombre(perfil, session) })
        }
        actualizarPerfil()
      } else {
        setUsuario(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    setUsuario(null)
    router.push('/cliente/menu')
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 transition-colors selection:bg-red-500/30">
      {/* Navbar con Glassmorphism y Sticky */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-gray-200/50 dark:border-white/10 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo y Nombre */}
            <Link href="/cliente/menu" className="flex items-center gap-3 group">
              <div className="relative overflow-hidden rounded-full p-1 bg-white dark:bg-transparent shadow-sm border border-gray-100 dark:border-none group-hover:shadow-md transition-all">
                <img 
                  src="/logo.png" 
                  alt="Logo Chapaco Veloz" 
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain transform group-hover:scale-110 transition-transform duration-300" 
                />
              </div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white hidden sm:block bg-clip-text">
                CHAPACO <span className="text-red-600 dark:text-red-500">VELOZ</span>
              </span>
            </Link>
            
            {/* Navegación y Acciones */}
            <nav className="flex items-center gap-3 sm:gap-6 text-sm font-semibold">
              <Link 
                href="/cliente/menu" 
                className={`hidden sm:block transition-colors px-3 py-2 rounded-lg ${pathname === '/cliente/menu' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5'}`}
              >
                Menú
              </Link>
              
              {usuario ? (
                <>
                  <Link 
                    href="/cliente/pedidos" 
                    className={`hidden md:block transition-colors px-3 py-2 rounded-lg ${pathname === '/cliente/pedidos' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5'}`}
                  >
                    Mis Pedidos
                  </Link>
                  <div className="hidden sm:flex items-center gap-2 border-l border-gray-200 dark:border-zinc-800 pl-6 ml-2">
                    <span className="bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-full text-xs flex items-center gap-2">
                      <span className="text-lg leading-none">👋</span>
                      Hola, <span className="font-bold text-red-600 dark:text-red-400">{usuario.nombre}</span>
                    </span>
                  </div>
                  <button
                    onClick={cerrarSesion}
                    className="text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                    title="Cerrar Sesión"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  </button>
                </>
              ) : (
                <Link 
                  href="/autenticacion/iniciar-sesion" 
                  className="bg-gray-900 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black px-5 py-2.5 rounded-full text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  Iniciar sesión
                </Link>
              )}
              
              <div className="border-l border-gray-200 dark:border-zinc-800 pl-3 sm:pl-6 ml-1 sm:ml-2">
                <ThemeToggle />
              </div>
            </nav>
          </div>
        </div>
      </header>
      
      <main className="relative pb-24 min-h-[calc(100vh-80px)]">
        {/* Decorative background gradients */}
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-red-50/50 dark:from-red-900/10 to-transparent pointer-events-none -z-10" />
        
        {children}
        
        {/* Floating Action Button (FAB) for Shopping Cart with Glow effect */}
        {cantidadTotal > 0 && (
          <div className="fixed bottom-6 sm:bottom-10 right-6 sm:right-10 z-50 animate-bounce-slow">
            <button
              onClick={() => router.push('/cliente/carrito')}
              className="group relative flex items-center justify-center p-4 rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none"
            >
              <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7" />
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-black rounded-full w-7 h-7 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                {cantidadTotal}
              </span>
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function LayoutCliente({ children }: { children: React.ReactNode }) {
  return (
    <CarritoProvider>
      <ClienteLayoutInner>{children}</ClienteLayoutInner>
    </CarritoProvider>
  )
}