'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { crearCliente } from '@/lib/supabase/cliente'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function LayoutEmpleado({ children }: { children: React.ReactNode }) {
  const [empName, setEmpName] = useState('Empleado')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const supabase = crearCliente()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const cargarEmpleado = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre_completo')
          .eq('id', session.user.id)
          .single()
        
        if (perfil) {
          if (perfil.nombre_completo) setEmpName(perfil.nombre_completo)
          const meta = session.user.user_metadata || {}
          if (meta.avatar_url) setAvatarUrl(meta.avatar_url)
        }
      }
    }
    cargarEmpleado()
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/autenticacion/iniciar-sesion')
  }

  const menuItems = [
    { name: '📋 Ver Pedidos', path: '/empleado/pedidos' },
    { name: '📦 Control Inventario', path: '/empleado/inventario' },
    { name: '💵 Caja Chica', path: '/empleado/caja-chica' },
    { name: '📄 Reporte Diario', path: '/empleado/reportes' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 flex flex-col md:flex-row transition-colors">
      <header className="bg-white/80 dark:bg-red-950/40 backdrop-blur-md border-b border-gray-200 dark:border-red-900/30 p-4 flex justify-between items-center md:hidden z-40">
        <Link href="/empleado/pedidos" className="text-xl font-bold tracking-wider text-red-600 dark:text-red-500">
          CHAPACO VELOZ
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white p-1 focus:outline-none"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-lg border-r border-gray-200 dark:border-red-900/20 p-6 flex flex-col transition-transform duration-300 md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="mb-8 flex justify-between items-start">
          <div>
            <Link href="/empleado/pedidos" className="text-2xl font-black tracking-widest text-red-600 block mb-1">
              CHAPACO VELOZ
            </Link>
            <span className="text-xs text-gray-500 dark:text-zinc-500 font-medium uppercase tracking-wider">ÁREA DE PERSONAL</span>
          </div>
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
        </div>

        <Link href="/empleado/perfil" className="bg-gray-100 dark:bg-red-950/20 border border-gray-200 dark:border-red-900/30 p-3 rounded-xl mb-6 flex items-center gap-3 hover:bg-gray-200 dark:hover:bg-red-950/40 transition-colors cursor-pointer group">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover shadow-lg shadow-red-600/30 border border-red-600/50" />
          ) : (
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg shadow-red-600/30">
              {empName.charAt(0)}
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{empName}</p>
            <span className="text-xs text-red-500 font-medium">Ver Mi Perfil</span>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {menuItems.map(item => {
            const active = pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                  ${active 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' 
                    : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-100'}
                `}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="pt-6 border-t border-gray-200 dark:border-zinc-900 mt-6">
          <button
            onClick={cerrarSesion}
            className="w-full bg-gray-100 dark:bg-zinc-900 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 text-gray-700 dark:text-zinc-400 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
