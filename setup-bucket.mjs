import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing supabase URL or Service Key")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupBucket() {
  console.log("Creando bucket 'productos'...")
  
  // Create the bucket
  const { data, error } = await supabase.storage.createBucket('productos', {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
  })
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log("El bucket 'productos' ya existe.")
    } else {
      console.error("Error al crear bucket:", error.message)
    }
  } else {
    console.log("Bucket 'productos' creado correctamente.")
  }
}

setupBucket()
