import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  if (line && line.includes('=')) {
    const parts = line.split('=')
    env[parts[0]] = parts[1].trim()
  }
})

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY']
)

async function main() {
  console.log('Verifying buckets...')
  
  // Make comprobantes public
  const { data: b1, error: e1 } = await supabase.storage.updateBucket('comprobantes', {
    public: true,
    allowedMimeTypes: ['image/*', 'application/pdf'],
    fileSizeLimit: 10485760
  })
  if (e1) console.error('Error comprobantes:', e1.message)
  else console.log('comprobantes bucket updated to public.')

  // Make productos public
  const { data: b2, error: e2 } = await supabase.storage.updateBucket('productos', {
    public: true,
    allowedMimeTypes: ['image/*'],
    fileSizeLimit: 10485760
  })
  if (e2) console.error('Error productos:', e2.message)
  else console.log('productos bucket updated to public.')
}

main()
