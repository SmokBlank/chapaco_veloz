'use client'

import { useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'
import Link from 'next/link'

export default function IniciarSesion() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const supabase = crearCliente()

  const iniciarSesionEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError('')

    let loginEmail = email.trim()
    let loginPassword = password

    if (loginEmail.toLowerCase() === 'admin') {
      loginEmail = 'admin@chapacoveloz.com'
    }

    let { data, error: loginError } = await supabase.auth.signInWithPassword({ 
      email: loginEmail, 
      password: loginPassword 
    })
    
    // Auto-registro para administrador principal si no existe
    if (loginError && loginEmail === 'admin@chapacoveloz.com' && loginPassword === 'admin123') {
      console.log('Admin no encontrado. Intentando registro automático...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: loginEmail,
        password: loginPassword,
        options: {
          data: {
            nombre_completo: 'Administrador Principal',
            telefono: '77777777',
            ci: '0000001',
            fecha_nacimiento: '1990-01-01',
            rol: 'administrador'
          }
        }
      })

      if (!signUpError) {
        // Intentar iniciar sesión de nuevo tras registro exitoso
        const retry = await supabase.auth.signInWithPassword({ 
          email: loginEmail, 
          password: loginPassword 
        })
        data = retry.data
        loginError = retry.error
      } else {
        loginError = signUpError
      }
    }

    if (loginError) {
      setError(loginError.message)
      setCargando(false)
      return
    }

    if (!data.user) {
      setError('Usuario no encontrado')
      setCargando(false)
      return
    }

    // Obtener el rol
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', data.user.id)
      .single()

    const rol = perfil?.rol || 'cliente'

    // Redirigir según el rol
    if (rol === 'administrador') {
      window.location.href = '/administrador/panel'
    } else if (rol === 'empleado') {
      window.location.href = '/empleado/inventario'
    } else {
      window.location.href = '/cliente/menu'
    }
  }

  const iniciarSesionGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/autenticacion/callback` }
    })
  }

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <h1 className="text-2xl xl:text-3xl font-extrabold text-gray-900 dark:text-white">
        Iniciar Sesión
      </h1>

      <div className="w-full flex-1 mt-8">
        
        {/* Botones de Redes Sociales */}
        <div className="flex flex-col items-center">
          <button
            onClick={iniciarSesionGoogle}
            className="w-full max-w-xs font-bold shadow-sm rounded-lg py-3 bg-red-100 text-gray-800 dark:bg-red-900/30 dark:text-gray-100 flex items-center justify-center transition-all duration-300 ease-in-out hover:shadow focus:outline-none"
          >
            <div className="bg-white p-2 rounded-full">
              <svg className="w-4" viewBox="0 0 533.5 544.3">
                <path d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z" fill="#4285f4"/>
                <path d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z" fill="#34a853"/>
                <path d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z" fill="#fbbc04"/>
                <path d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z" fill="#ea4335"/>
              </svg>
            </div>
            <span className="ml-4">Continuar con Google</span>
          </button>
        </div>

        {/* Separador */}
        <div className="my-8 border-b border-gray-200 dark:border-zinc-800 text-center">
          <div className="leading-none px-2 inline-block text-sm text-gray-500 tracking-wide font-medium bg-white dark:bg-zinc-900 transform translate-y-1/2">
            O inicia sesión con tu email
          </div>
        </div>

        {/* Formulario Tradicional */}
        <div className="mx-auto max-w-xs">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-900/50 dark:text-red-400 p-3 rounded-lg mb-4 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={iniciarSesionEmail}>
            <input
              type="email"
              placeholder="Correo electrónico"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-red-400 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-zinc-900 transition-colors"
            />
            <input
              type="password"
              placeholder="Contraseña"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm mt-5 focus:outline-none focus:border-red-400 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-zinc-900 transition-colors"
            />
            <button
              type="submit"
              disabled={cargando}
              className="mt-5 tracking-wide font-semibold bg-red-600 text-white w-full py-4 rounded-lg hover:bg-red-500 transition-all duration-300 disabled:opacity-50"
            >
              {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center text-xs text-gray-600 dark:text-zinc-400 space-y-2">
            <Link href="/autenticacion/recuperar" className="hover:underline hover:text-red-600">
              ¿Olvidaste tu contraseña?
            </Link>
            <p>
              ¿No tienes cuenta?{' '}
              <Link href="/autenticacion/registro" className="underline hover:text-red-600 font-bold">
                Regístrate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}