'use client'

import { useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'
import Link from 'next/link'

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const supabase = crearCliente()

  const recuperar = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    setMensaje('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/autenticacion/actualizar-password`
    })

    if (error) {
      setError(error.message)
    } else {
      setMensaje('Se ha enviado un enlace de recuperación a tu correo.')
    }
    setCargando(false)
  }

  if (mensaje) {
    return (
      <div className="flex flex-col items-center animate-fade-in text-center p-6">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <span className="text-3xl">📧</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">Revisa tu correo</h1>
        <p className="text-gray-500 dark:text-zinc-400 mb-8 max-w-sm">
          {mensaje} Haz clic en el enlace del correo para restablecer tu contraseña.
        </p>
        <Link 
          href="/autenticacion/iniciar-sesion" 
          className="bg-red-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-500 transition-colors"
        >
          Volver a Iniciar Sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <h1 className="text-2xl xl:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
        Recuperar Contraseña
      </h1>
      <p className="text-sm text-gray-500 dark:text-zinc-400 text-center max-w-xs mb-8">
        Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
      </p>

      <div className="w-full flex-1 mt-2">
        <div className="mx-auto max-w-xs">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-900/50 dark:text-red-400 p-3 rounded-lg mb-4 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={recuperar} className="space-y-4">
            <input
              type="email"
              placeholder="Tu correo electrónico"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-red-400 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-zinc-900 transition-colors"
            />
            <button
              type="submit"
              disabled={cargando || !email}
              className="mt-5 tracking-wide font-semibold bg-red-600 text-white w-full py-4 rounded-lg hover:bg-red-500 transition-all duration-300 disabled:opacity-50"
            >
              {cargando ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center text-xs text-gray-600 dark:text-zinc-400">
            <Link href="/autenticacion/iniciar-sesion" className="hover:underline flex items-center gap-1 hover:text-red-600">
              <span>←</span> Volver a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}