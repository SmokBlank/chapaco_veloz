import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://prstvipkqolhxojbakmm.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByc3R2aXBrcW9saHhvamJha21tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgwODAwOSwiZXhwIjoyMDk3Mzg0MDA5fQ.iB-IcSE50PXv0fGWwUXIQucTAHhxQ-cS6P43_wwbZ3A'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  console.log("Creando bucket productos...")
  const res1 = await supabase.storage.createBucket('productos', { public: true })
  console.log("Productos:", res1.data, res1.error)

  console.log("Creando bucket comprobantes...")
  const res2 = await supabase.storage.createBucket('comprobantes', { public: true })
  console.log("Comprobantes:", res2.data, res2.error)
}

run()
