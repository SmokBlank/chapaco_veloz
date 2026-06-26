'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type PagoQR = {
  id: number
  pedido_id: number
  monto: number
  comprobante_url: string | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  creado_en: string
  pedidos: {
    id: number
    total: number
    metodo_entrega: string
    cliente_id: string
    items_pedido?: {
      cantidad: number
      precio_unitario: number
      productos: { nombre: string } | null
    }[]
    perfiles: {
      nombre_completo: string
      telefono: string
    } | null
  } | null
}

export default function PagosQrAdmin() {
  const [pagos, setPagos] = useState<PagoQR[]>([])
  const [cargando, setCargando] = useState(true)
  const [modalImagen, setModalImagen] = useState<string | null>(null)
  const supabase = crearCliente()

  useEffect(() => {
    cargarPagos()
  }, [])

  const cargarPagos = async () => {
    setCargando(true)
    try {
      // 1. Obtener pagos y pedidos (sin perfiles)
      const { data, error } = await supabase
        .from('pagos_qr')
        .select(`
          id, pedido_id, monto, comprobante_url, estado, creado_en,
          pedidos (
            id, total, metodo_entrega, cliente_id,
            items_pedido (
              cantidad, precio_unitario,
              productos (nombre)
            )
          )
        `)
        .order('creado_en', { ascending: false })

      if (error) throw error

      // 2. Extraer todos los cliente_id únicos
      const clientesIds = new Set<string>()
      const pagosRaw = data || []
      
      pagosRaw.forEach((p: any) => {
        const pedidoObj = Array.isArray(p.pedidos) ? p.pedidos[0] : p.pedidos
        if (pedidoObj?.cliente_id) {
          clientesIds.add(pedidoObj.cliente_id)
        }
      })

      // 3. Obtener los perfiles manualmente
      let mapaPerfiles: Record<string, any> = {}
      if (clientesIds.size > 0) {
        const { data: perfilesData } = await supabase
          .from('perfiles')
          .select('id, nombre_completo, telefono')
          .in('id', Array.from(clientesIds))
        
        if (perfilesData) {
          perfilesData.forEach(perf => {
            mapaPerfiles[perf.id] = perf
          })
        }
      }

      // 4. Mapear todo junto
      const pagosMapeados: PagoQR[] = pagosRaw.map((p: any) => {
        const pedidoObj = Array.isArray(p.pedidos) ? p.pedidos[0] : p.pedidos
        const perfilObj = pedidoObj ? mapaPerfiles[pedidoObj.cliente_id] : null

        return {
          id: p.id,
          pedido_id: p.pedido_id,
          monto: p.monto,
          comprobante_url: p.comprobante_url,
          estado: p.estado,
          creado_en: p.creado_en,
          pedidos: pedidoObj ? {
            id: pedidoObj.id,
            total: pedidoObj.total,
            metodo_entrega: pedidoObj.metodo_entrega,
            cliente_id: pedidoObj.cliente_id,
            items_pedido: pedidoObj.items_pedido,
            perfiles: perfilObj ? {
              nombre_completo: perfilObj.nombre_completo,
              telefono: perfilObj.telefono
            } : null
          } : null
        }
      })

      setPagos(pagosMapeados)
    } catch (err: any) {
      console.error('Error al cargar pagos QR:', err.message)
    } finally {
      setCargando(false)
    }
  }

  const validarPago = async (pago: PagoQR, aprobado: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const adminId = session?.user?.id

      const nuevoEstadoPago = aprobado ? 'aprobado' : 'rechazado'
      const nuevoEstadoPedido = aprobado ? 'pendiente' : 'pendiente_pago'

      // 1. Actualizar pago_qr
      const { error: errPago } = await supabase
        .from('pagos_qr')
        .update({
          estado: nuevoEstadoPago,
          validado_por: adminId,
          validado_en: new Date().toISOString()
        })
        .eq('id', pago.id)

      if (errPago) throw errPago

      // 2. Actualizar pedido
      const { error: errPedido } = await supabase
        .from('pedidos')
        .update({ estado: nuevoEstadoPedido })
        .eq('id', pago.pedido_id)

      if (errPedido) throw errPedido

      // Recargar la lista
      cargarPagos()
    } catch (err: any) {
      alert('Error al validar el pago: ' + err.message)
    }
  }

  if (cargando) return <div className="p-6 text-center text-zinc-400">Cargando validaciones de pago...</div>

  const pendientes = pagos.filter(p => p.estado === 'pendiente')
  const completados = pagos.filter(p => p.estado !== 'pendiente')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Validación de Pagos QR</h1>
        <p className="text-zinc-400 text-sm">Aprueba o rechaza los comprobantes de pago QR subidos por los clientes.</p>
      </div>

      {/* Pagos Pendientes */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-500">
          ⏳ Pendientes de Aprobación ({pendientes.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendientes.map(p => (
            <div key={p.id} className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-yellow-500/10 text-yellow-500 text-xs px-2.5 py-1 rounded-full font-bold">
                    Pedido #{p.pedido_id}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(p.creado_en).toLocaleString()}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg text-white">Bs {p.monto.toFixed(2)}</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  👤 Cliente: {p.pedidos?.perfiles?.nombre_completo || 'Desconocido'}
                </p>
                <p className="text-sm text-zinc-400">
                  📞 Teléfono: {p.pedidos?.perfiles?.telefono || 'N/A'}
                </p>
                <p className="text-sm text-zinc-400 mb-2">
                  🛵 Entrega: {p.pedidos?.metodo_entrega === 'delivery' ? 'Delivery' : 'Local'}
                </p>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-1 max-h-32 overflow-y-auto">
                  <p className="text-xs font-bold text-zinc-300 uppercase mb-2 border-b border-zinc-800 pb-1">Detalle del Pedido</p>
                  {p.pedidos?.items_pedido?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-zinc-400">
                      <span>{item.cantidad}x {item.productos?.nombre || 'Producto'}</span>
                      <span>Bs {(item.cantidad * item.precio_unitario).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comprobante preview */}
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800 flex flex-col items-center gap-2">
                {p.comprobante_url ? (
                  <>
                    {p.comprobante_url.toLowerCase().includes('.pdf') ? (
                      <div 
                        className="h-32 bg-zinc-900 w-full flex flex-col items-center justify-center rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors"
                        onClick={() => setModalImagen(p.comprobante_url)}
                      >
                        <span className="text-4xl">📄</span>
                        <span className="text-xs text-zinc-400 mt-2">Documento PDF</span>
                      </div>
                    ) : (
                      <img
                        src={p.comprobante_url}
                        alt="Comprobante"
                        className="h-32 object-cover rounded-lg w-full cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setModalImagen(p.comprobante_url)}
                      />
                    )}
                    <button
                      onClick={() => setModalImagen(p.comprobante_url)}
                      className="text-xs text-blue-400 hover:underline font-medium"
                    >
                      🔍 {p.comprobante_url.toLowerCase().includes('.pdf') ? 'Abrir PDF' : 'Ampliar comprobante'}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-zinc-650 py-8">Cliente aún no ha subido comprobante</span>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={() => validarPago(p, true)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-xl text-sm transition-colors"
                >
                  ✅ Aprobar Pago
                </button>
                <button
                  onClick={() => validarPago(p, false)}
                  className="flex-1 bg-zinc-900 border border-zinc-850 hover:bg-red-950 hover:text-red-400 text-zinc-300 font-bold py-2 px-3 rounded-xl text-sm transition-all"
                >
                  ❌ Rechazar
                </button>
              </div>
            </div>
          ))}

          {pendientes.length === 0 && (
            <p className="text-zinc-500 text-sm py-4 md:col-span-2">No hay pagos QR pendientes.</p>
          )}
        </div>
      </section>

      {/* Historial de Validaciones */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-zinc-300">📋 Historial de Validaciones</h2>
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-zinc-500 uppercase tracking-wider text-xs border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Pedido</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Comprobante</th>
              </tr>
            </thead>
            <tbody>
              {completados.map(p => (
                <tr key={p.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/10">
                  <td className="py-3.5 px-4 font-bold text-white">#{p.pedido_id}</td>
                  <td className="py-3.5 px-4">
                    {p.pedidos?.perfiles?.nombre_completo || 'Desconocido'}
                  </td>
                  <td className="py-3.5 px-4 font-semibold">Bs {p.monto.toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-xs text-zinc-500">
                    {new Date(p.creado_en).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      p.estado === 'aprobado' ? 'bg-green-600/10 text-green-400' : 'bg-red-600/10 text-red-400'
                    }`}>
                      {p.estado.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {p.comprobante_url ? (
                      <button 
                        onClick={() => setModalImagen(p.comprobante_url)}
                        className="text-blue-400 hover:underline text-xs flex items-center justify-end gap-1"
                      >
                        {p.comprobante_url.toLowerCase().includes('.pdf') ? '📄 Ver PDF' : '🖼️ Ver Foto'}
                      </button>
                    ) : (
                      <span className="text-zinc-650 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {completados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-500">No hay validaciones en el historial.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal para ver comprobante ampliado */}
      {modalImagen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setModalImagen(null)}
        >
          <div className="relative max-w-4xl w-full h-[85vh] rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden" onClick={e => e.stopPropagation()}>
            {modalImagen.toLowerCase().includes('.pdf') ? (
              <iframe src={modalImagen} className="w-full h-full" />
            ) : (
              <img src={modalImagen} alt="Comprobante Grande" className="object-contain w-full h-full mx-auto" />
            )}
            <button
              onClick={() => setModalImagen(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}