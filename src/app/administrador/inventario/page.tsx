'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type ItemInventario = {
  id: number
  nombre: string
  unidad: string
  stock: number
  stock_minimo: number
}

type Movimiento = {
  id: number
  inventario_id: number
  tipo_movimiento: string
  cantidad: number
  motivo: string
  creado_en: string
  inventario: { nombre: string }
}

export default function InventarioAdmin() {
  const [items, setItems] = useState<ItemInventario[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [formEntrada, setFormEntrada] = useState({ inventario_id: 0, cantidad: 0, motivo: '' })
  const [formSalida, setFormSalida] = useState({ inventario_id: 0, cantidad: 0, motivo: '' })
  const [mostrarMovimientos, setMostrarMovimientos] = useState(false)
  const [umbral, setUmbral] = useState(3)
  const supabase = crearCliente()

  useEffect(() => { 
    cargar()
    cargarUmbral()

    // Suscribirse a cambios en tiempo real de la tabla 'inventario'
    const canalInventario = supabase
      .channel('cambios-inventario-admin')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inventario' },
        (payload) => {
          setItems((prevItems) =>
            prevItems.map((item) =>
              item.id === payload.new.id ? { ...item, stock: payload.new.stock } : item
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canalInventario)
    }
  }, [])

  const cargar = async () => {
    const { data } = await supabase.from('inventario').select('*').order('nombre')
    setItems(data || [])
  }

  const cargarMovimientos = async () => {
    const { data } = await supabase
      .from('movimientos_inventario')
      .select('*, inventario(nombre)')
      .order('creado_en', { ascending: false })
      .limit(50)
    setMovimientos(data || [])
    setMostrarMovimientos(true)
  }

  const cargarUmbral = async () => {
    const { data } = await supabase.from('configuracion').select('valor').eq('clave', 'umbral_stock_bajo').single()
    if (data) setUmbral(Number(data.valor))
  }

  const registrarEntrada = async () => {
    if (!formEntrada.inventario_id || formEntrada.cantidad <= 0) return
    await supabase.from('movimientos_inventario').insert({
      inventario_id: formEntrada.inventario_id,
      tipo_movimiento: 'entrada',
      cantidad: formEntrada.cantidad,
      motivo: formEntrada.motivo || 'Compra',
      creado_por: (await supabase.auth.getSession()).data.session?.user.id
    })
    await supabase.rpc('actualizar_stock_inventario', {
      p_inventario_id: formEntrada.inventario_id,
      p_cantidad: formEntrada.cantidad,
      p_tipo: 'entrada'
    })
    setFormEntrada({ inventario_id: 0, cantidad: 0, motivo: '' })
    cargar()
  }

  const registrarSalida = async () => {
    if (!formSalida.inventario_id || formSalida.cantidad <= 0) return
    await supabase.from('movimientos_inventario').insert({
      inventario_id: formSalida.inventario_id,
      tipo_movimiento: 'salida',
      cantidad: formSalida.cantidad,
      motivo: formSalida.motivo || 'Uso interno',
      creado_por: (await supabase.auth.getSession()).data.session?.user.id
    })
    await supabase.rpc('actualizar_stock_inventario', {
      p_inventario_id: formSalida.inventario_id,
      p_cantidad: formSalida.cantidad,
      p_tipo: 'salida'
    })
    setFormSalida({ inventario_id: 0, cantidad: 0, motivo: '' })
    cargar()
  }

  const actualizarUmbral = async () => {
    await supabase.from('configuracion').upsert({ clave: 'umbral_stock_bajo', valor: umbral.toString() })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Inventario General</h1>
        <p className="text-zinc-400 text-sm">Gestiona existencias e insumos de tu restaurante.</p>
      </div>

      {/* Configuración umbral */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md flex items-center gap-4">
        <label className="text-sm font-semibold text-zinc-300">Configurar umbral de stock bajo:</label>
        <input 
          type="number" min="0" 
          value={umbral} 
          onChange={e => setUmbral(Number(e.target.value))} 
          className="bg-zinc-950 border border-zinc-700 text-white rounded-xl px-3 py-2 w-24 outline-none focus:ring-2 focus:ring-blue-600" 
        />
        <button onClick={actualizarUmbral} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">Guardar</button>
      </div>

      {/* Tabla inventario */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-zinc-300 text-sm">
            <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="p-4 font-semibold">Producto / Insumo</th>
                <th className="p-4 font-semibold">Unidad</th>
                <th className="p-4 font-semibold">Stock Actual</th>
                <th className="p-4 font-semibold">Stock Mínimo</th>
                <th className="p-4 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {items.map(item => (
                <tr key={item.id} className={`transition-colors ${item.stock <= item.stock_minimo ? 'bg-red-950/20' : 'hover:bg-zinc-800/30'}`}>
                  <td className="p-4 font-bold text-white">{item.nombre}</td>
                  <td className="p-4">{item.unidad}</td>
                  <td className={`p-4 font-black ${item.stock <= item.stock_minimo ? 'text-red-400' : 'text-white'}`}>{item.stock}</td>
                  <td className="p-4 text-zinc-500">{item.stock_minimo}</td>
                  <td className="p-4">
                    {item.stock <= item.stock_minimo 
                      ? <span className="bg-red-900/30 text-red-400 px-2.5 py-1 rounded-full text-xs font-bold border border-red-900/50">⚠️ Bajo</span> 
                      : <span className="bg-green-900/30 text-green-400 px-2.5 py-1 rounded-full text-xs font-bold border border-green-900/50">✅ Normal</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formularios entrada/salida */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md">
          <h2 className="text-xl font-bold mb-4 text-green-400">📥 Registrar Entrada</h2>
          <select 
            className="w-full bg-zinc-950 border border-zinc-700 text-white p-3 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-green-600" 
            value={formEntrada.inventario_id} 
            onChange={e => setFormEntrada({...formEntrada, inventario_id: Number(e.target.value)})}
          >
            <option value={0}>Seleccionar producto...</option>
            {items.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          <input 
            type="number" min="0.01" step="0.01" placeholder="Cantidad" 
            value={formEntrada.cantidad || ''} 
            onChange={e => setFormEntrada({...formEntrada, cantidad: Number(e.target.value)})} 
            className="w-full bg-zinc-950 border border-zinc-700 text-white p-3 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-green-600" 
          />
          <input 
            type="text" placeholder="Motivo (opcional)" 
            value={formEntrada.motivo} 
            onChange={e => setFormEntrada({...formEntrada, motivo: e.target.value})} 
            className="w-full bg-zinc-950 border border-zinc-700 text-white p-3 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-green-600" 
          />
          <button onClick={registrarEntrada} className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-3 rounded-xl w-full transition-colors shadow-lg shadow-green-900/20">
            Añadir al Stock
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md">
          <h2 className="text-xl font-bold mb-4 text-orange-400">📤 Registrar Salida</h2>
          <select 
            className="w-full bg-zinc-950 border border-zinc-700 text-white p-3 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-orange-600" 
            value={formSalida.inventario_id} 
            onChange={e => setFormSalida({...formSalida, inventario_id: Number(e.target.value)})}
          >
            <option value={0}>Seleccionar producto...</option>
            {items.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          <input 
            type="number" min="0.01" step="0.01" placeholder="Cantidad" 
            value={formSalida.cantidad || ''} 
            onChange={e => setFormSalida({...formSalida, cantidad: Number(e.target.value)})} 
            className="w-full bg-zinc-950 border border-zinc-700 text-white p-3 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-orange-600" 
          />
          <input 
            type="text" placeholder="Motivo (opcional)" 
            value={formSalida.motivo} 
            onChange={e => setFormSalida({...formSalida, motivo: e.target.value})} 
            className="w-full bg-zinc-950 border border-zinc-700 text-white p-3 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-orange-600" 
          />
          <button onClick={registrarSalida} className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-3 rounded-xl w-full transition-colors shadow-lg shadow-orange-900/20">
            Descontar del Stock
          </button>
        </div>
      </div>

      {/* Historial */}
      <div className="pt-4">
        <button onClick={mostrarMovimientos ? () => setMostrarMovimientos(false) : cargarMovimientos} className="text-blue-400 hover:text-blue-300 font-medium underline mb-4">
          {mostrarMovimientos ? 'Ocultar historial' : 'Ver historial de movimientos'}
        </button>
        {mostrarMovimientos && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="p-4 font-semibold">Fecha</th>
                    <th className="p-4 font-semibold">Producto</th>
                    <th className="p-4 font-semibold">Tipo</th>
                    <th className="p-4 font-semibold">Cantidad</th>
                    <th className="p-4 font-semibold">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {movimientos.map(mov => (
                    <tr key={mov.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 text-zinc-400">{new Date(mov.creado_en).toLocaleString()}</td>
                      <td className="p-4 font-bold text-white">{(mov as any).inventario?.nombre || `ID ${mov.inventario_id}`}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${mov.tipo_movimiento === 'entrada' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {mov.tipo_movimiento.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 font-semibold">{mov.cantidad}</td>
                      <td className="p-4 text-zinc-500">{mov.motivo || '-'}</td>
                    </tr>
                  ))}
                  {movimientos.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No hay movimientos recientes.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}