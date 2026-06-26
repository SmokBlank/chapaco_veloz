'use server'

import { createClient } from '@supabase/supabase-js'

// Usamos el Service Role Key para saltarnos las políticas de seguridad (RLS)
// ya que el navegador del usuario bloqueó la configuración de las mismas en el panel.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function subirImagen(formData: FormData) {
  try {
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string
    const filename = formData.get('filename') as string

    if (!file || !bucket || !filename) {
      throw new Error('Faltan parámetros requeridos para subir la imagen.')
    }

    // Convertir el archivo a un ArrayBuffer, luego a Buffer para que Supabase lo entienda en NodeJS
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (error) {
      console.error('Error interno de Supabase al subir:', error)
      return { exito: false, error: error.message }
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filename)
    
    return { exito: true, url: publicData.publicUrl }

  } catch (error: any) {
    console.error('Excepción al subir imagen:', error)
    return { exito: false, error: error.message }
  }
}
