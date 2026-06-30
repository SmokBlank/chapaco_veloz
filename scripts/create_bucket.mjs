import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../.env.local')

const envConfig = fs.readFileSync(envPath, 'utf8')
const supabaseUrl = envConfig.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]
const supabaseKey = envConfig.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]

const supabase = createClient(supabaseUrl, supabaseKey)

async function createBucket() {
  const { data, error } = await supabase.storage.createBucket('avatars', {
    public: true,
    fileSizeLimit: 5242880 // 5MB
  })
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket "avatars" ya existe.')
      // Ensure it is public just in case
      await supabase.storage.updateBucket('avatars', { public: true })
    } else {
      console.error('Error creando bucket:', error)
    }
  } else {
    console.log('Bucket "avatars" creado exitosamente.')
  }
}

createBucket()
