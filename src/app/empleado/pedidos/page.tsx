'use client'

import { useEffect, useState, useRef } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type Pedido = {
  id: number
  cliente_id: string
  estado: string
  total: number
  metodo_entrega: string
  direccion_entrega: string | null
  metodo_pago: string
  creado_en: string
  perfiles: {
    nombre_completo: string
    telefono: string
  } | null
  items_pedido: {
    cantidad: number
    productos: { nombre: string } | null
  }[]
  pagos_qr?: {
    comprobante_url: string | null
  }[]
}

export default function TableroPedidosEmpleado() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalImagen, setModalImagen] = useState<string | null>(null)
  const supabase = crearCliente()
  const prevPedidosCount = useRef<number>(0)

  useEffect(() => {
    cargarPedidos()

    // Solicitar permiso para notificaciones del navegador
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Suscribirse a cambios en la tabla pedidos
    const canal = supabase
      .channel('pedidos-empleado')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, (payload) => {
        console.log('Cambio en pedidos:', payload)
        cargarPedidos(true) // recargar silenciosamente
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  const cargarPedidos = async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    try {
      // Solo traer los que no están entregados o cancelados
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id, cliente_id, estado, total, metodo_entrega, direccion_entrega, metodo_pago, creado_en,
          perfiles ( nombre_completo, telefono ),
          items_pedido ( cantidad, productos(nombre) ),
          pagos_qr ( comprobante_url )
        `)
        .not('estado', 'in', '("entregado", "cancelado")')
        .order('creado_en', { ascending: true })

      if (error) throw error

      if (data) {
        setPedidos(data as unknown as Pedido[])
        
        // Si hay un pedido nuevo, notificar
        if (silencioso && data.length > prevPedidosCount.current) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('¡Nuevo Pedido en Chapaco Veloz!', {
              body: 'Ha entrado un nuevo pedido para preparar.',
              icon: '/logo.png'
            })
          }
        }
        prevPedidosCount.current = data.length
      }
    } catch (err: any) {
      console.error('Error al cargar pedidos:', err.message)
    } finally {
      setCargando(false)
    }
  }

  const cambiarEstado = async (id: number, nuevoEstado: string, isQRValidation = false) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstado })
        .eq('id', id)

      if (error) throw error

      if (isQRValidation && nuevoEstado === 'preparando') {
        // También aprobar el pago en la tabla pagos_qr
        await supabase
          .from('pagos_qr')
          .update({ estado: 'aprobado' })
          .eq('pedido_id', id)
      } else if (isQRValidation && nuevoEstado === 'cancelado') {
        // Rechazar pago
        await supabase
          .from('pagos_qr')
          .update({ estado: 'rechazado' })
          .eq('pedido_id', id)
      }

      cargarPedidos(true)
    } catch (err: any) {
      alert('Error al cambiar estado: ' + err.message)
    }
  }

  // Filtrar pedidos por columnas
  const nuevasOrdenes = pedidos.filter(p => p.estado === 'pendiente_pago' || p.estado === 'pendiente')
  const enPreparacion = pedidos.filter(p => p.estado === 'preparando')
  const listos = pedidos.filter(p => p.estado === 'listo')

  const TarjetaPedido = ({ p }: { p: Pedido }) => (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm relative overflow-hidden group">
      {p.estado === 'pendiente_pago' && <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500"></div>}
      {p.estado === 'pendiente' && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>}
      {p.estado === 'preparando' && <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 animate-pulse"></div>}
      {p.estado === 'listo' && <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>}

      <div className="flex justify-between items-start mb-2">
        <span className="font-black text-lg text-gray-800 dark:text-white">#{p.id}</span>
        <span className="text-xs text-gray-500 font-medium">
          {new Date(p.creado_en).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>

      <div className="text-sm space-y-1 mb-3">
        <p className="font-bold text-gray-700 dark:text-zinc-300">👤 {p.perfiles?.nombre_completo}</p>
        <p className="text-gray-500 dark:text-zinc-400">📞 {p.perfiles?.telefono}</p>
        <p className="font-medium text-gray-800 dark:text-zinc-200">
          {p.metodo_entrega === 'delivery' ? '🛵 Delivery' : '🏪 Retiro Local'}
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-zinc-950 p-2 rounded-lg border border-gray-100 dark:border-zinc-800 mb-3">
        {p.items_pedido.map((item, idx) => (
          <div key={idx} className="flex justify-between text-xs text-gray-700 dark:text-zinc-300 py-1 border-b border-gray-200 dark:border-zinc-800 last:border-0">
            <span className="font-bold">{item.cantidad}x</span>
            <span className="truncate ml-2 flex-1">{item.productos?.nombre}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4">
        <span className="font-black text-red-600 dark:text-red-500">Bs {p.total.toFixed(2)}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {p.metodo_pago === 'qr' ? '📱 QR' : '💵 EFECTIVO'}
        </span>
      </div>

      {p.metodo_pago === 'qr' && p.pagos_qr && p.pagos_qr[0]?.comprobante_url && p.estado === 'pendiente_pago' && (
        <button 
          onClick={() => setModalImagen(p.pagos_qr![0].comprobante_url)}
          className="w-full mb-3 text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          🔍 Ver Comprobante QR
        </button>
      )}

      {/* Botones de Acción */}
      <div className="flex gap-2 mt-auto">
        {(p.estado === 'pendiente_pago' || p.estado === 'pendiente') && (
          <>
            <button onClick={() => cambiarEstado(p.id, 'preparando', p.metodo_pago === 'qr')} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-1 rounded-lg text-xs font-bold shadow-sm transition-colors text-center truncate">
              🍳 Aceptar & Preparar
            </button>
            <button onClick={() => cambiarEstado(p.id, 'cancelado', p.metodo_pago === 'qr')} className="bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 px-3 py-2 rounded-lg text-xs font-bold transition-colors">
              ❌
            </button>
          </>
        )}
        
        {p.estado === 'preparando' && (
          <button onClick={() => cambiarEstado(p.id, 'listo')} className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
            ✅ Marcar como Listo
          </button>
        )}

        {p.estado === 'listo' && (
          <button onClick={() => cambiarEstado(p.id, 'entregado')} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
            🚀 Entregar al Cliente
          </button>
        )}
      </div>
    </div>
  )

  if (cargando && pedidos.length === 0) return <div className="p-12 text-center text-gray-500">Cargando tablero...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-white">Tablero de Cocina 🍳</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm mt-1">
            Los pedidos aparecerán aquí automáticamente en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-xs font-bold text-green-500 uppercase tracking-wider">En Vivo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Columna 1: Nuevos */}
        <div className="bg-gray-50/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 min-h-[500px] flex flex-col">
          <h2 className="font-black text-gray-800 dark:text-white mb-4 flex justify-between items-center">
            NUEVOS PEDIDOS
            <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full text-xs">{nuevasOrdenes.length}</span>
          </h2>
          <div className="space-y-4 flex-1">
            {nuevasOrdenes.map(p => <TarjetaPedido key={p.id} p={p} />)}
            {nuevasOrdenes.length === 0 && (
              <div className="text-center py-10 text-gray-400 dark:text-zinc-600 text-sm border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl h-full flex items-center justify-center">
                Esperando pedidos...
              </div>
            )}
          </div>
        </div>

        {/* Columna 2: En Preparación */}
        <div className="bg-gray-50/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 min-h-[500px] flex flex-col">
          <h2 className="font-black text-gray-800 dark:text-white mb-4 flex justify-between items-center">
            EN PREPARACIÓN
            <span className="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full text-xs">{enPreparacion.length}</span>
          </h2>
          <div className="space-y-4 flex-1">
            {enPreparacion.map(p => <TarjetaPedido key={p.id} p={p} />)}
            {enPreparacion.length === 0 && (
              <div className="text-center py-10 text-gray-400 dark:text-zinc-600 text-sm border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl h-full flex items-center justify-center">
                Nada en cocina
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: Listos */}
        <div className="bg-gray-50/50 dark:bg-zinc-900/50 rounded-2xl p-4 border border-gray-100 dark:border-zinc-800 min-h-[500px] flex flex-col">
          <h2 className="font-black text-gray-800 dark:text-white mb-4 flex justify-between items-center">
            LISTOS PARA ENTREGA
            <span className="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full text-xs">{listos.length}</span>
          </h2>
          <div className="space-y-4 flex-1">
            {listos.map(p => <TarjetaPedido key={p.id} p={p} />)}
            {listos.length === 0 && (
              <div className="text-center py-10 text-gray-400 dark:text-zinc-600 text-sm border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl h-full flex items-center justify-center">
                No hay pedidos listos
              </div>
            )}
          </div>
        </div>

      </div>

      {modalImagen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 cursor-pointer" onClick={() => setModalImagen(null)}>
          <div className="relative max-w-4xl w-full h-[90vh] rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalImagen(null)} className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 text-white rounded-full w-10 h-10 font-bold z-10 transition-colors">✕</button>
            <img src={modalImagen} className="object-contain w-full h-full p-2 pt-16" alt="Comprobante" />
          </div>
        </div>
      )}
    </div>
  )
}
