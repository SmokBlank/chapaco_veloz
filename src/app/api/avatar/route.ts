import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'Faltan datos (archivo o userId).' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Math.random()}.${fileExt}`
    
    // Convertir a buffer para subir
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Subir usando el cliente admin para evadir las políticas RLS
    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('avatars').getPublicUrl(fileName)

    // Actualizar la tabla perfiles usando admin para evadir RLS
    const { error: updateError } = await supabaseAdmin
      .from('perfiles')
      .update({ avatar_url: publicUrlData.publicUrl })
      .eq('id', userId)

    if (updateError) {
      console.error('Error actualizando perfiles:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ url: publicUrlData.publicUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
