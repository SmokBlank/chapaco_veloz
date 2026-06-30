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

async function checkColumns() {
  const { data, error } = await supabase.from('perfiles').select('*').limit(1)
  console.log('Columns in perfiles:', data?.[0] ? Object.keys(data[0]) : 'no data')
}
checkColumns()
