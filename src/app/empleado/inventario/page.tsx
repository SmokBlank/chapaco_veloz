'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type ItemInventario = {
  id: number
  nombre: string
  unidad: string
  stock: number
  stock_minimo: number
}

type Movimiento = {
  id: number
  inventario_id: number
  tipo_movimiento: string
  cantidad: number
  motivo: string
  creado_en: string
  inventario: { nombre: string }
}

export default function InventarioEmpleado() {
  const [items, setItems] = useState<ItemInventario[]>([])
  const [conteos, setConteos] = useState<Record<number, string>>({})
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [mostrarMovimientos, setMostrarMovimientos] = useState(false)
  const [cargando, setCargando] = useState(false)
  const supabase = crearCliente()

  useEffect(() => {
    cargarInventario()
  }, [])

  const cargarInventario = async () => {
    setCargando(true)
    const { data } = await supabase.from('inventario').select('*').order('nombre')
    setItems(data || [])
    setConteos({})
    setCargando(false)
  }

  const cargarMovimientos = async () => {
    const { data } = await supabase
      .from('movimientos_inventario')
      .select('*, inventario(nombre)')
      .eq('tipo_movimiento', 'ajuste') // Solo mostrar ajustes por conteo
      .order('creado_en', { ascending: false })
      .limit(30)
    setMovimientos(data || [])
    setMostrarMovimientos(true)
  }

  const handleConteoChange = (id: number, value: string) => {
    setConteos(prev => ({ ...prev, [id]: value }))
  }

  const guardarConteo = async () => {
    if (Object.keys(conteos).length === 0) {
      alert('No has ingresado ningún conteo.')
      return
    }

    if (!confirm('¿Estás seguro de guardar este conteo de turno? Se ajustarán los stocks del sistema de forma permanente.')) {
      return
    }

    setCargando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userUuid = session?.user?.id

      let ajustesRealizados = 0

      for (const item of items) {
        if (conteos[item.id] === undefined || conteos[item.id] === '') continue

        const conteoFisico = parseFloat(conteos[item.id])
        if (isNaN(conteoFisico) || conteoFisico < 0) continue

        const diff = conteoFisico - item.stock
        
        // Solo registrar si hubo una diferencia entre lo físico y lo que decía el sistema
        if (diff !== 0) {
          const absDiff = Math.abs(diff)
          const tipoRpc = diff > 0 ? 'entrada' : 'salida'
          
          await supabase.from('movimientos_inventario').insert({
            inventario_id: item.id,
            tipo_movimiento: 'ajuste',
            cantidad: absDiff,
            motivo: `Conteo de turno (Físico: ${conteoFisico}, Sistema decía: ${item.stock})`,
            creado_por: userUuid
          })

          await supabase.rpc('actualizar_stock_inventario', {
            p_inventario_id: item.id,
            p_cantidad: absDiff,
            p_tipo: tipoRpc
          })

          ajustesRealizados++
        }
      }

      alert(`Conteo guardado exitosamente. Se realizaron ${ajustesRealizados} ajustes en el sistema.`)
      cargarInventario()
      if (mostrarMovimientos) cargarMovimientos()
      
    } catch (err: any) {
      alert('Error al guardar conteo: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Auditoría de Turno 📋</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Realiza el conteo físico de los insumos. Ingresa solo los que deseas auditar.
          </p>
        </div>
        <button
          onClick={guardarConteo}
          disabled={cargando || Object.keys(conteos).length === 0}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2"
        >
          {cargando ? 'Guardando...' : '💾 Guardar Conteo de Turno'}
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-800 dark:text-zinc-300">
            <thead className="bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-zinc-500 uppercase tracking-wider text-xs border-b border-gray-200 dark:border-zinc-800">
              <tr>
                <th className="py-4 px-6 font-semibold">Insumo</th>
                <th className="py-4 px-6 font-semibold text-center">Stock Teórico (Sistema)</th>
                <th className="py-4 px-6 font-semibold">Conteo Físico Real</th>
                <th className="py-4 px-6 font-semibold text-center">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
              {items.map(item => {
                const conteoStr = conteos[item.id]
                const haIngresado = conteoStr !== undefined && conteoStr !== ''
                const fisico = haIngresado ? parseFloat(conteoStr) : item.stock
                const dif = fisico - item.stock

                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-6 font-bold text-gray-900 dark:text-white">
                      {item.nombre}
                      <span className="block text-xs font-normal text-gray-400 dark:text-zinc-500">Unidad: {item.unidad}</span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-3 py-1 rounded font-mono font-bold">
                        {item.stock}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={String(item.stock)}
                          value={conteos[item.id] ?? ''}
                          onChange={e => handleConteoChange(item.id, e.target.value)}
                          className="w-24 bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-700 rounded-lg p-2 text-center font-bold text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-6 text-center">
                      {!haIngresado || dif === 0 ? (
                        <span className="text-gray-400 dark:text-zinc-600">-</span>
                      ) : (
                        <span className={`font-bold px-2 py-1 rounded text-xs ${
                          dif > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {dif > 0 ? '+' : ''}{dif.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial de Auditorías */}
      <div className="space-y-4 pt-6">
        <button
          onClick={mostrarMovimientos ? () => setMostrarMovimientos(false) : cargarMovimientos}
          className="text-sm font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1.5 focus:outline-none transition-colors"
        >
          {mostrarMovimientos ? '▲ Ocultar Historial de Ajustes' : '▼ Ver Historial de Ajustes de Turno'}
        </button>

        {mostrarMovimientos && (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-300">
                <thead className="bg-gray-50 dark:bg-zinc-950 text-gray-500 dark:text-zinc-500 uppercase tracking-wider text-xs border-b border-gray-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-6 font-semibold">Fecha / Hora</th>
                    <th className="py-3 px-6 font-semibold">Insumo</th>
                    <th className="py-3 px-6 font-semibold text-center">Ajuste</th>
                    <th className="py-3 px-6 font-semibold">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                  {movimientos.map(mov => (
                    <tr key={mov.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-6 text-gray-500 dark:text-zinc-400 text-xs">{new Date(mov.creado_en).toLocaleString()}</td>
                      <td className="py-3 px-6 font-bold text-gray-800 dark:text-zinc-200">{mov.inventario?.nombre || `ID ${mov.inventario_id}`}</td>
                      <td className="py-3 px-6 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          mov.motivo.includes('Físico:') && parseFloat(mov.motivo.split('Físico: ')[1]) > parseFloat(mov.motivo.split('Sistema decía: ')[1]) 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {mov.cantidad}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-xs text-gray-500 dark:text-zinc-400">{mov.motivo}</td>
                    </tr>
                  ))}
                  {movimientos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-zinc-500">No hay ajustes de turno registrados recientemente.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
