'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col justify-between">
      {/* Navbar header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="text-2xl font-black tracking-widest text-red-600">
            CHAPACO VELOZ
          </span>
          <div className="flex gap-4">
            <Link 
              href="/cliente/menu" 
              className="text-zinc-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
            >
              Ver Menú
            </Link>
            <Link 
              href="/autenticacion/iniciar-sesion" 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center max-w-4xl mx-auto">
        <span className="text-red-500 font-bold uppercase tracking-widest text-sm mb-4 px-3 py-1 bg-red-950/30 border border-red-900/40 rounded-full">
          🔥 Parrilla y Sabor Tarijeño
        </span>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none mb-6">
          El Auténtico Sabor del <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">Chancho a la Cruz</span>
        </h1>
        <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mb-8 leading-relaxed">
          Disfruta de nuestras carnes a la parrilla, guarniciones tradicionales y refrescos helados directo en tu mesa o con entrega a domicilio.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16 w-full justify-center">
          <Link 
            href="/cliente/menu" 
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-xl shadow-red-600/20 transition-all duration-300 scale-100 hover:scale-105"
          >
            🍽️ Ordenar Ahora (Menú)
          </Link>
          <Link 
            href="/autenticacion/iniciar-sesion" 
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-lg px-8 py-4 rounded-xl transition-all duration-200"
          >
            💼 Acceso Personal
          </Link>
        </div>

        {/* Feature showcase grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left">
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl">
            <span className="text-3xl mb-3 block">🪵</span>
            <h3 className="font-bold text-lg mb-2">Parrilla a Leña</h3>
            <p className="text-sm text-zinc-500">Preparación tradicional lenta para garantizar la textura jugosa y sabor único.</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl">
            <span className="text-3xl mb-3 block">🛵</span>
            <h3 className="font-bold text-lg mb-2">Delivery Veloz</h3>
            <p className="text-sm text-zinc-500">Tu comida caliente hasta la puerta de tu hogar con empaques térmicos.</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-2xl">
            <span className="text-3xl mb-3 block">💳</span>
            <h3 className="font-bold text-lg mb-2">Pago QR o Caja</h3>
            <p className="text-sm text-zinc-500">Paga de forma ágil desde tu celular por transferencia QR o en efectivo.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-sm text-zinc-650 bg-zinc-950">
        <p>© 2026 Restaurante Chapaco Veloz. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
