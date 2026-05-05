'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { getCentinelaDiagnosis, getNakedDiagnosis } from '../lib/centinela-advisor'
import { TradierService } from '../services/tradier-service'

export async function getCampaigns(status: 'active' | 'closed' | 'all' = 'active') {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []
  
  const userId = session.user.id

  // Fetch campaigns
  let query = supabase
    .from('pmcc_campaigns')
    .select(`
      *,
      option_legs(*)
    `)
    .eq('user_id', userId)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) return []

  // Collect all symbols (Leaps, Shorts, and Underlying Tickers)
  const tickers = data.map(c => c.ticker)
  const symbolsToQuote = data.flatMap(c => 
    (c.option_legs || []).filter((l: any) => l.is_active).map((l: any) => 
      c.main_leap_symbol // LEAP symbol
    )
  )
  
  // Need to get the actual active short call symbols too
  const shortSymbols = data.flatMap(c => 
    (c.option_legs || [])
      .filter((l: any) => l.type === 'short_call' && l.is_active)
      .map((l: any) => {
        // Construct OCC: TICKER YYMMDD C/P STRIKE(00000000)
        const dateStr = l.expiration_date.replace(/-/g, '').substring(2)
        const strikeStr = (l.strike * 1000).toString().padStart(8, '0')
        return `${c.ticker}${dateStr}C${strikeStr}`
      })
  )

  const allSymbols = [...new Set([...tickers, ...symbolsToQuote, ...shortSymbols, 'BIL', 'SGOV'].filter(Boolean))]
  const quotes = await TradierService.fetchQuotes(allSymbols)
  const quoteMap = new Map(quotes.map(q => [q.symbol, q]))

  // Fetch all positions to find Liquidity (BIL/SGOV)
  const allPositions = await TradierService.fetchPositions()
  const bilSgovPositions = allPositions.filter(p => p.symbol === 'BIL' || p.symbol === 'SGOV')
  const totalLiquidityValue = bilSgovPositions.reduce((sum, p) => {
    const q = quoteMap.get(p.symbol)
    const price = q?.last || (q?.bid + q?.ask) / 2 || 100
    return sum + (p.quantity * price)
  }, 0)

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  // Transform to match the UI expected format
  return Promise.all(data.map(async (camp) => {
    const leaps = camp.option_legs?.filter((l: any) => l.type === 'leap' && l.is_active) || []
    const shorts = camp.option_legs?.filter((l: any) => l.type === 'short_call' && l.is_active) || []
    
    const tickerQuote = quoteMap.get(camp.ticker)
    const underlyingPrice = tickerQuote?.last || (tickerQuote?.bid + tickerQuote?.ask) / 2 || 0

    const totalContracts = leaps.reduce((s: number, l: any) => s + l.contracts, 0)
    const avgStrike = totalContracts > 0 
      ? leaps.reduce((s: number, l: any) => s + (l.strike * l.contracts), 0) / totalContracts 
      : 0
    
    const getDTE = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number)
      const exp = new Date(y, m - 1, d)
      exp.setHours(0, 0, 0, 0)
      const diff = exp.getTime() - now.getTime()
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }

    const mainLeap = leaps[0]
    const short = shorts[0]
    
    // Diagnosis Centinela
    let diagnosis = null
    if (short) {
      const shortSymbol = `${camp.ticker}${short.expiration_date.replace(/-/g, '').substring(2)}C${(short.strike * 1000).toString().padStart(8, '0')}`
      const q = quoteMap.get(shortSymbol)
      if (q) {
        // Robust Mark Price calculation to match Tradier terminal
        let markPrice = (q.bid + q.ask) / 2
        if (q.bid === 0 && q.last > 0) markPrice = q.last
        else if (q.bid === 0 && q.last === 0) markPrice = q.ask / 2

        diagnosis = getCentinelaDiagnosis(
          { 
            strike: short.strike, 
            entryPrice: short.entry_price, 
            contracts: Math.abs(short.contracts), 
            expirationDate: short.expiration_date 
          },
          { 
            delta: q.greeks?.delta || 0, 
            theta: q.greeks?.theta || 0, 
            mid_iv: q.greeks?.mid_iv || 0 
          },
          markPrice,
          underlyingPrice,
          camp.tk_score || 3
        )
      }
    } else {
      // Naked LEAP diagnosis
      diagnosis = getNakedDiagnosis(underlyingPrice, camp.tk_score || 3)
    }

    // NEW: Dynamic War Chest Calculation (V6.0 IQ Engine)
    // Formula: LEAP Cost + (ATM Premium * 1.5 * 5 * Contracts * 100)
    const atmPremium = await TradierService.getATMPremium(camp.ticker)
    const leapCost = leaps.reduce((sum: number, l: any) => sum + (l.entry_price * l.contracts * 100), 0)
    
    // The "Fondo de Guerra" part (Buffer for 5 weeks of rolls)
    const warChestBuffer = atmPremium * 1.5 * 5 * totalContracts * 100
    const requiredReserves = leapCost + warChestBuffer

    const liquidityStatus = totalLiquidityValue >= requiredReserves ? 'OK' : 'INSUFFICIENT'

    return {
      id: camp.id,
      ticker: camp.ticker,
      contracts: totalContracts,
      leapStrike: mainLeap 
        ? `${avgStrike.toFixed(1)}C ${getDTE(mainLeap.expiration_date)}DTE` 
        : 'N/A',
      shortCallStrike: short 
        ? `${short.strike}C ${getDTE(short.expiration_date)}DTE` 
        : 'OPEN',
      capitalAllocated: camp.capital_allocated,
      warChest: totalLiquidityValue,
      liquidityStatus,
      targetRoi: camp.target_roi || 0,
      adjustedCostBasis: 0,
      status: camp.status,
      tkScore: camp.tk_score || 3,
      beta: camp.beta || 1.0,
      underlyingPrice,
      centinela: diagnosis,
      warChestRequired: requiredReserves,
      availableLiquidity: totalLiquidityValue
    }
  }))
}
