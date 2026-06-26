'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'
import { subirImagen as subirImagenAction } from '@/actions/upload'

type Producto = {
  id: number
  nombre: string
  descripcion: string
  precio: number
  categoria: string
  imagen_url: string | null
  disponible: boolean
}

export default function ProductosAdmin() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [editando, setEditando] = useState<Producto | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: 0, categoria: 'platillo', disponible: true })
  const [imagen, setImagen] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const supabase = crearCliente()

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    const { data } = await supabase.from('productos').select('*').order('categoria').order('nombre')
    setProductos(data || [])
  }

  const subirImagen = async (): Promise<string | null> => {
    if (!imagen) return null
    const nombreArchivo = `${Date.now()}_${imagen.name}`
    
    const formData = new FormData()
    formData.append('file', imagen)
    formData.append('bucket', 'productos')
    formData.append('filename', nombreArchivo)

    const resultado = await subirImagenAction(formData)
    
    if (!resultado.exito) {
      alert('Error al subir imagen: ' + resultado.error)
      return null
    }
    
    return resultado.url || null
  }


  const guardar = async () => {
    setSubiendo(true)
    
    let imagenUrl = editando?.imagen_url || null
    if (imagen) {
      const url = await subirImagen()
      if (url) imagenUrl = url
    }

    const datos = { ...form, imagen_url: imagenUrl }

    if (editando) {
      await supabase.from('productos').update(datos).eq('id', editando.id)
    } else {
      await supabase.from('productos').insert(datos)
    }

    setEditando(null)
    setImagen(null)
    setPreviewUrl(null)
    setForm({ nombre: '', descripcion: '', precio: 0, categoria: 'platillo', disponible: true })
    setSubiendo(false)
    cargar()
  }

  const editar = (p: Producto) => {
    setEditando(p)
    setForm({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio, categoria: p.categoria, disponible: p.disponible })
    setPreviewUrl(p.imagen_url)
    setImagen(null)
  }

  const cancelar = () => {
    setEditando(null)
    setImagen(null)
    setPreviewUrl(null)
    setForm({ nombre: '', descripcion: '', precio: 0, categoria: 'platillo', disponible: true })
  }

  const eliminar = async (id: number) => {
    if (confirm('¿Eliminar este producto?')) {
      await supabase.from('productos').delete().eq('id', id)
      cargar()
    }
  }

  const manejarImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (archivo) {
      setImagen(archivo)
      setPreviewUrl(URL.createObjectURL(archivo))
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Gestión de Productos</h1>
        <p className="text-zinc-400 text-sm">Añade y actualiza el menú del restaurante.</p>
      </div>

      {/* Formulario */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-md mb-8">
        <h2 className="text-lg font-bold text-white mb-4">
          {editando ? '✏️ Editar producto' : '➕ Nuevo producto'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-zinc-300">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm({...form, nombre: e.target.value})}
              className="w-full border border-zinc-700 bg-zinc-950 p-2.5 rounded-xl focus:ring-2 focus:ring-red-600 outline-none"
              placeholder="Ej: Chancho a la cruz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <input
              type="text"
              value={form.descripcion}
              onChange={e => setForm({...form, descripcion: e.target.value})}
              className="w-full border border-zinc-700 bg-zinc-950 p-2.5 rounded-xl focus:ring-2 focus:ring-red-600 outline-none"
              placeholder="Ej: Porción de chancho a la cruz"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Precio (Bs) *</label>
            <input
              type="number"
              step="0.01"
              value={form.precio || ''}
              onChange={e => setForm({...form, precio: +e.target.value})}
              className="w-full border border-zinc-700 bg-zinc-950 p-2.5 rounded-xl focus:ring-2 focus:ring-red-600 outline-none"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select
              value={form.categoria}
              onChange={e => setForm({...form, categoria: e.target.value})}
              className="w-full border border-zinc-700 bg-zinc-950 p-2.5 rounded-xl focus:ring-2 focus:ring-red-600 outline-none"
            >
              <option value="platillo">Platillo</option>
              <option value="bebida">Bebida</option>
              <option value="extra">Extra</option>
            </select>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={form.disponible}
              onChange={e => setForm({...form, disponible: e.target.checked})}
              id="disponible"
              className="w-5 h-5 accent-red-600 bg-zinc-950 border-zinc-700 rounded"
            />
            <label htmlFor="disponible" className="text-sm font-medium">Disponible para la venta</label>
          </div>
        </div>

        {/* Subida de imagen */}
        <div className="mb-6 p-4 border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-950/50">
          <label className="block text-sm font-medium mb-2 text-zinc-300">
            📸 Imagen del producto
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={manejarImagen}
            className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-950/30 file:text-red-400 hover:file:bg-red-950/50"
          />
          {previewUrl && (
            <div className="mt-4">
              <p className="text-xs text-zinc-500 mb-2">Vista previa:</p>
              <img
                src={previewUrl}
                alt="Vista previa"
                className="h-32 w-32 object-cover rounded-xl border border-zinc-700 shadow-md"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={guardar}
            disabled={subiendo || !form.nombre || form.precio <= 0}
            className="bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
          >
            {subiendo ? '⏳ Guardando...' : editando ? '💾 Actualizar' : '✅ Crear producto'}
          </button>
          {editando && (
            <button onClick={cancelar} className="bg-zinc-800 text-zinc-300 font-bold px-6 py-2.5 rounded-xl hover:bg-zinc-700 transition-colors">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="p-4 font-semibold">Imagen</th>
                <th className="p-4 font-semibold">Nombre</th>
                <th className="p-4 font-semibold">Categoría</th>
                <th className="p-4 font-semibold">Precio</th>
                <th className="p-4 font-semibold">Estado</th>
                <th className="p-4 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {productos.map(p => (
                <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} className="h-12 w-12 object-cover rounded-lg border border-zinc-700" />
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="p-4 font-bold text-white">{p.nombre}</td>
                  <td className="p-4 capitalize">{p.categoria}</td>
                  <td className="p-4 font-semibold text-green-400">Bs {p.precio.toFixed(2)}</td>
                  <td className="p-4">
                    {p.disponible ? <span className="text-green-400">🟢 Disponible</span> : <span className="text-red-400">🔴 No disp.</span>}
                  </td>
                  <td className="p-4">
                    <button onClick={() => editar(p)} className="text-blue-400 hover:text-blue-300 font-medium mr-4">
                      ✏️ Editar
                    </button>
                    <button onClick={() => eliminar(p.id)} className="text-red-400 hover:text-red-300 font-medium">
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {productos.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-zinc-500 mb-2">No hay productos en el menú.</p>
            <p className="text-sm text-zinc-600">¡Crea el primero usando el formulario de arriba!</p>
          </div>
        )}
      </div>
    </div>
  )
}