import { createClient } from './src/shared/lib/supabase/server.ts'

async function diagnoseXLE() {
  const supabase = await createClient()
  
  const { data: campaigns, error: cError } = await supabase
    .from('pmcc_campaigns')
    .select('*, option_legs(*)')
    .eq('ticker', 'XLE')

  if (cError) {
    console.error('Error fetching XLE:', cError)
    return
  }

  console.log('--- XLE CAMPAIGN DATA ---')
  console.log(JSON.stringify(campaigns, null, 2))
}

diagnoseXLE()
