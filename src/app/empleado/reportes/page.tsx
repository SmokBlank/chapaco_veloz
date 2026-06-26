'use client'

import { useState, useEffect } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type ReporteDiario = {
  ventasTotales: number
  cantidadPedidos: number
  cajaSaldo: number
  pedidos: any[]
  movimientosCaja: any[]
}

export default function ReporteDiaEmpleado() {
  const [cargando, setCargando] = useState(false)
  const [datos, setDatos] = useState<ReporteDiario | null>(null)
  const supabase = crearCliente()

  useEffect(() => {
    generarReporteDia()
  }, [])

  const generarReporteDia = async () => {
    setCargando(true)
    try {
      const hoy = new Date()
      // Desde el inicio del día
      const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
      const isoFechaInicio = fechaInicio.toISOString()

      // 1. Obtener pedidos del día
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, total, creado_en, estado, perfiles!cliente_id(nombre_completo)')
        .gte('creado_en', isoFechaInicio)
        .neq('estado', 'cancelado')

      const listPedidos = pedidos || []
      const ventasTotales = listPedidos.reduce((sum, p) => sum + Number(p.total), 0)

      // 2. Obtener movimientos de caja chica del día
      const { data: movimientosCaja } = await supabase
        .from('movimientos_caja')
        .select('id, tipo, monto, concepto, creado_en')
        .gte('creado_en', isoFechaInicio)
      
      const listMovs = movimientosCaja || []
      const ingresosCaja = listMovs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
      const egresosCaja = listMovs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto), 0)
      const cajaSaldo = ingresosCaja - egresosCaja

      setDatos({
        ventasTotales,
        cantidadPedidos: listPedidos.length,
        cajaSaldo,
        pedidos: listPedidos,
        movimientosCaja: listMovs
      })

    } catch (err: any) {
      alert('Error al generar reporte: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reporte del Día</h1>
          <p className="text-zinc-400 text-sm">Resumen de operaciones y caja de la jornada actual.</p>
        </div>
        <button
          onClick={generarReporteDia}
          disabled={cargando}
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-medium py-2.5 px-5 rounded-xl text-sm transition-colors cursor-pointer"
        >
          {cargando ? 'Actualizando...' : '🔄 Actualizar Datos'}
        </button>
      </div>

      {!datos && cargando && (
        <div className="p-12 text-center text-zinc-500">Cargando reporte...</div>
      )}

      {datos && (
        <div className="space-y-8">
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
              <span className="text-zinc-400 text-xs font-semibold block mb-2 uppercase tracking-wider">Ventas de Hoy</span>
              <p className="text-3xl font-black text-white">Bs {datos.ventasTotales.toFixed(2)}</p>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <span className="text-zinc-400 text-xs font-semibold block mb-2 uppercase tracking-wider">Pedidos Completados</span>
              <p className="text-3xl font-black text-white">{datos.cantidadPedidos}</p>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
              <span className="text-zinc-400 text-xs font-semibold block mb-2 uppercase tracking-wider">Caja (Saldo Neto Hoy)</span>
              <p className="text-3xl font-black text-white">Bs {datos.cajaSaldo.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Lista de Pedidos Rápidos */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-zinc-800 bg-zinc-950/50">
                <h3 className="font-bold text-white">Últimos Pedidos</h3>
              </div>
              <div className="p-5 flex-1 overflow-auto max-h-96 space-y-3">
                {datos.pedidos.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">No hay pedidos registrados hoy.</p>
                ) : (
                  datos.pedidos.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">Pedido #{p.id}</p>
                        <p className="text-xs text-zinc-500">{new Date(p.creado_en).toLocaleTimeString()} - {p.estado}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-green-400">Bs {Number(p.total).toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lista de Movimientos de Caja */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-zinc-800 bg-zinc-950/50">
                <h3 className="font-bold text-white">Movimientos de Caja</h3>
              </div>
              <div className="p-5 flex-1 overflow-auto max-h-96 space-y-3">
                {datos.movimientosCaja.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">Sin movimientos en caja hoy.</p>
                ) : (
                  datos.movimientosCaja.map(m => (
                    <div key={m.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{m.concepto}</p>
                        <p className="text-xs text-zinc-500">{new Date(m.creado_en).toLocaleTimeString()}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${m.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                          {m.tipo === 'ingreso' ? '+' : '-'} Bs {Number(m.monto).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
