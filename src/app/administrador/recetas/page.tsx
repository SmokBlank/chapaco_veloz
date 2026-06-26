'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type Producto = {
  id: number
  nombre: string
  categoria: string
}

type ItemInventario = {
  id: number
  nombre: string
  unidad: string
}

type Receta = {
  id: number
  producto_id: number
  inventario_id: number
  cantidad: number
  inventario: {
    nombre: string
    unidad: string
  } | null
}

export default function RecetasAdmin() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [inventario, setInventario] = useState<ItemInventario[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [recetas, setRecetas] = useState<Receta[]>([])
  
  // Formulario agregar ingrediente
  const [ingredienteId, setIngredienteId] = useState<number>(0)
  const [cantidad, setCantidad] = useState<number>(0)
  const [cargando, setCargando] = useState(false)

  const supabase = crearCliente()

  useEffect(() => {
    cargarDatosInitiales()
  }, [])

  useEffect(() => {
    if (productoSeleccionado) {
      cargarReceta(productoSeleccionado.id)
    } else {
      setRecetas([])
    }
  }, [productoSeleccionado])

  const cargarDatosInitiales = async () => {
    try {
      const { data: prods } = await supabase.from('productos').select('id, nombre, categoria').order('nombre')
      const { data: inv } = await supabase.from('inventario').select('id, nombre, unidad').order('nombre')
      setProductos(prods || [])
      setInventario(inv || [])
    } catch (err: any) {
      console.error('Error al cargar datos iniciales:', err.message)
    }
  }

  const cargarReceta = async (productoId: number) => {
    try {
      const { data, error } = await supabase
        .from('recetas')
        .select(`
          id, producto_id, inventario_id, cantidad,
          inventario (nombre, unidad)
        `)
        .eq('producto_id', productoId)
      
      if (error) throw error

      const recetasMapeadas: Receta[] = (data || []).map((r: any) => {
        const invObj = Array.isArray(r.inventario) ? r.inventario[0] : r.inventario
        return {
          id: r.id,
          producto_id: r.producto_id,
          inventario_id: r.inventario_id,
          cantidad: r.cantidad,
          inventario: invObj ? {
            nombre: invObj.nombre,
            unidad: invObj.unidad
          } : null
        }
      })

      setRecetas(recetasMapeadas)
    } catch (err: any) {
      console.error('Error al cargar receta:', err.message)
    }
  }

  const agregarIngrediente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productoSeleccionado || ingredienteId <= 0 || cantidad <= 0) return
    setCargando(true)

    try {
      const { error } = await supabase
        .from('recetas')
        .insert({
          producto_id: productoSeleccionado.id,
          inventario_id: ingredienteId,
          cantidad: cantidad
        })
      
      if (error) {
        if (error.code === '23505') { // unique key violation
          alert('Este ingrediente ya está agregado en la receta de este producto.')
        } else {
          throw error
        }
      } else {
        setIngredienteId(0)
        setCantidad(0)
        cargarReceta(productoSeleccionado.id)
      }
    } catch (err: any) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  const eliminarIngrediente = async (recetaId: number) => {
    if (!confirm('¿Seguro que deseas eliminar este ingrediente de la receta?')) return
    try {
      const { error } = await supabase.from('recetas').delete().eq('id', recetaId)
      if (error) throw error
      if (productoSeleccionado) cargarReceta(productoSeleccionado.id)
    } catch (err: any) {
      alert('Error al eliminar ingrediente: ' + err.message)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Gestión de Recetas</h1>
        <p className="text-zinc-400 text-sm">Define qué ingredientes del inventario componen cada producto de la carta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Productos */}
        <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white mb-2">📋 Selecciona un Producto</h2>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {productos.map(p => {
              const seleccionado = productoSeleccionado?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setProductoSeleccionado(p)}
                  className={`
                    w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex justify-between items-center
                    ${seleccionado 
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/10' 
                      : 'bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 text-zinc-300 hover:text-white'}
                  `}
                >
                  <span>{p.nombre}</span>
                  <span className={`text-xs px-2 py-0.5 rounded uppercase ${
                    seleccionado ? 'bg-red-750 text-white' : 'bg-zinc-900 text-zinc-500'
                  }`}>
                    {p.categoria}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detalle y Edición de la Receta */}
        <div className="lg:col-span-2 space-y-6">
          {productoSeleccionado ? (
            <>
              {/* Receta Actual */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-1">
                  Receta de: <span className="text-red-500">{productoSeleccionado.nombre}</span>
                </h2>
                <p className="text-zinc-500 text-xs mb-6 uppercase tracking-wider">Ingredientes requeridos por porción</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="text-zinc-500 uppercase tracking-wider text-xs border-b border-zinc-800">
                      <tr>
                        <th className="py-2 px-2">Ingrediente</th>
                        <th className="py-2 px-2">Cantidad Necesaria</th>
                        <th className="py-2 px-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recetas.map(r => (
                        <tr key={r.id} className="border-b border-zinc-900/60">
                          <td className="py-3 px-2 font-semibold text-white">
                            {r.inventario?.nombre || 'Desconocido'}
                          </td>
                          <td className="py-3 px-2">
                            {r.cantidad} {r.inventario?.unidad}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => eliminarIngrediente(r.id)}
                              className="text-red-500 hover:text-red-400 font-semibold text-xs"
                            >
                              🗑️ Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {recetas.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-zinc-650">
                            Esta receta no tiene ingredientes configurados aún.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Formulario Agregar Ingrediente */}
              <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-4">➕ Agregar Ingrediente a la Receta</h3>
                <form onSubmit={agregarIngrediente} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Ingrediente</label>
                    <select
                      value={ingredienteId}
                      onChange={e => setIngredienteId(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-red-600"
                      required
                    >
                      <option value={0}>Selecciona...</option>
                      {inventario.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.nombre} ({item.unidad})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Cantidad</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="Ej: 0.300"
                      value={cantidad || ''}
                      onChange={e => setCantidad(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-red-600"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={cargando || ingredienteId <= 0 || cantidad <= 0}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                  >
                    {cargando ? 'Añadiendo...' : 'Añadir Ingrediente'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="bg-zinc-900/10 border border-dashed border-zinc-900 p-12 text-center rounded-2xl flex flex-col items-center justify-center h-full min-h-[300px]">
              <span className="text-4xl mb-4">🍳</span>
              <h3 className="font-bold text-lg text-zinc-300">Ningún Producto Seleccionado</h3>
              <p className="text-zinc-500 text-sm max-w-sm mt-1">Selecciona un plato de la lista izquierda para configurar sus ingredientes y recetas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
