'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type Empleado = {
  id: number
  nombre_completo: string
  cargo: string
  salario_diario: number
  activo: boolean
}

type Pago = {
  id: number
  empleado_id: number
  monto: number
  fecha_pago: string
  empleado: { nombre_completo: string }
}

export default function EmpleadosAdmin() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [editando, setEditando] = useState<Empleado | null>(null)
  const [form, setForm] = useState({ nombre_completo: '', cargo: 'mesero', salario_diario: 0 })
  const [pagoForm, setPagoForm] = useState({ empleado_id: 0, monto: 0, fecha_pago: new Date().toISOString().split('T')[0] })
  const [mostrarPagos, setMostrarPagos] = useState(false)
  const supabase = crearCliente()

  useEffect(() => { cargarEmpleados() }, [])

  const cargarEmpleados = async () => {
    const { data } = await supabase.from('empleados').select('*').order('nombre_completo')
    setEmpleados(data || [])
  }

  const cargarPagos = async () => {
    const { data } = await supabase
      .from('pagos_empleados')
      .select('*, empleado:empleado_id(nombre_completo)')
      .order('fecha_pago', { ascending: false })
    setPagos(data || [])
    setMostrarPagos(true)
  }

  const guardarEmpleado = async () => {
    if (editando) {
      await supabase.from('empleados').update(form).eq('id', editando.id)
    } else {
      await supabase.from('empleados').insert(form)
    }
    setEditando(null)
    setForm({ nombre_completo: '', cargo: 'mesero', salario_diario: 0 })
    cargarEmpleados()
  }

  const editar = (emp: Empleado) => {
    setEditando(emp)
    setForm({ nombre_completo: emp.nombre_completo, cargo: emp.cargo, salario_diario: emp.salario_diario })
  }

  const toggleActivo = async (emp: Empleado) => {
    await supabase.from('empleados').update({ activo: !emp.activo }).eq('id', emp.id)
    cargarEmpleados()
  }

  const registrarPago = async () => {
    if (!pagoForm.empleado_id || pagoForm.monto <= 0) return
    await supabase.from('pagos_empleados').insert({
      empleado_id: pagoForm.empleado_id,
      monto: pagoForm.monto,
      fecha_pago: pagoForm.fecha_pago,
      creado_por: (await supabase.auth.getSession()).data.session?.user.id
    })
    setPagoForm({ empleado_id: 0, monto: 0, fecha_pago: new Date().toISOString().split('T')[0] })
    cargarPagos()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Personal</h1>
        <p className="text-zinc-400 text-sm">Gestiona el personal y registra sus pagos.</p>
      </div>

      {/* Formulario empleado */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md">
        <h2 className="text-xl font-bold text-white mb-4">{editando ? '✏️ Editar Empleado' : '👤 Nuevo Empleado'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-zinc-300">
          <div>
            <label className="block text-sm mb-1 font-medium">Nombre completo</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600" 
              placeholder="Ej: Juan Pérez" 
              value={form.nombre_completo} 
              onChange={e => setForm({...form, nombre_completo: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Cargo</label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 capitalize" 
              value={form.cargo} 
              onChange={e => setForm({...form, cargo: e.target.value})}
            >
              <option value="mesero">Mesero</option>
              <option value="cocinera">Cocinera</option>
              <option value="parrillero">Parrillero</option>
              <option value="cajero">Cajero</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Salario Diario (Bs)</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600" 
              type="number" 
              placeholder="Ej: 100" 
              value={form.salario_diario || ''} 
              onChange={e => setForm({...form, salario_diario: +e.target.value})} 
            />
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <button 
            onClick={guardarEmpleado} 
            disabled={!form.nombre_completo}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-colors"
          >
            {editando ? '💾 Actualizar' : '➕ Crear Empleado'}
          </button>
          {editando && (
            <button onClick={() => setEditando(null)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-6 py-2.5 rounded-xl transition-colors">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Tabla empleados */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Cargo</th>
                <th className="p-4 font-semibold">Salario base</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {empleados.map(emp => (
                <tr key={emp.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-bold text-white">{emp.nombre_completo}</td>
                  <td className="p-4 capitalize">
                    <span className="bg-zinc-800 px-2 py-1 rounded text-xs">{emp.cargo}</span>
                  </td>
                  <td className="p-4">Bs {emp.salario_diario}/día</td>
                  <td className="p-4">
                    {emp.activo 
                      ? <span className="text-green-400 font-medium">Activo</span> 
                      : <span className="text-red-400 font-medium">Inactivo</span>}
                  </td>
                  <td className="p-4 flex justify-end gap-3">
                    <button onClick={() => editar(emp)} className="text-blue-400 hover:text-blue-300 font-medium">
                      Editar
                    </button>
                    <button onClick={() => toggleActivo(emp)} className={`${emp.activo ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'} font-medium`}>
                      {emp.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {empleados.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Aún no hay personal registrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registro de pago diario */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md">
        <h2 className="text-xl font-bold text-green-400 mb-4">💵 Registrar Pago</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-zinc-300">
          <div>
            <label className="block text-sm mb-1 font-medium">Seleccionar empleado</label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-green-600" 
              value={pagoForm.empleado_id} 
              onChange={e => setPagoForm({...pagoForm, empleado_id: +e.target.value})}
            >
              <option value={0}>Elegir...</option>
              {empleados.filter(e => e.activo).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nombre_completo} (Bs {emp.salario_diario}/d)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Monto a pagar (Bs)</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-green-600" 
              type="number" 
              placeholder="Monto pagado" 
              value={pagoForm.monto || ''} 
              onChange={e => setPagoForm({...pagoForm, monto: +e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Fecha del pago</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-green-600" 
              type="date" 
              value={pagoForm.fecha_pago} 
              onChange={e => setPagoForm({...pagoForm, fecha_pago: e.target.value})} 
            />
          </div>
        </div>
        <button 
          onClick={registrarPago} 
          disabled={!pagoForm.empleado_id || pagoForm.monto <= 0}
          className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shadow-lg shadow-green-900/20"
        >
          Confirmar Pago
        </button>
      </div>

      {/* Historial de pagos */}
      <div className="pt-2">
        <button onClick={mostrarPagos ? () => setMostrarPagos(false) : cargarPagos} className="text-blue-400 hover:text-blue-300 font-medium underline mb-4">
          {mostrarPagos ? 'Ocultar historial de pagos' : 'Ver historial de todos los pagos'}
        </button>
        {mostrarPagos && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="p-4 font-semibold">Fecha</th>
                    <th className="p-4 font-semibold">Empleado</th>
                    <th className="p-4 font-semibold text-right">Monto Pagado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {pagos.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 text-zinc-400">{p.fecha_pago}</td>
                      <td className="p-4 font-bold text-white">{(p as any).empleado?.nombre_completo || `ID ${p.empleado_id}`}</td>
                      <td className="p-4 text-green-400 font-semibold text-right">Bs {p.monto.toFixed(2)}</td>
                    </tr>
                  ))}
                  {pagos.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-zinc-500">No hay pagos registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}