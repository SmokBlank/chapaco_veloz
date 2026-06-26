'use client'

import { useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'
import Link from 'next/link'

export default function Registro() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [cargando, setCargando] = useState(false)
  const supabase = crearCliente()

  const registrarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    setExito(false)

    // El rol por defecto es 'cliente', si se desea registrar administradores o empleados
    // se debe hacer desde un panel de control interno, no desde el registro público.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre_completo: nombre,
          telefono: telefono,
          rol: 'cliente'
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setCargando(false)
      return
    }

    // Disparar correo de bienvenida en segundo plano
    fetch('/api/email/bienvenida', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre })
    }).catch(err => console.error('Error invocando API de correos:', err))

    setExito(true)
    setCargando(false)
  }

  const registrarConGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/autenticacion/callback` }
    })
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center animate-fade-in text-center p-6">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <span className="text-3xl">✅</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">¡Registro Exitoso!</h1>
        <p className="text-gray-500 dark:text-zinc-400 mb-8 max-w-sm">
          Te hemos enviado un correo de confirmación. Por favor, revisa tu bandeja de entrada para verificar tu cuenta.
        </p>
        <Link 
          href="/autenticacion/iniciar-sesion" 
          className="bg-red-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-500 transition-colors"
        >
          Ir a Iniciar Sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <h1 className="text-2xl xl:text-3xl font-extrabold text-gray-900 dark:text-white">
        Crear Cuenta
      </h1>

      <div className="w-full flex-1 mt-8">
        
        {/* Botones de Redes Sociales */}
        <div className="flex flex-col items-center">
          <button
            onClick={registrarConGoogle}
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
            <span className="ml-4">Registrar con Google</span>
          </button>
        </div>

        {/* Separador */}
        <div className="my-8 border-b border-gray-200 dark:border-zinc-800 text-center">
          <div className="leading-none px-2 inline-block text-sm text-gray-500 tracking-wide font-medium bg-white dark:bg-zinc-900 transform translate-y-1/2">
            O regístrate con tu email
          </div>
        </div>

        {/* Formulario Tradicional */}
        <div className="mx-auto max-w-xs">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/50 dark:border-red-900/50 dark:text-red-400 p-3 rounded-lg mb-4 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <form onSubmit={registrarUsuario} className="space-y-4">
            <input
              type="text"
              placeholder="Nombre Completo"
              required
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-red-400 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-zinc-900 transition-colors"
            />
            <input
              type="tel"
              placeholder="Teléfono (Ej: 77712345)"
              required
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-red-400 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-zinc-900 transition-colors"
            />
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
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-red-400 focus:bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500 dark:focus:bg-zinc-900 transition-colors"
            />
            <button
              type="submit"
              disabled={cargando}
              className="mt-5 tracking-wide font-semibold bg-red-600 text-white w-full py-4 rounded-lg hover:bg-red-500 transition-all duration-300 disabled:opacity-50"
            >
              {cargando ? 'Creando cuenta...' : 'Regístrate'}
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-600 dark:text-zinc-400 text-center">
            Al registrarte aceptas nuestros{' '}
            <a href="#" className="underline hover:text-red-600">Términos de Servicio</a>{' '}
            y{' '}
            <a href="#" className="underline hover:text-red-600">Política de Privacidad</a>.
          </p>

          <div className="mt-4 flex flex-col items-center text-xs text-gray-600 dark:text-zinc-400">
            <p>
              ¿Ya tienes una cuenta?{' '}
              <Link href="/autenticacion/iniciar-sesion" className="underline hover:text-red-600 font-bold">
                Inicia Sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}