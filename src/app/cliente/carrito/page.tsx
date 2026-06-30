'use client'

import { useCarrito } from '@/contexto/CarritoContexto'
import Link from 'next/link'

export default function Carrito() {
  const { items, agregar, quitar, total, vaciar } = useCarrito()

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in transition-colors">
        <div className="w-32 h-32 bg-gray-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-8 shadow-inner relative">
          <span className="text-6xl drop-shadow-sm relative z-10">🛒</span>
          <div className="absolute inset-0 rounded-full bg-red-500/10 blur-xl animate-pulse"></div>
        </div>
        <h1 className="text-4xl font-black text-gray-800 dark:text-white mb-4">Tu Carrito está Vacío</h1>
        <p className="text-gray-500 dark:text-zinc-400 mb-10 max-w-md text-lg">Parece que aún no has decidido qué probar. ¡Explora nuestro menú y descubre el sabor tradicional!</p>
        <Link 
          href="/cliente/menu" 
          className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-10 py-4 rounded-full font-bold shadow-[0_10px_25px_rgba(220,38,38,0.4)] transition-all hover:scale-105 active:scale-95 text-lg"
        >
          Explorar Menú
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 min-h-screen transition-colors animate-fade-in pt-8">
      <div className="flex items-center justify-between mb-8 sm:mb-12 border-b border-gray-200 dark:border-zinc-800 pb-6">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Tu Orden</h1>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold px-4 py-2 rounded-full text-sm border border-red-200 dark:border-red-800/30 shadow-sm">
          {items.reduce((acc, i) => acc + i.cantidad, 0)} Items
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Lista de Productos */}
        <div className="flex-1">
          <ul className="space-y-4">
            {items.map(item => (
              <li key={item.id} className="group bg-white dark:bg-zinc-900 rounded-3xl shadow-sm hover:shadow-md border border-gray-100 dark:border-zinc-800/80 p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all duration-300">
                <div className="flex-1">
                  <p className="font-bold text-lg sm:text-xl text-gray-900 dark:text-zinc-100 leading-tight mb-1">{item.nombre}</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">Bs {item.precio.toFixed(2)} <span className="text-gray-400 dark:text-zinc-500 font-normal">c/u</span></p>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0">
                  <div className="flex items-center bg-gray-50 dark:bg-zinc-950 rounded-xl p-1.5 border border-gray-200/80 dark:border-zinc-800">
                    <button 
                      onClick={() => quitar(item.id)} 
                      className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-lg shadow-sm text-gray-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition-colors font-black text-xl hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-90"
                    >
                      −
                    </button>
                    <span className="w-12 text-center font-black text-gray-900 dark:text-zinc-100 text-lg">{item.cantidad}</span>
                    <button 
                      onClick={() => agregar(item)} 
                      className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-lg shadow-sm text-gray-600 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors font-black text-xl hover:bg-gray-50 dark:hover:bg-zinc-700 active:scale-90"
                    >
                      +
                    </button>
                  </div>
                  <p className="font-black text-xl text-gray-900 dark:text-white min-w-[90px] text-right">
                    Bs {(item.cantidad * item.precio).toFixed(2)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Resumen de Compra (Sticky Card) */}
        <div className="lg:w-80 relative">
          <div className="sticky top-28 bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Resumen</h2>
            
            <div className="space-y-4 mb-6 flex-1">
              <div className="flex justify-between text-gray-600 dark:text-zinc-400 font-medium">
                <span>Subtotal</span>
                <span>Bs {total.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 flex justify-between items-center">
                <span className="text-gray-900 dark:text-white font-bold">Total a Pagar</span>
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">Bs {total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 mt-4">
              <Link 
                href="/cliente/checkout" 
                className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-[0_5px_20px_rgba(220,38,38,0.3)] transition-all hover:-translate-y-1 text-center text-lg flex items-center justify-center gap-2 group"
              >
                <span>Proceder al Pago</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <button 
                onClick={vaciar} 
                className="w-full py-3 rounded-xl font-bold text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Vaciar Carrito
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}