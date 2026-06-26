'use client'

import { useState } from 'react'
import { useCarrito } from '@/contexto/CarritoContexto'
import { crearCliente } from '@/lib/supabase/cliente'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const MapSelectorDynamic = dynamic(() => import('@/components/MapSelector'), { ssr: false })

export default function Checkout() {
  const { items, total, vaciar } = useCarrito()
  const [metodoEntrega, setMetodoEntrega] = useState<'local' | 'delivery'>('local')
  const [ubicacion, setUbicacion] = useState<{lat: number, lng: number} | null>(null)
  const [referencia, setReferencia] = useState('')
  const [metodoPago, setMetodoPago] = useState<'caja' | 'qr'>('caja')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = crearCliente()

  const realizarPedido = async () => {
    if (items.length === 0) return
    setCargando(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/autenticacion/iniciar-sesion')
        return
      }

      // 1. Cargar recetas e inventario para validar disponibilidad
      // Si la tabla 'recetas' no existe (404), usamos un arreglo vacío por defecto.
      const { data: recetasResult } = await supabase.from('recetas').select('*')
      const recetas = recetasResult || []
      
      const { data: inventario } = await supabase.from('inventario').select('*')

      if (!inventario) {
        setError('Error de comunicación con el inventario. Inténtalo de nuevo.')
        setCargando(false)
        return
      }

      // 2. Calcular demanda consolidada para cada item del inventario
      const demanda: Record<number, { nombre: string; cantidad: number; unidad: string }> = {}

      for (const item of items) {
        const prodRecetas = recetas.filter(r => r.producto_id === item.id)
        if (prodRecetas.length > 0) {
          // Si el plato tiene receta, sumar la demanda para cada ingrediente
          for (const r of prodRecetas) {
            const invItem = inventario.find(i => i.id === r.inventario_id)
            if (!invItem) continue
            const totalCant = item.cantidad * Number(r.cantidad)
            if (!demanda[r.inventario_id]) {
              demanda[r.inventario_id] = { nombre: invItem.nombre, cantidad: 0, unidad: invItem.unidad }
            }
            demanda[r.inventario_id].cantidad += totalCant
          }
        } else {
          // Si es bebida o extra directo sin receta, buscar por nombre coincidente
          const invItem = inventario.find(i => i.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim())
          if (invItem) {
            if (!demanda[invItem.id]) {
              demanda[invItem.id] = { nombre: invItem.nombre, cantidad: 0, unidad: invItem.unidad }
            }
            demanda[invItem.id].cantidad += item.cantidad
          }
        }
      }

      // 3. Verificar si hay existencias suficientes para satisfacer la demanda
      const erroresStock: string[] = []
      for (const [id, req] of Object.entries(demanda)) {
        const invItem = inventario.find(i => i.id === Number(id))
        if (!invItem || Number(invItem.stock) < req.cantidad) {
          const stockActual = invItem ? Number(invItem.stock) : 0
          erroresStock.push(
            `Falta stock de "${req.nombre}". Requerido: ${req.cantidad} ${req.unidad}, Disponible: ${stockActual} ${req.unidad}`
          )
        }
      }

      if (erroresStock.length > 0) {
        setError(erroresStock.join(' | '))
        setCargando(false)
        return
      }

      // 4. Crear el registro del Pedido
      const estadoInicial = metodoPago === 'qr' ? 'pendiente_pago' : 'pendiente'
      const { data: pedido, error: errorPedido } = await supabase
        .from('pedidos')
        .insert({
          cliente_id: session.user.id,
          estado: estadoInicial,
          metodo_entrega: metodoEntrega,
          direccion_entrega: metodoEntrega === 'delivery' 
            ? JSON.stringify({ lat: ubicacion?.lat, lng: ubicacion?.lng, referencia }) 
            : null,
          metodo_pago: metodoPago,
          total
        })
        .select('id')
        .single()

      if (errorPedido || !pedido) {
        setError(errorPedido?.message || 'Error al registrar el pedido.')
        setCargando(false)
        return
      }

      // 5. Registrar el desglose de productos (items_pedido)
      const itemsInsert = items.map(item => ({
        pedido_id: pedido.id,
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio
      }))

      const { error: errorItems } = await supabase.from('items_pedido').insert(itemsInsert)
      if (errorItems) {
        setError(errorItems.message)
        setCargando(false)
        return
      }

      // 6. Si el método de pago es QR, crear registro en pagos_qr
      if (metodoPago === 'qr') {
        await supabase.from('pagos_qr').insert({
          pedido_id: pedido.id,
          monto: total,
          estado: 'pendiente'
        })
      }

      // 7. Descontar stock y registrar movimientos de inventario por venta
      for (const [id, req] of Object.entries(demanda)) {
        // Registrar movimiento del inventario
        await supabase.from('movimientos_inventario').insert({
          inventario_id: Number(id),
          tipo_movimiento: 'venta',
          cantidad: req.cantidad,
          motivo: `Venta en pedido #${pedido.id}`,
          pedido_id: pedido.id,
          creado_por: session.user.id
        })

        // Restar el stock físicamente usando el RPC de la base de datos
        await supabase.rpc('actualizar_stock_inventario', {
          p_inventario_id: Number(id),
          p_cantidad: req.cantidad,
          p_tipo: 'salida'
        })
      }

      // 8. Vaciar carrito local y redirigir a ver el pedido
      vaciar()
      router.push(`/cliente/pedido/${pedido.id}`)

    } catch (err: any) {
      setError('Ocurrió un error inesperado al procesar el checkout: ' + err.message)
      setCargando(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 min-h-screen transition-colors animate-fade-in pb-24">
      <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-6">Confirmar Pedido</h1>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-800 mb-6 transition-colors">
        <h2 className="font-bold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <span>📋</span> Resumen de compra
        </h2>
        <div className="space-y-2 mb-4">
          {items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-zinc-400">{item.cantidad}x {item.nombre}</span>
              <span className="font-medium text-gray-800 dark:text-zinc-200">Bs {(item.cantidad * item.precio).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 flex justify-between items-center">
          <span className="font-bold text-gray-600 dark:text-zinc-400">Total a pagar:</span>
          <span className="font-black text-2xl text-red-600 dark:text-red-500">Bs {total.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-800 mb-6 transition-colors">
        <h2 className="font-bold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <span>📍</span> Método de entrega
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          <label className={`
            flex items-center p-4 border rounded-xl cursor-pointer transition-all
            ${metodoEntrega === 'local' 
              ? 'border-red-600 bg-red-50/50 dark:bg-red-950/20 ring-1 ring-red-600' 
              : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 bg-gray-50/50 dark:bg-zinc-800/50'}
          `}>
            <input type="radio" name="entrega" checked={metodoEntrega === 'local'} onChange={() => setMetodoEntrega('local')} className="hidden" />
            <span className="text-xl mr-3">🏪</span>
            <div>
              <p className="font-bold text-gray-800 dark:text-zinc-100 text-sm">Retiro en local</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Pasa a recoger tu pedido</p>
            </div>
          </label>
          
          <label className={`
            flex items-center p-4 border rounded-xl cursor-pointer transition-all
            ${metodoEntrega === 'delivery' 
              ? 'border-red-600 bg-red-50/50 dark:bg-red-950/20 ring-1 ring-red-600' 
              : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 bg-gray-50/50 dark:bg-zinc-800/50'}
          `}>
            <input type="radio" name="entrega" checked={metodoEntrega === 'delivery'} onChange={() => setMetodoEntrega('delivery')} className="hidden" />
            <span className="text-xl mr-3">🛵</span>
            <div>
              <p className="font-bold text-gray-800 dark:text-zinc-100 text-sm">Delivery</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Te lo llevamos a casa</p>
            </div>
          </label>
        </div>
        {metodoEntrega === 'delivery' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl space-y-4 animate-fade-in">
            <h3 className="font-bold text-sm text-gray-800 dark:text-zinc-200">Ubicación de entrega</h3>
            <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm">
              <MapSelectorDynamic onChange={setUbicacion} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1">Referencias de tu casa (Opcional)</label>
              <input
                type="text" 
                placeholder="Ej: Portón negro de madera, al lado de la tienda..." 
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                className="w-full p-3 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-800 mb-6 transition-colors">
        <h2 className="font-bold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2">
          <span>💳</span> Método de pago
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={`
            flex items-center p-4 border rounded-xl cursor-pointer transition-all
            ${metodoPago === 'caja' 
              ? 'border-red-600 bg-red-50/50 dark:bg-red-950/20 ring-1 ring-red-600' 
              : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 bg-gray-50/50 dark:bg-zinc-800/50'}
          `}>
            <input type="radio" name="pago" checked={metodoPago === 'caja'} onChange={() => setMetodoPago('caja')} className="hidden" />
            <span className="text-xl mr-3">💵</span>
            <div>
              <p className="font-bold text-gray-800 dark:text-zinc-100 text-sm">Pagar en caja / Efectivo</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Pagas al recibir/recoger</p>
            </div>
          </label>
          
          <label className={`
            flex items-center p-4 border rounded-xl cursor-pointer transition-all
            ${metodoPago === 'qr' 
              ? 'border-red-600 bg-red-50/50 dark:bg-red-950/20 ring-1 ring-red-600' 
              : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 bg-gray-50/50 dark:bg-zinc-800/50'}
          `}>
            <input type="radio" name="pago" checked={metodoPago === 'qr'} onChange={() => setMetodoPago('qr')} className="hidden" />
            <span className="text-xl mr-3">📱</span>
            <div>
              <p className="font-bold text-gray-800 dark:text-zinc-100 text-sm">Transferencia QR</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Pago rápido y seguro</p>
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs mb-4">
          {error}
        </div>
      )}

      <div className="sticky bottom-4 mt-8">
        <button
          onClick={realizarPedido}
          disabled={cargando || (metodoEntrega === 'delivery' && !ubicacion) || items.length === 0}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white p-4 rounded-xl font-black text-lg transition-all shadow-xl shadow-red-600/30 flex justify-center items-center gap-2"
        >
          {cargando ? (
            <><span className="animate-spin">⏳</span> Procesando...</>
          ) : (
            <>Confirmar Pedido <span className="text-xl">🚀</span></>
          )}
        </button>
      </div>
    </div>
  )
}