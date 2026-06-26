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

export default function CajaChicaEmpleado() {
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
    return <div className="p-6 text-center text-zinc-500">Cargando caja chica...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Caja Chica</h1>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <p className="text-zinc-400 text-sm">Monto inicial</p>
          <p className="text-2xl font-bold">Bs {caja.monto_inicial}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <p className="text-zinc-400 text-sm">Saldo actual</p>
          <p className={`text-2xl font-bold ${calcularSaldo() < 0 ? 'text-red-500' : 'text-zinc-100'}`}>
            Bs {calcularSaldo()}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-sm">Estado</p>
            <p className="font-semibold">{caja.cerrada ? '🔒 Cerrada' : '🔓 Abierta'}</p>
          </div>
          {!caja.cerrada && (
            <button onClick={cerrarCaja} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
              Cerrar caja
            </button>
          )}
        </div>
      </div>

      {/* Actualizar monto inicial */}
      {!caja.cerrada && (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Monto inicial en caja</label>
            <input
              type="number" value={montoInicial} onChange={e => setMontoInicial(+e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-white p-2 rounded-lg w-32 focus:outline-none focus:border-red-500"
            />
          </div>
          <button onClick={actualizarMontoInicial} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Actualizar Inicial
          </button>
        </div>
      )}

      {/* Nuevo movimiento */}
      {!caja.cerrada && (
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-6">
          <h2 className="font-semibold mb-3 text-zinc-300">Registrar movimiento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select value={nuevoMovimiento.tipo} onChange={e => setNuevoMovimiento({...nuevoMovimiento, tipo: e.target.value as 'ingreso' | 'egreso'})}
              className="bg-zinc-950 border border-zinc-800 text-white p-2 rounded-lg focus:outline-none focus:border-red-500">
              <option value="ingreso">Ingreso (Entrada)</option>
              <option value="egreso">Egreso (Salida)</option>
            </select>
            <input type="number" placeholder="Monto (Bs)" value={nuevoMovimiento.monto || ''} onChange={e => setNuevoMovimiento({...nuevoMovimiento, monto: +e.target.value})} 
              className="bg-zinc-950 border border-zinc-800 text-white p-2 rounded-lg focus:outline-none focus:border-red-500" />
            <input type="text" placeholder="Concepto (ej. Pago proveedor)" value={nuevoMovimiento.concepto} onChange={e => setNuevoMovimiento({...nuevoMovimiento, concepto: e.target.value})} 
              className="bg-zinc-950 border border-zinc-800 text-white p-2 rounded-lg focus:outline-none focus:border-red-500" />
            <button onClick={agregarMovimiento} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-colors">
              Registrar
            </button>
          </div>
        </div>
      )}

      {/* Lista de movimientos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="p-4 font-medium">Hora</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium">Monto</th>
                <th className="p-4 font-medium">Concepto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {movimientos.map(mov => (
                <tr key={mov.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="p-4 text-zinc-500">{new Date(mov.creado_en).toLocaleTimeString()}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${mov.tipo === 'ingreso' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {mov.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-zinc-300">Bs {mov.monto}</td>
                  <td className="p-4 text-zinc-400">{mov.concepto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {movimientos.length === 0 && <p className="p-6 text-center text-zinc-500">Aún no hay movimientos registrados hoy.</p>}
      </div>
    </div>
  )
}
