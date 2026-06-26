'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { crearCliente } from '@/lib/supabase/cliente'
import QRCode from 'react-qr-code'
import { subirImagen as subirImagenAction } from '@/actions/upload'

type ItemPedido = {
  cantidad: number
  precio_unitario: number
  productos: {
    nombre: string
  } | null
}

type Pedido = {
  id: number
  estado: string
  total: number
  metodo_pago: string
  metodo_entrega: string
  creado_en: string
  items_pedido: ItemPedido[]
}

export default function PedidoDetalle() {
  const { id } = useParams()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [qrPago, setQrPago] = useState<any>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const supabase = crearCliente()

  useEffect(() => {
    const cargar = async () => {
      const { data: pedidoData, error: errPedido } = await supabase
        .from('pedidos')
        .select(`
          *,
          items_pedido (
            cantidad,
            precio_unitario,
            productos (
              nombre
            )
          )
        `)
        .eq('id', id)
        .single()
      
      if (errPedido) console.error(errPedido)
      setPedido(pedidoData)

      // Si el pago es QR, buscar el registro de pagos_qr
      if (pedidoData?.metodo_pago === 'qr') {
        const { data: qrData } = await supabase
          .from('pagos_qr')
          .select('*')
          .eq('pedido_id', id)
          .single()
        setQrPago(qrData)
      }
    }
    cargar()
  }, [id])

  const subirComprobante = async () => {
    if (!archivo || !pedido || !qrPago) return
    setSubiendo(true)
    setMensaje('')

    const nombreArchivo = `${pedido.id}/${Date.now()}_${archivo.name}`
    
    const formData = new FormData()
    formData.append('file', archivo)
    formData.append('bucket', 'comprobantes')
    formData.append('filename', nombreArchivo)

    const resultado = await subirImagenAction(formData)

    if (!resultado.exito) {
      setMensaje('Error al subir archivo: ' + resultado.error)
      setSubiendo(false)
      return
    }

    const publicUrl = resultado.url

    // Actualizar registro pagos_qr
    const { error: updateError } = await supabase
      .from('pagos_qr')
      .update({ comprobante_url: publicUrl })
      .eq('id', qrPago.id)

    if (updateError) {
      setMensaje('Error al guardar el comprobante en la base de datos: ' + updateError.message)
      setSubiendo(false)
      return
    }

    setArchivo(null)
    setMensaje('Comprobante subido. Espera la confirmación del restaurante.')
    setSubiendo(false)
    // Refrescar datos
    const { data: qrActualizado } = await supabase
      .from('pagos_qr')
      .select('*')
      .eq('id', qrPago.id)
      .single()
    setQrPago(qrActualizado)
  }

  if (!pedido) return <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center"><p className="text-gray-500 dark:text-zinc-500 animate-pulse font-medium">Cargando detalles de tu pedido...</p></div>

  // Muestra el Ticket si: pagó en caja O si pagó con QR y ya no está 'pendiente_pago'
  const mostrarTicket = pedido.metodo_pago === 'caja' || (pedido.metodo_pago === 'qr' && pedido.estado !== 'pendiente_pago')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 flex flex-col items-center transition-colors">
      <div className="w-full max-w-md animate-fade-in">
        
        {/* Cabecera del Estado */}
        <div className={`mb-6 p-5 rounded-2xl border flex items-center justify-between shadow-sm transition-colors ${
          pedido.estado === 'completado' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/50' :
          pedido.estado === 'cancelado' ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50' :
          pedido.estado === 'preparando' ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/50' :
          'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50'
        }`}>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Estado del Pedido</p>
            <p className={`text-xl font-black ${
              pedido.estado === 'completado' ? 'text-green-700' :
              pedido.estado === 'cancelado' ? 'text-red-700' :
              pedido.estado === 'preparando' ? 'text-orange-700' :
              'text-blue-700'
            }`}>
              {pedido.estado === 'pendiente_pago' ? 'Pendiente de Pago' : 
               pedido.estado === 'preparando' ? '👨‍🍳 Se está preparando' : 
               pedido.estado === 'completado' ? '✅ Entregado' : 
               pedido.estado.toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-zinc-500 font-medium">#{pedido.id}</p>
          </div>
        </div>

        {/* Flujo de Pago QR (Solo si no ha sido aprobado) */}
        {!mostrarTicket && pedido.metodo_pago === 'qr' && qrPago && pedido.estado === 'pendiente_pago' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-zinc-800 mb-6 text-center transition-colors">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Pago con QR</h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Escanea el siguiente código para pagar el total de <strong className="text-gray-900 dark:text-white text-lg">Bs {pedido.total.toFixed(2)}</strong></p>
            
            <div className="bg-white p-4 inline-block border-4 border-gray-100 dark:border-zinc-800 rounded-2xl mb-6 shadow-sm">
              <QRCode value={`monto:${pedido.total};pedido:${pedido.id}`} size={180} />
            </div>

            <div className="border-t border-gray-100 dark:border-zinc-800 pt-6 mt-2 text-left">
              {qrPago.comprobante_url ? (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 p-4 rounded-xl text-center">
                  <p className="font-bold text-lg mb-1">¡Comprobante enviado!</p>
                  <p className="text-sm">El cajero está revisando tu pago. En breve tu pedido comenzará a prepararse.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2">Sube tu comprobante (Foto o PDF)</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={e => setArchivo(e.target.files?.[0] || null)}
                      className="block w-full text-sm text-gray-500 dark:text-zinc-400
                        file:mr-4 file:py-3 file:px-5
                        file:rounded-xl file:border-0
                        file:text-sm file:font-bold
                        file:bg-red-50 file:text-red-700 dark:file:bg-red-900/20 dark:file:text-red-400
                        hover:file:bg-red-100 dark:hover:file:bg-red-900/40 transition-all cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={subirComprobante}
                    disabled={!archivo || subiendo}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-red-600/20"
                  >
                    {subiendo ? 'Subiendo archivo...' : 'Confirmar Pago'}
                  </button>
                  {mensaje && <p className="text-sm text-center font-medium text-blue-600 mt-2">{mensaje}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ticket Virtual (Cuando está pagado o es en caja) */}
        {mostrarTicket && (
          <div className="bg-[#fcfcfa] p-0 rounded-sm shadow-2xl w-full max-w-sm mx-auto overflow-hidden relative rotate-1 transition-transform hover:rotate-0 duration-300">
            {/* Ticket Header Decorator (jagged edge effect) */}
            <div className="w-full h-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSI2Ij48cGF0aCBkPSJNMCAwdjZsNi02bDYgNlYwSDB6IiBmaWxsPSIjZmNmY2ZhIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] absolute top-0 left-0 bg-repeat-x z-10" style={{ transform: 'rotate(180deg)' }}></div>
            
            <div className="p-8 pt-12 pb-12 bg-[#fcfcfa] text-black">
              {/* Logo / Title */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">CHAPACO VELOZ</h2>
                <p className="text-xs font-mono text-gray-500 mt-1 uppercase tracking-widest">Restaurante</p>
                <div className="w-12 h-0.5 bg-gray-200 mx-auto mt-4 mb-4"></div>
                <p className="text-xs font-mono text-gray-500">TICKET VIRTUAL DE VENTA</p>
                <p className="text-sm font-bold font-mono mt-1 text-gray-800">PEDIDO #{pedido.id}</p>
                <p className="text-xs font-mono text-gray-500 mt-1">{new Date(pedido.creado_en).toLocaleString()}</p>
              </div>

              {/* Items Table */}
              <div className="mb-6 font-mono text-sm border-t border-b border-dashed border-gray-300 py-4">
                <table className="w-full text-gray-700">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                      <th className="pb-2 font-normal">Cant</th>
                      <th className="pb-2 font-normal">Descripción</th>
                      <th className="pb-2 font-normal text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedido.items_pedido?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 align-top">{item.cantidad}x</td>
                        <td className="py-1.5 pr-2">{item.productos?.nombre || 'Producto'}</td>
                        <td className="py-1.5 text-right font-medium">Bs {(item.cantidad * item.precio_unitario).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>Bs {pedido.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-dashed border-gray-300 pt-3 mt-3">
                  <span>TOTAL</span>
                  <span>Bs {pedido.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-8 text-center space-y-2">
                <div className="inline-block px-3 py-1 bg-gray-100 rounded text-xs font-mono font-bold text-gray-600 uppercase">
                  {pedido.metodo_pago === 'qr' ? 'Pago verificado QR' : 'Pago pendiente en caja'}
                </div>
                <p className="text-xs text-gray-400 font-mono">
                  Entrega: {pedido.metodo_entrega === 'delivery' ? 'Delivery' : 'En el local'}
                </p>
                <p className="text-[10px] text-gray-400 font-mono mt-4">¡Gracias por su compra!</p>
              </div>
            </div>

            {/* Bottom jagged edge */}
            <div className="w-full h-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSI2Ij48cGF0aCBkPSJNMCAwdjZsNi02bDYgNlYwSDB6IiBmaWxsPSIjZmNmY2ZhIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] absolute bottom-0 left-0 bg-repeat-x z-10"></div>
          </div>
        )}

      </div>
    </div>
  )
}