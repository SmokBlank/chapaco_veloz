'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

export default function PerfilUsuario({ rol }: { rol: string }) {
  const [perfil, setPerfil] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
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
      const fileExt = archivo.name.split('.').pop()
      const fileName = `${perfil.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Subir al bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, archivo)

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = publicUrlData.publicUrl

      // Actualizar tabla perfiles
      const { error: updateError } = await supabase
        .from('perfiles')
        .update({ avatar_url: publicUrl })
        .eq('id', perfil.id)

      if (updateError) throw updateError

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
            <div className="bg-gray-50 dark:bg-zinc-950 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 font-medium text-gray-800 dark:text-zinc-200">
              {perfil?.nombre_completo}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Teléfono</label>
            <div className="bg-gray-50 dark:bg-zinc-950 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 font-medium text-gray-800 dark:text-zinc-200">
              {perfil?.telefono}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Rol</label>
            <div className="bg-gray-50 dark:bg-zinc-950 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 font-bold text-blue-600 dark:text-blue-400 capitalize">
              {perfil?.rol}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
