'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type Proveedor = {
  id: number
  nombre: string
  telefono: string
  productos_suministrados: string
  observaciones: string
}

export default function ProveedoresAdmin() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [form, setForm] = useState({ nombre: '', telefono: '', productos_suministrados: '', observaciones: '' })
  const supabase = crearCliente()

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    const { data } = await supabase.from('proveedores').select('*').order('nombre')
    setProveedores(data || [])
  }

  const guardar = async () => {
    if (editando) {
      await supabase.from('proveedores').update(form).eq('id', editando.id)
    } else {
      await supabase.from('proveedores').insert(form)
    }
    setEditando(null)
    setForm({ nombre: '', telefono: '', productos_suministrados: '', observaciones: '' })
    cargar()
  }

  const editar = (prov: Proveedor) => {
    setEditando(prov)
    setForm({ nombre: prov.nombre, telefono: prov.telefono, productos_suministrados: prov.productos_suministrados, observaciones: prov.observaciones || '' })
  }

  const eliminar = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
      await supabase.from('proveedores').delete().eq('id', id)
      cargar()
    }
  }

  const abrirWhatsApp = (telefono: string) => {
    const limpio = telefono.replace(/\D/g, '')
    window.open(`https://wa.me/591${limpio}`, '_blank')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Directorio de Proveedores</h1>
        <p className="text-zinc-400 text-sm">Gestiona tus contactos de suministros e insumos.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md">
        <h2 className="text-xl font-bold text-white mb-4">{editando ? '✏️ Editar proveedor' : '➕ Nuevo proveedor'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-zinc-300">
          <div>
            <label className="block text-sm mb-1 font-medium">Nombre de empresa o contacto</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600" 
              placeholder="Ej: Sofía (Carnes)" 
              value={form.nombre} 
              onChange={e => setForm({...form, nombre: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-sm mb-1 font-medium">Teléfono (WhatsApp)</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600" 
              placeholder="Ej: 77777777" 
              value={form.telefono} 
              onChange={e => setForm({...form, telefono: e.target.value})} 
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1 font-medium">Productos que suministra</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600" 
              placeholder="Ej: Chancho entero, lechuga, tomate..." 
              value={form.productos_suministrados} 
              onChange={e => setForm({...form, productos_suministrados: e.target.value})} 
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1 font-medium">Observaciones / Notas adicionales</label>
            <input 
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600" 
              placeholder="Ej: Entregas solo los lunes por la mañana" 
              value={form.observaciones} 
              onChange={e => setForm({...form, observaciones: e.target.value})} 
            />
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <button 
            onClick={guardar} 
            disabled={!form.nombre}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
          >
            {editando ? '💾 Actualizar' : '✅ Guardar Contacto'}
          </button>
          {editando && (
            <button onClick={() => setEditando(null)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold px-6 py-2.5 rounded-xl transition-colors">
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="p-4 font-semibold">Proveedor</th>
                <th className="p-4 font-semibold">Contacto</th>
                <th className="p-4 font-semibold">Suministros</th>
                <th className="p-4 font-semibold">Notas</th>
                <th className="p-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {proveedores.map(prov => (
                <tr key={prov.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4 font-bold text-white">{prov.nombre}</td>
                  <td className="p-4 font-medium text-zinc-400">{prov.telefono}</td>
                  <td className="p-4">{prov.productos_suministrados || '-'}</td>
                  <td className="p-4 text-zinc-500">{prov.observaciones || '-'}</td>
                  <td className="p-4 flex justify-end gap-3">
                    <button 
                      onClick={() => abrirWhatsApp(prov.telefono)} 
                      className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                      title="Abrir WhatsApp"
                    >
                      <span>💬</span> Escribir
                    </button>
                    <button onClick={() => editar(prov)} className="text-blue-400 hover:text-blue-300 font-medium">Editar</button>
                    <button onClick={() => eliminar(prov.id)} className="text-red-400 hover:text-red-300 font-medium">Eliminar</button>
                  </td>
                </tr>
              ))}
              {proveedores.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center text-zinc-500">No hay proveedores en el directorio.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}