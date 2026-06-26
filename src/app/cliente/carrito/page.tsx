'use client'

import { useCarrito } from '@/contexto/CarritoContexto'
import Link from 'next/link'

export default function Carrito() {
  const { items, agregar, quitar, total, vaciar } = useCarrito()

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in transition-colors">
        <div className="w-24 h-24 bg-gray-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <span className="text-4xl">🛒</span>
        </div>
        <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-3">Tu Carrito</h1>
        <p className="text-gray-500 dark:text-zinc-400 mb-8 max-w-sm">No has agregado nada aún. ¡Explora nuestro menú y descubre platillos deliciosos!</p>
        <Link 
          href="/cliente/menu" 
          className="bg-red-600 hover:bg-red-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-red-600/30 transition-all hover:-translate-y-1"
        >
          Ir al menú
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 min-h-screen transition-colors animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black text-gray-800 dark:text-white">Tu Carrito</h1>
        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold px-3 py-1 rounded-full text-sm">
          {items.reduce((acc, i) => acc + i.cantidad, 0)} Items
        </span>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden mb-6 transition-colors">
        <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
          {items.map(item => (
            <li key={item.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-6 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors gap-4">
              <div className="flex-1">
                <p className="font-bold text-lg text-gray-800 dark:text-zinc-100 leading-tight mb-1">{item.nombre}</p>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Bs {item.precio.toFixed(2)} <span className="text-gray-400 dark:text-zinc-500 font-normal">c/u</span></p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                <div className="flex items-center bg-gray-100 dark:bg-zinc-950 rounded-lg p-1 border border-gray-200 dark:border-zinc-800">
                  <button 
                    onClick={() => quitar(item.id)} 
                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-800 rounded shadow-sm text-gray-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition-colors font-bold text-lg"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-gray-800 dark:text-zinc-100">{item.cantidad}</span>
                  <button 
                    onClick={() => agregar(item)} 
                    className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-800 rounded shadow-sm text-gray-600 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 transition-colors font-bold text-lg"
                  >
                    +
                  </button>
                </div>
                <p className="font-black text-gray-800 dark:text-white min-w-[80px] text-right">
                  Bs {(item.cantidad * item.precio).toFixed(2)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 p-6 transition-colors flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="w-full md:w-auto text-center md:text-left">
          <p className="text-gray-500 dark:text-zinc-400 text-sm font-medium uppercase tracking-wider mb-1">Total a pagar</p>
          <p className="text-4xl font-black text-gray-900 dark:text-white">Bs {total.toFixed(2)}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <button 
            onClick={vaciar} 
            className="px-6 py-3.5 rounded-xl font-bold text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-red-600 transition-colors"
          >
            Vaciar Carrito
          </button>
          <Link 
            href="/cliente/checkout" 
            className="px-8 py-3.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/30 transition-all hover:-translate-y-0.5 text-center flex-1 sm:flex-none"
          >
            Continuar al Pago 🚀
          </Link>
        </div>
      </div>
    </div>
  )
}