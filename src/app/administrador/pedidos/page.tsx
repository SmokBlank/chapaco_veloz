'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type Pedido = {
  id: number
  cliente_id: string
  estado: string
  metodo_entrega: string
  direccion_entrega: string | null
  metodo_pago: string
  total: number
  creado_en: string
  perfiles: { nombre_completo: string; telefono: string } | null
}

type ItemPedido = {
  id: number
  pedido_id: number
  producto_id: number
  cantidad: number
  precio_unitario: number
  productos: {
    nombre: string
  } | null
}

export default function PedidosAdmin() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [itemsPedido, setItemsPedido] = useState<Record<number, ItemPedido[]>>({})
  const [pedidoExpandido, setPedidoExpandido] = useState<number | null>(null)
  const supabase = crearCliente()

  useEffect(() => { 
    cargarPedidos() 
  }, [])

  const cargarPedidos = async () => {
    // 1. Obtener pedidos
    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select('*')
      .order('creado_en', { ascending: false })
    
    if (!pedidosData) {
      setPedidos([])
      return
    }

    // 2. Obtener perfiles manualmente para evitar errores de foreign key
    const clientesIds = [...new Set(pedidosData.map(p => p.cliente_id).filter(Boolean))]
    let mapaPerfiles: Record<string, any> = {}
    
    if (clientesIds.length > 0) {
      const { data: perfilesData } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, telefono')
        .in('id', clientesIds)
      
      if (perfilesData) {
        perfilesData.forEach(perf => {
          mapaPerfiles[perf.id] = perf
        })
      }
    }

    // 3. Mapear
    const mapeados = pedidosData.map(p => ({
      ...p,
      perfiles: mapaPerfiles[p.cliente_id] || null
    }))

    setPedidos(mapeados)
  }

  const cargarItems = async (pedidoId: number) => {
    if (itemsPedido[pedidoId]) {
      // Ya están cargados
      setPedidoExpandido(pedidoExpandido === pedidoId ? null : pedidoId)
      return
    }

    const { data, error } = await supabase
      .from('items_pedido')
      .select('*, productos(nombre)')
      .eq('pedido_id', pedidoId)
    
    if (!error && data) {
      setItemsPedido(prev => ({ ...prev, [pedidoId]: data }))
      setPedidoExpandido(pedidoId)
    }
  }

  const cambiarEstado = async (pedidoId: number, nuevoEstado: string) => {
    await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', pedidoId)
    cargarPedidos()
  }

  const getBadgeColor = (estado: string) => {
    const map: Record<string, string> = {
      pendiente_pago: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
      pendiente: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      en_preparacion: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      listo: 'bg-green-500/10 text-green-400 border border-green-500/20',
      entregado: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
      cancelado: 'bg-red-500/10 text-red-400 border border-red-500/20'
    }
    return map[estado] || 'bg-zinc-800 text-zinc-300'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Gestión de Pedidos</h1>
          <p className="text-zinc-400 text-sm">Monitorea y despacha las comandas de los clientes en tiempo real.</p>
        </div>
        <button
          onClick={cargarPedidos}
          className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 px-5 rounded-xl text-sm transition-colors cursor-pointer"
        >
          🔄 Actualizar Lista
        </button>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-zinc-500 uppercase tracking-wider text-xs border-b border-zinc-800 bg-zinc-950/20">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Entrega</th>
                <th className="py-3 px-4">Pago</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-center">Detalle</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map(pedido => {
                const esExpandido = pedidoExpandido === pedido.id
                return (
                  <>
                    {/* Fila principal del pedido */}
                    <tr key={pedido.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/10 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-center text-zinc-550">#{pedido.id}</td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-white leading-tight">
                          {pedido.perfiles?.nombre_completo || 'Desconocido'}
                        </p>
                        <span className="text-xs text-zinc-500">{pedido.perfiles?.telefono || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-4 font-extrabold text-white">Bs {pedido.total}</td>
                      <td className="py-4 px-4">
                        {pedido.metodo_entrega === 'local' ? (
                          <span className="text-xs font-semibold text-zinc-300">🏠 Retiro Local</span>
                        ) : (
                          <div>
                            <span className="text-xs font-semibold text-red-400">🛵 Delivery</span>
                            {pedido.direccion_entrega && (
                              <div className="mt-1">
                                {(() => {
                                  try {
                                    const loc = JSON.parse(pedido.direccion_entrega)
                                    if (loc.lat && loc.lng) {
                                      return (
                                        <div className="space-y-1">
                                          <a 
                                            href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                                            target="_blank" rel="noreferrer"
                                            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium bg-blue-500/10 w-max px-2 py-0.5 rounded-full"
                                          >
                                            🗺️ Ver en Google Maps
                                          </a>
                                          {loc.referencia && <p className="text-[11px] text-zinc-400 max-w-xs leading-tight">Ref: {loc.referencia}</p>}
                                        </div>
                                      )
                                    }
                                  } catch (e) {}
                                  return <p className="text-[11px] text-zinc-500 truncate max-w-xs">{pedido.direccion_entrega}</p>
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold">
                        {pedido.metodo_pago === 'qr' ? '📱 Pago QR' : '💵 Pagar en Caja'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${getBadgeColor(pedido.estado)}`}>
                          {pedido.estado.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-zinc-500">
                        {new Date(pedido.creado_en).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => cargarItems(pedido.id)}
                          className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        >
                          {esExpandido ? '▲ Ocultar' : '▼ Ver Platos'}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <select
                          value={pedido.estado}
                          onChange={e => cambiarEstado(pedido.id, e.target.value)}
                          className="bg-zinc-950 border border-zinc-850 hover:border-zinc-750 text-zinc-300 text-xs font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-600"
                        >
                          <option value="pendiente_pago">Pendiente pago</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="en_preparacion">En preparación</option>
                          <option value="listo">Listo</option>
                          <option value="entregado">Entregado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                    
                    {/* Collapsible details table row */}
                    {esExpandido && (
                      <tr className="bg-zinc-950/40">
                        <td colSpan={9} className="py-4 px-8 border-b border-zinc-900 bg-zinc-950/20">
                          <div className="border-l-2 border-red-600 pl-4 py-1 space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">Comanda del Pedido #{pedido.id}</h4>
                            <div className="max-w-xl">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-zinc-550 border-b border-zinc-900">
                                    <th className="pb-1 font-semibold">Plato / Bebida</th>
                                    <th className="pb-1 text-center font-semibold">Cantidad</th>
                                    <th className="pb-1 text-right font-semibold">Precio Unitario</th>
                                    <th className="pb-1 text-right font-semibold">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {itemsPedido[pedido.id]?.map(item => (
                                    <tr key={item.id} className="border-b border-zinc-900/40 text-zinc-300">
                                      <td className="py-2 text-white font-medium">
                                        {item.productos?.nombre || 'Producto cargando...'}
                                      </td>
                                      <td className="py-2 text-center font-bold">
                                        {item.cantidad}
                                      </td>
                                      <td className="py-2 text-right">
                                        Bs {item.precio_unitario}
                                      </td>
                                      <td className="py-2 text-right font-semibold text-white">
                                        Bs {(item.cantidad * item.precio_unitario).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
          {pedidos.length === 0 && (
            <p className="p-6 text-center text-zinc-500">No hay registros de pedidos aún.</p>
          )}
        </div>
      </div>
    </div>
  )
}