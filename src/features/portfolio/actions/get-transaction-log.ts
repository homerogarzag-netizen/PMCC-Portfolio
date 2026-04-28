'use server'

import { createClient } from '@/shared/lib/supabase/server'

export async function getTransactionLog() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      pmcc_campaigns(ticker)
    `)
    .order('transaction_date', { ascending: false })

  if (error) {
    console.error('Error fetching logs:', error)
    return []
  }

  return data.map(tx => ({
    id: tx.id,
    date: new Date(tx.transaction_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: '2-digit' }),
    ticker: tx.pmcc_campaigns?.ticker || 'N/A',
    description: tx.description,
    amount: tx.amount,
    type: tx.type
  }))
}
