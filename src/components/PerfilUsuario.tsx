'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

export default function PerfilUsuario({ rol }: { rol: string }) {
  const [perfil, setPerfil] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ nombre_completo: '', telefono: '' })
  const [guardando, setGuardando] = useState(false)
  const supabase = crearCliente()

  useEffect(() => {
    cargarPerfil()
  }, [])

  const cargarPerfil = async () => {
    setCargando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single()
      setPerfil(data)
      if (data) {
        setForm({ nombre_completo: data.nombre_completo || '', telefono: data.telefono || '' })
      }
    }
    setCargando(false)
  }

  const subirAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setSubiendo(true)
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Debes seleccionar una imagen.')
      }

      const archivo = event.target.files[0]
      const formData = new FormData()
      formData.append('file', archivo)
      formData.append('userId', perfil.id)

      const response = await fetch('/api/avatar', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir la imagen')
      }

      const publicUrl = result.url

      // Actualizar estado local
      setPerfil({ ...perfil, avatar_url: publicUrl })
      
      // Forzar recarga de la página para que el navbar agarre la nueva foto
      window.location.reload()

    } catch (error: any) {
      alert('Error al subir imagen: ' + error.message)
    } finally {
      setSubiendo(false)
    }
  }

  const guardarPerfil = async () => {
    setGuardando(true)
    const { error } = await supabase
      .from('perfiles')
      .update({ nombre_completo: form.nombre_completo, telefono: form.telefono })
      .eq('id', perfil.id)

    if (error) {
      alert('Error al guardar el perfil: ' + error.message)
    } else {
      setPerfil({ ...perfil, nombre_completo: form.nombre_completo, telefono: form.telefono })
      setEditando(false)
      // Refrescar para que el layout vea el cambio
      window.location.reload()
    }
    setGuardando(false)
  }

  if (cargando) return <div className="p-12 text-center text-gray-500">Cargando perfil...</div>

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
      <h1 className="text-2xl font-black text-center mb-8 text-gray-800 dark:text-white">Mi Perfil ({rol})</h1>
      
      <div className="flex flex-col items-center gap-6">
        <div className="relative group">
          {perfil?.avatar_url ? (
            <img 
              src={perfil.avatar_url} 
              alt="Avatar" 
              className="w-32 h-32 rounded-full object-cover border-4 border-gray-100 dark:border-zinc-800 shadow-lg"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-5xl border-4 border-gray-200 dark:border-zinc-700">
              👤
            </div>
          )}
          
          <label className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity backdrop-blur-sm">
            <span className="text-2xl">📷</span>
            <span className="text-xs font-bold mt-1">{subiendo ? 'Subiendo...' : 'Cambiar Foto'}</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={subirAvatar} 
              disabled={subiendo}
            />
          </label>
        </div>

        <div className="w-full space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre Completo</label>
            {editando ? (
              <input 
                type="text" 
                value={form.nombre_completo}
                onChange={e => setForm({...form, nombre_completo: e.target.value})}
                className="w-full bg-white dark:bg-zinc-950 px-4 py-3 rounded-xl border border-blue-500 font-medium text-gray-900 dark:text-white outline-none"
              />
            ) : (
              <div className="bg-gray-50 dark:bg-zinc-950 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 font-medium text-gray-800 dark:text-zinc-200">
                {perfil?.nombre_completo}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
            {editando ? (
              <input 
                type="tel" 
                value={form.telefono}
                onChange={e => setForm({...form, telefono: e.target.value})}
                className="w-full bg-white dark:bg-zinc-950 px-4 py-3 rounded-xl border border-blue-500 font-medium text-gray-900 dark:text-white outline-none"
              />
            ) : (
              <div className="bg-gray-50 dark:bg-zinc-950 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 font-medium text-gray-800 dark:text-zinc-200">
                {perfil?.telefono}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Rol</label>
            <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 font-bold text-blue-600 dark:text-blue-400 capitalize opacity-70">
              {perfil?.rol}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 italic">* Solo modificable por un administrador general.</p>
          </div>
          
          <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 mt-6 flex justify-end gap-3">
            {editando ? (
              <>
                <button 
                  onClick={() => { setEditando(false); setForm({ nombre_completo: perfil.nombre_completo, telefono: perfil.telefono }) }}
                  className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button 
                  onClick={guardarPerfil}
                  disabled={guardando || !form.nombre_completo}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-colors disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </>
            ) : (
              <button 
                onClick={() => setEditando(true)}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                ✏️ Editar Información
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
