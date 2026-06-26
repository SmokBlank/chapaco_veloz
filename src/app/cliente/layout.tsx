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
    const cargarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre_completo')
          .eq('id', session.user.id)
          .single()

        const nombreCompleto = perfil?.nombre_completo || 'Cliente'
        const primerNombre = nombreCompleto.split(' ')[0]

        setUsuario({ nombre: primerNombre })
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

          const nombreCompleto = perfil?.nombre_completo || 'Cliente'
          const primerNombre = nombreCompleto.split(' ')[0]

          setUsuario({ nombre: primerNombre })
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
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors">
      <header className="bg-red-700 dark:bg-red-950 text-white p-4 shadow-md border-b border-red-800/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/cliente/menu" className="text-xl font-black tracking-widest hover:text-red-200 transition-colors">
            CHAPACO VELOZ
          </Link>
          <nav className="flex gap-4 text-sm items-center font-medium">
            <Link href="/cliente/menu" className={`hover:text-red-200 transition-colors ${pathname === '/cliente/menu' ? 'underline decoration-2 underline-offset-4' : ''}`}>
              Menú
            </Link>
            
            {usuario ? (
              <>
                <Link href="/cliente/pedidos" className="hover:text-red-200 transition-colors">
                  Mis Pedidos
                </Link>
                <span className="text-red-100 hidden sm:inline border-l border-red-500/50 pl-4">
                  👤 Hola, {usuario.nombre}
                </span>
                <button
                  onClick={cerrarSesion}
                  className="bg-red-800 hover:bg-red-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link href="/autenticacion/iniciar-sesion" className="bg-white dark:bg-zinc-900 text-red-700 dark:text-red-400 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 dark:hover:bg-zinc-800 transition-colors shadow-sm">
                  Iniciar sesión
                </Link>
              </>
            )}
            <div className="ml-2 border-l border-red-500/50 pl-4 flex items-center gap-4">
              <ThemeToggle />
              
              {/* Espacio para el logo del lado derecho */}
              <img 
                src="/logo.png" 
                alt="Logo Chapaco Veloz" 
                className="h-8 w-auto object-contain" 
              />
            </div>
          </nav>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto pb-24 relative">
        {children}
        
        {/* Floating Action Button (FAB) for Shopping Cart */}
        {cantidadTotal > 0 && (
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={() => router.push('/cliente/carrito')}
              className="group relative bg-red-600 hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 text-white p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.24)] transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-500/50 flex items-center justify-center"
            >
              <ShoppingCart className="w-7 h-7" />
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shadow-md animate-bounce group-hover:animate-none">
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