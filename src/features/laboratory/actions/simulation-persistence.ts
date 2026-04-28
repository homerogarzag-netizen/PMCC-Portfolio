'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { TradierService } from '@/features/portfolio/services/tradier-service'

export async function saveSimulation(data: {
  ticker: string
  leap_strike: number
  leap_expiration: string
  short_strike: number
  short_expiration: string
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('pmcc_simulations')
    .insert([{
      user_id: session.user.id,
      ...data
    }])

  if (error) {
    console.error('[Simulation] Save error:', error)
    return { error: error.message }
  }

  revalidatePath('/laboratorio')
  return { success: true }
}

export async function getSavedSimulations() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const { data, error } = await supabase
    .from('pmcc_simulations')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Simulation] Fetch error:', error)
    return []
  }

  return data
}

export async function deleteSimulation(id: string) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('pmcc_simulations')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) {
    console.error('[Simulation] Delete error:', error)
    return { error: error.message }
  }

  revalidatePath('/laboratorio')
  return { success: true }
}

export async function refreshSimulationMetrics(symbol: string, leap_strike: number, leap_exp: string, short_strike: number, short_exp: string) {
  try {
    const quote = await TradierService.fetchQuotes([symbol])
    const price = quote[0]?.last || 0
    
    // Fetch option prices for both legs
    // We need specific option symbols or just fetch the chains and filter.
    // Optimal: get the option symbols for these strikes.
    // For now, let's just fetch the underlying price and some placeholder or simplified logic
    // Actually, to do it right, we need to fetch the chains.
    
    const leapChain = await TradierService.fetchOptionChain(symbol, leap_exp)
    const shortChain = await TradierService.fetchOptionChain(symbol, short_exp)
    
    const leapOpt = leapChain.find((o: any) => o.strike === leap_strike && o.option_type === 'call')
    const shortOpt = shortChain.find((o: any) => o.strike === short_strike && o.option_type === 'call')

    // Find ATM Call for the short expiration to calculate War Chest
    const atmShort = shortChain.reduce((prev: any, curr: any) => 
      Math.abs(curr.strike - price) < Math.abs(prev.strike - price) ? curr : prev
    , shortChain[0])
    
    const atmPremium = (atmShort.bid + atmShort.ask) / 2 || atmShort.last || 0
    
    return {
      underlyingPrice: price,
      leapPrice: leapOpt ? ((leapOpt.bid + leapOpt.ask) / 2 || leapOpt.last || 0) : 0,
      shortPrice: shortOpt ? ((shortOpt.bid + shortOpt.ask) / 2 || shortOpt.last || 0) : 0,
      atmPremium,
      leapGreeks: leapOpt?.greeks,
      shortGreeks: shortOpt?.greeks
    }
  } catch (err) {
    console.error('[Simulation] Refresh error:', err)
    return null
  }
}
