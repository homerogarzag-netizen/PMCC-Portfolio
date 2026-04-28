'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getWatchlist() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('pmcc_watchlist')
    .select('*')
    .eq('user_id', session.user.id)
    .order('ticker', { ascending: true })

  if (error) {
    console.error('[Watchlist] Error fetching:', error)
    return []
  }

  return data
}

export async function addToWatchlist(ticker: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }

  const cleanTicker = ticker.toUpperCase().trim()
  
  const { error } = await supabase
    .from('pmcc_watchlist')
    .insert([{ user_id: session.user.id, ticker: cleanTicker }])

  if (error) {
    console.error('[Watchlist] Error adding:', error)
    return { error: error.message }
  }

  revalidatePath('/radar')
  return { success: true }
}

export async function removeFromWatchlist(id: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('pmcc_watchlist')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) {
    console.error('[Watchlist] Error removing:', error)
    return { error: error.message }
  }

  revalidatePath('/radar')
  return { success: true }
}
export async function seedInstitutionalEtfs() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }

  const etfs = [
    'SPY', 'QQQ', 'SMH', 'IWM', 'DIA', 
    'XLK', 'XLF', 'XLE', 'XLV', 'XLI', 
    'XLY', 'XLP', 'XLB', 'XLU', 'XLRE'
  ]

  // Get current watchlist to avoid duplicates
  const { data: current } = await supabase
    .from('pmcc_watchlist')
    .select('ticker')
    .eq('user_id', session.user.id)

  const existingTickers = new Set(current?.map(t => t.ticker) || [])
  const toAdd = etfs.filter(t => !existingTickers.has(t))

  if (toAdd.length === 0) return { success: true, message: 'Watchlist already populated' }

  const { error } = await supabase
    .from('pmcc_watchlist')
    .insert(toAdd.map(ticker => ({ user_id: session.user.id, ticker })))

  if (error) {
    console.error('[Watchlist] Error seeding:', error)
    return { error: error.message }
  }

  revalidatePath('/radar')
  return { success: true, count: toAdd.length }
}
