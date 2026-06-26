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
    <div className="min-h-screen p-6 transition-colors">
      <h1 className="text-3xl font-bold text-red-700 dark:text-red-500 mb-6">Menú - Chapaco Veloz</h1>

      {/* Filtros por categoría */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['todas', 'platillo', 'bebida', 'extra'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoria(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors
              ${categoria === cat 
                ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/30' 
                : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800'}
            `}
          >
            {cat === 'todas' ? 'Todas' : cat.charAt(0).toUpperCase() + cat.slice(1) + 's'}
          </button>
        ))}
      </div>

      {/* Parrilla de productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {productos.map(producto => {
          const stockDisp = stocks[producto.id] !== undefined ? stocks[producto.id] : 0
          const enCarrito = items.find(i => i.id === producto.id)?.cantidad || 0
          const agotado = stockDisp <= 0

          return (
            <div key={producto.id} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-transparent dark:border-zinc-800 overflow-hidden flex flex-col hover:shadow-xl dark:hover:border-zinc-700 transition-all duration-300 transform hover:-translate-y-1">
              {/* Imagen del producto */}
              {producto.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="w-full h-48 object-cover border-b dark:border-zinc-800"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 dark:bg-zinc-950 flex items-center justify-center text-gray-400 dark:text-zinc-700 border-b dark:border-zinc-800">
                  <span className="text-5xl">🍽️</span>
                </div>
              )}

              {/* Información del producto */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-tight">{producto.nombre}</h2>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md border tracking-wider uppercase ${
                    agotado 
                      ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50' 
                      : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50'
                  }`}>
                    {agotado ? 'Agotado' : `Stock: ${stockDisp}`}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3 flex-1">{producto.descripcion}</p>
                
                <div className="mb-4">
                  <span className="inline-block bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-200 dark:border-red-900/50">
                    {producto.categoria}
                  </span>
                </div>

                {/* Precio y botón Agregar */}
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <span className="text-2xl font-black text-red-700 dark:text-red-500">Bs {producto.precio.toFixed(2)}</span>
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
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 ${
                      agotado
                        ? 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed border dark:border-zinc-700 shadow-none'
                        : 'bg-red-600 text-white hover:bg-red-500 shadow-red-600/30 hover:shadow-red-600/40'
                    }`}
                  >
                    {agotado ? 'Agotado' : 'Añadir'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {productos.length === 0 && (
        <div className="text-center text-gray-500 mt-12">
          <p className="text-xl">No hay productos en esta categoría.</p>
          <p className="text-sm mt-2">Intenta con otro filtro o vuelve más tarde.</p>
        </div>
      )}
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