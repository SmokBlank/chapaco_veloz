'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { crearCliente } from '@/lib/supabase/cliente'
import { useCarrito } from '@/contexto/CarritoContexto'

type Producto = {
  id: number
  nombre: string
  descripcion: string
  precio: number
  categoria: 'platillo' | 'bebida' | 'extra'
  imagen_url: string | null
  disponible: boolean
}

function MenuClienteContent() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categoria, setCategoria] = useState<string>('todas')
  const [stocks, setStocks] = useState<Record<number, number>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const supabase = crearCliente()
  const { items, agregar } = useCarrito()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Cargar productos y calcular stock dinámicamente
  useEffect(() => {
    const cargarProductosYStock = async () => {
      setCargando(true)
      setError('')
      try {
        // 1. Cargar productos
        let consulta = supabase.from('productos').select('*').eq('disponible', true)
        if (categoria !== 'todas') consulta = consulta.eq('categoria', categoria)
        const { data: prods, error: err } = await consulta.order('categoria').order('nombre')
        if (err) throw err

        // 2. Cargar recetas e inventario actual
        const { data: recetasResult } = await supabase.from('recetas').select('*')
        const recetas = recetasResult || []
        const { data: inventario } = await supabase.from('inventario').select('*')

        const mapStocks: Record<number, number> = {}

        if (prods && inventario) {
          prods.forEach(prod => {
            const prodRecetas = (recetas || []).filter(r => r.producto_id === prod.id)
            if (prodRecetas.length > 0) {
              // Si el producto tiene receta, el stock es el mínimo disponible de sus ingredientes
              let minStock = Infinity
              prodRecetas.forEach(r => {
                const ingrediente = inventario.find(i => i.id === r.inventario_id)
                if (ingrediente) {
                  const disponible = Math.floor(Number(ingrediente.stock) / Number(r.cantidad))
                  if (disponible < minStock) {
                    minStock = disponible
                  }
                } else {
                  minStock = 0
                }
              })
              mapStocks[prod.id] = minStock === Infinity ? 0 : minStock
            } else {
              // Si no tiene receta, buscar un item en inventario con el mismo nombre (ej: gaseosas)
              const itemMatch = inventario.find(i => i.nombre.toLowerCase().trim() === prod.nombre.toLowerCase().trim())
              if (itemMatch) {
                mapStocks[prod.id] = Math.floor(Number(itemMatch.stock))
              } else {
                mapStocks[prod.id] = 99 // Por defecto si no está controlado en inventario
              }
            }
          })
        }

        setProductos(prods || [])
        setStocks(mapStocks)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setCargando(false)
      }
    }
    cargarProductosYStock()
  }, [categoria])

  // Auto-agregar producto después del login
  useEffect(() => {
    const autoAgregar = async () => {
      const productoId = searchParams.get('agregar')
      if (!productoId) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const prod = productos.find(p => p.id === Number(productoId))
      if (prod) {
        agregar({ id: prod.id, nombre: prod.nombre, precio: prod.precio })
      } else {
        const { data } = await supabase.from('productos').select('*').eq('id', productoId).single()
        if (data) {
          agregar({ id: data.id, text: data.nombre, precio: data.precio } as any)
        }
      }

      // Limpiar el parámetro 'agregar' de la URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('agregar')
      window.history.replaceState({}, '', newUrl.toString())
    }

    if (productos.length > 0) {
      autoAgregar()
    }
  }, [productos])

  if (cargando) return <p className="text-center p-8">Cargando menú...</p>
  if (error) return <p className="text-center p-8 text-red-500">Error: {error}</p>

  return (
    <div className="min-h-screen transition-colors pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gray-900 rounded-b-[3rem] shadow-2xl mb-10 border-b border-gray-800">
        <div className="absolute inset-0 z-0">
          <img 
            src="/login_imagen.png" 
            alt="Fondo Comida" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/80 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 sm:py-24 flex flex-col items-start justify-center">
          <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(220,38,38,0.5)]">Sabor Tradicional</span>
          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight mb-4 drop-shadow-lg">
            El verdadero sabor <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">Tarijeño</span>
          </h1>
          <p className="text-gray-300 text-lg sm:text-xl max-w-xl font-medium drop-shadow">Descubre nuestra exquisita selección de platillos preparados con los mejores ingredientes.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filtros por categoría */}
        <div className="flex flex-wrap gap-3 mb-10 justify-center sm:justify-start">
          {['todas', 'platillo', 'bebida', 'extra'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoria(cat)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-sm
                ${categoria === cat 
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-500/40 transform scale-105 ring-2 ring-red-500/20' 
                  : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-red-600 dark:hover:text-red-400'}
              `}
            >
              {cat === 'todas' ? 'Todo' : cat + 's'}
            </button>
          ))}
        </div>

        {/* Parrilla de productos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {productos.map(producto => {
            const stockDisp = stocks[producto.id] !== undefined ? stocks[producto.id] : 0
            const enCarrito = items.find(i => i.id === producto.id)?.cantidad || 0
            const agotado = stockDisp <= 0

            return (
              <div key={producto.id} className="group bg-white dark:bg-zinc-900 rounded-[2rem] shadow-lg hover:shadow-2xl hover:shadow-red-900/10 dark:hover:shadow-red-500/5 border border-gray-100 dark:border-zinc-800/60 overflow-hidden flex flex-col transition-all duration-500 transform hover:-translate-y-2">
                {/* Imagen del producto */}
                <div className="relative w-full h-56 overflow-hidden bg-gray-100 dark:bg-zinc-950">
                  {producto.imagen_url ? (
                    <img
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-zinc-800 transition-transform duration-700 group-hover:scale-110">
                      <span className="text-6xl drop-shadow-sm">🍽️</span>
                    </div>
                  )}
                  {/* Etiqueta flotante de categoría */}
                  <div className="absolute top-4 left-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm text-gray-800 dark:text-gray-200 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                    {producto.categoria}
                  </div>
                </div>

                {/* Información del producto */}
                <div className="p-6 flex flex-col flex-1 relative">
                  {/* Badge de stock flotante */}
                  <div className={`absolute -top-4 right-6 text-[10px] font-black px-3 py-1.5 rounded-full border tracking-widest uppercase shadow-md ${
                    agotado 
                      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' 
                      : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  }`}>
                    {agotado ? 'Agotado' : `Stock: ${stockDisp}`}
                  </div>
                  
                  <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight mb-2 mt-2">{producto.nombre}</h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 flex-1 line-clamp-3">{producto.descripcion}</p>

                  {/* Precio y botón Agregar */}
                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <span className="block text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Precio</span>
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500 dark:from-red-400 dark:to-orange-400">
                        Bs {producto.precio.toFixed(2)}
                      </span>
                    </div>
                    
                    <button
                      onClick={async () => {
                        const { data: { session } } = await supabase.auth.getSession()
                        if (!session) {
                          const loginUrl = new URL('/autenticacion/iniciar-sesion', window.location.origin)
                          loginUrl.searchParams.set('redirect', '/cliente/menu')
                          loginUrl.searchParams.set('agregar', producto.id.toString())
                          router.push(loginUrl.toString())
                        } else {
                          if (enCarrito >= stockDisp) {
                            alert(`Solo hay ${stockDisp} unidades disponibles de este producto y ya las agregaste al carrito.`)
                            return
                          }
                          agregar({ id: producto.id, nombre: producto.nombre, precio: producto.precio })
                        }
                      }}
                      disabled={agotado}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-90 ${
                        agotado
                          ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 cursor-not-allowed border dark:border-zinc-700'
                          : 'bg-red-600 text-white hover:bg-red-500 shadow-[0_5px_15px_rgba(220,38,38,0.3)] hover:shadow-[0_8px_20px_rgba(220,38,38,0.4)] group-hover:rotate-12'
                      }`}
                    >
                      {agotado ? '✕' : <span className="text-2xl leading-none font-light">+</span>}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {productos.length === 0 && (
          <div className="text-center bg-white dark:bg-zinc-900 rounded-3xl p-12 shadow-sm border border-gray-100 dark:border-zinc-800 mt-8">
            <span className="text-6xl mb-4 block">🔍</span>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No encontramos productos</p>
            <p className="text-gray-500 dark:text-zinc-400">Intenta buscar en otra categoría o vuelve más tarde.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MenuCliente() {
  return (
    <Suspense fallback={<p className="text-center p-8 text-zinc-500">Cargando menú...</p>}>
      <MenuClienteContent />
    </Suspense>
  )
}