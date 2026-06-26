'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type CajaChica = {
  id: number
  fecha_apertura: string
  monto_inicial: number
  cerrada: boolean
  monto_final: number | null
}

type MovimientoCaja = {
  id: number
  tipo: 'ingreso' | 'egreso'
  monto: number
  concepto: string
  creado_en: string
}

export default function CajaChicaAdmin() {
  const [caja, setCaja] = useState<CajaChica | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([])
  const [montoInicial, setMontoInicial] = useState(0)
  const [nuevoMovimiento, setNuevoMovimiento] = useState({ tipo: 'ingreso' as 'ingreso' | 'egreso', monto: 0, concepto: '' })
  const supabase = crearCliente()

  useEffect(() => { cargarCaja() }, [])

  const cargarCaja = async () => {
    const { data: cajaHoy, error } = await supabase.rpc('obtener_o_crear_caja_diaria')

    if (error || !cajaHoy) {
      console.error('Error al obtener/crear caja:', error)
      return
    }

    const cajaData = Array.isArray(cajaHoy) ? cajaHoy[0] : cajaHoy
    setCaja(cajaData)
    setMontoInicial(cajaData.monto_inicial)

    if (cajaData) {
      const { data: movs } = await supabase
        .from('movimientos_caja')
        .select('*')
        .eq('caja_chica_id', cajaData.id)
        .order('creado_en', { ascending: false })
      setMovimientos(movs || [])
    }
  }

  const actualizarMontoInicial = async () => {
    if (!caja) return
    const { error } = await supabase
      .from('caja_chica')
      .update({ monto_inicial: montoInicial })
      .eq('id', caja.id)
    if (!error) cargarCaja()
  }

  const agregarMovimiento = async () => {
    if (!caja || nuevoMovimiento.monto <= 0 || !nuevoMovimiento.concepto) return
    await supabase.from('movimientos_caja').insert({
      caja_chica_id: caja.id,
      tipo: nuevoMovimiento.tipo,
      monto: nuevoMovimiento.monto,
      concepto: nuevoMovimiento.concepto,
      creado_por: (await supabase.auth.getSession()).data.session?.user.id
    })
    setNuevoMovimiento({ tipo: 'ingreso', monto: 0, concepto: '' })
    cargarCaja()
  }

  const cerrarCaja = async () => {
    if (!caja) return
    const saldo = calcularSaldo()
    await supabase.from('caja_chica').update({ cerrada: true, monto_final: saldo }).eq('id', caja.id)
    cargarCaja()
  }

  const calcularSaldo = () => {
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
    const egresos = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
    return montoInicial + ingresos - egresos
  }

  if (!caja) {
    return <div className="p-12 text-center text-zinc-500 animate-pulse font-medium">Cargando caja chica...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Caja Chica del Día</h1>
        <p className="text-zinc-400 text-sm">Registra ingresos y egresos diarios.</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md">
          <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Monto inicial</p>
          <p className="text-3xl font-black text-white">Bs {caja.monto_inicial.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md">
          <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Saldo actual</p>
          <p className={`text-3xl font-black ${calcularSaldo() < 0 ? 'text-red-500' : 'text-green-400'}`}>
            Bs {calcularSaldo().toFixed(2)}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <p className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-2">Estado</p>
            <p className="text-xl font-bold text-white">{caja.cerrada ? '🔒 Cerrada' : '🔓 Abierta'}</p>
          </div>
          {!caja.cerrada && (
            <button onClick={cerrarCaja} className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors w-full">
              Cerrar caja hoy
            </button>
          )}
        </div>
      </div>

      {/* Actualizar monto inicial */}
      {!caja.cerrada && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2 text-zinc-300">Modificar monto inicial (Bs)</label>
            <input
              type="number" value={montoInicial} onChange={e => setMontoInicial(+e.target.value)}
              className="bg-zinc-950 border border-zinc-700 text-white p-2.5 rounded-xl w-full max-w-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={actualizarMontoInicial} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl transition-colors">
            Actualizar Inicial
          </button>
        </div>
      )}

      {/* Nuevo movimiento */}
      {!caja.cerrada && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md">
          <h2 className="text-xl font-bold mb-4 text-white">Registrar Movimiento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <select 
              value={nuevoMovimiento.tipo} 
              onChange={e => setNuevoMovimiento({...nuevoMovimiento, tipo: e.target.value as 'ingreso' | 'egreso'})}
              className="bg-zinc-950 border border-zinc-700 text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ingreso">🟢 Ingreso</option>
              <option value="egreso">🔴 Egreso</option>
            </select>
            <input 
              type="number" step="0.01" placeholder="Monto (Bs)" 
              value={nuevoMovimiento.monto || ''} 
              onChange={e => setNuevoMovimiento({...nuevoMovimiento, monto: +e.target.value})} 
              className="bg-zinc-950 border border-zinc-700 text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
            />
            <input 
              type="text" placeholder="Concepto o descripción" 
              value={nuevoMovimiento.concepto} 
              onChange={e => setNuevoMovimiento({...nuevoMovimiento, concepto: e.target.value})} 
              className="bg-zinc-950 border border-zinc-700 text-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-1" 
            />
            <button onClick={agregarMovimiento} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20">
              Registrar
            </button>
          </div>
        </div>
      )}

      {/* Lista de movimientos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-md overflow-hidden">
        <div className="p-4 bg-zinc-950 border-b border-zinc-800">
          <h3 className="font-bold text-zinc-300">Historial de Movimientos de Hoy</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="p-4 font-semibold">Hora</th>
                <th className="p-4 font-semibold">Tipo</th>
                <th className="p-4 font-semibold">Monto</th>
                <th className="p-4 font-semibold">Concepto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {movimientos.map(mov => (
                <tr key={mov.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 text-zinc-500">{new Date(mov.creado_en).toLocaleTimeString()}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${mov.tipo === 'ingreso' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {mov.tipo === 'ingreso' ? 'INGRES0' : 'EGRESO'}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-white">Bs {mov.monto.toFixed(2)}</td>
                  <td className="p-4">{mov.concepto}</td>
                </tr>
              ))}
              {movimientos.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-zinc-500">Sin movimientos registrados el día de hoy.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}