'use server'

import { TradierService } from '../services/tradier-service'
import { createClient } from '@/shared/lib/supabase/server'

export interface PortfolioMetrics {
  netTheta: number
  betaWeightedDelta: number
  totalNlv: number
  totalPremium: number
  totalWarChestRequired: number
  availableWarChest: number
}

export interface CampaignPerformance {
  campaignId: string
  ticker: string
  totalInvested: number
  totalPremium: number
  marketValue: number // Standalone LEAP Market Value
  shortValue: number  // Short Call Liability (negative)
  unrealizedPl: number // Net Unrealized (LeapValue - CostBasis + ShortValue)
  netPl: number
  recoveryPercent: number
  status: string
  theta: number
  bwd: number
}

export async function getPerformanceSummary() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { campaigns: [], portfolio: null }

  const { data: campaigns, error } = await supabase
    .from('pmcc_campaigns')
    .select(`
      *,
      option_legs(*),
      closed_trades(*),
      transactions(*)
    `)
    .eq('user_id', session.user.id)

  if (error || !campaigns) return { campaigns: [], portfolio: null }

  // 1. Collect all symbols for quoting: LEAPs, Shorts, Tickers, and Benchmark (SPY)
  const optionSymbols = campaigns.flatMap(c => 
    (c.option_legs || [])
      .filter((l: any) => l.is_active)
      .map((l: any) => {
        // Construct OCC symbol dynamically for every leg to handle multiple strikes correctly
        const dateStr = l.expiration_date.replace(/-/g, '').substring(2)
        const strikeStr = (l.strike * 1000).toString().padStart(8, '0')
        return `${c.ticker}${dateStr}C${strikeStr}`
      })
  )

  const tickers = campaigns.map(c => c.ticker)
  const allSymbols = [...new Set([...optionSymbols, ...tickers, 'SPY', 'BIL', 'SGOV'].filter(Boolean))]
  
  const quotes = await TradierService.fetchQuotes(allSymbols)
  const quoteMap = new Map(quotes.map(q => [q.symbol, q]))
  const spyPrice = quoteMap.get('SPY')?.last || 500 // Fallback

  let portfolioTheta = 0
  let portfolioBwd = 0
  let totalNlv = 0
  let totalRealizedPremium = 0
  let totalWarChestRequired = 0

  const campaignStats = await Promise.all(campaigns.map(async (camp) => {
    const legs = camp.option_legs?.filter((l: any) => l.is_active) || []
    const transactions = camp.transactions || []
    
    // Dynamic War Chest for this campaign (CEO Formula)
    const atmPremium = await TradierService.getATMPremium(camp.ticker)
    const leapCost = legs.filter((l: any) => l.type === 'leap').reduce((sum: number, l: any) => sum + (l.entry_price * l.contracts * 100), 0)
    const totalContractsPerCamp = legs.filter((l: any) => l.type === 'leap').reduce((s: number, l: any) => s + l.contracts, 0)
    const campWarChestRequired = leapCost + (atmPremium * 1.5 * 5 * totalContractsPerCamp * 100)

    // Realized P&L = Sum of all transactions EXCEPT those tagged as 'initial_capital'
    // This makes the Bitácora the single source of truth. 
    // If a label is corrected in the DB, the P&L updates automatically.
    const realizedPl = transactions
      .filter((tx: any) => tx.type !== 'initial_capital')
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0)
    
    // True Cost Basis (Adjusted for LEAP rolls)
    // We sum all 'initial_capital' transactions (Buys are negative, Sells are positive in Tradier).
    // The net out-of-pocket cost is the inverse of this sum.
    const initialCapitalSum = transactions
      .filter((tx: any) => tx.type === 'initial_capital')
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0)
      
    // If there's history, use the Bitácora's true cost basis. Otherwise, fallback to the current active LEAP cost.
    const totalInvested = initialCapitalSum !== 0 ? -initialCapitalSum : leapCost
    
    let leapMarketValue = 0
    let shortUnrealizedPl = 0
    let shortMarketValue = 0 // Liability for totalNlv
    let campTheta = 0
    let campDeltaDollars = 0

    const tickerQuote = quoteMap.get(camp.ticker)
    const underlyingPrice = tickerQuote?.last || 0

    legs.forEach((l: any) => {
      // Reconstruct symbol for each individual leg
      const dateStr = l.expiration_date.replace(/-/g, '').substring(2)
      const strikeStr = (l.strike * 1000).toString().padStart(8, '0')
      const symbol = `${camp.ticker}${dateStr}C${strikeStr}`

      const q = quoteMap.get(symbol)
      if (q) {
        const midPrice = q.bid && q.ask ? (q.bid + q.ask) / 2 : q.last
        const sign = l.type === 'short_call' ? -1 : 1
        const contracts = l.contracts * sign
        
        if (l.type === 'leap') {
          leapMarketValue += midPrice * l.contracts * 100
        } else {
          // Unrealized G/L for Short = (EntryPrice - CurrentPrice) * contracts * 100
          // Note: l.entry_price is stored as the absolute credit price (e.g. 30.85)
          shortUnrealizedPl += (l.entry_price - midPrice) * l.contracts * 100
          shortMarketValue -= midPrice * l.contracts * 100 // Negative liability
        }

        campTheta += (q.greeks?.theta || 0) * contracts * 100
        campDeltaDollars += (q.greeks?.delta || 0) * contracts * 100 * underlyingPrice
      }
    })

    const leapUnrealizedPl = leapMarketValue - totalInvested
    const unrealizedPl = leapUnrealizedPl + shortUnrealizedPl
    const netPl = realizedPl + unrealizedPl
    
    // Beta-Weighted Delta for this campaign
    const beta = camp.beta || 1.0
    const campBwd = (campDeltaDollars * beta) / spyPrice

    portfolioTheta += campTheta
    portfolioBwd += campBwd
    totalNlv += (leapMarketValue + shortMarketValue)
    totalRealizedPremium += realizedPl
    totalWarChestRequired += campWarChestRequired

    return {
      campaignId: camp.id,
      ticker: camp.ticker,
      totalInvested,
      totalPremium: realizedPl,
      marketValue: leapMarketValue, // This is what the UI shows as "Valorización LEAP"
      shortValue: shortMarketValue,
      unrealizedPl,
      netPl,
      recoveryPercent: totalInvested > 0 ? (realizedPl / totalInvested) * 100 : 0,
      status: camp.status,
      theta: campTheta,
      bwd: campBwd
    }
  }))

  // Available War Chest (Liquidity)
  const allPositions = await TradierService.fetchPositions()
  const bilSgovPositions = allPositions.filter(p => p.symbol === 'BIL' || p.symbol === 'SGOV')
  const warChestAvailable = bilSgovPositions.reduce((sum, p) => {
    const q = quoteMap.get(p.symbol)
    const price = q?.last || (q?.bid + q?.ask) / 2 || 100
    return sum + (p.quantity * price)
  }, 0)

  return {
    campaigns: campaignStats,
    portfolio: {
      netTheta: portfolioTheta,
      betaWeightedDelta: portfolioBwd,
      totalNlv: totalNlv + warChestAvailable,
      totalPremium: totalRealizedPremium,
      totalWarChestRequired,
      availableWarChest: warChestAvailable
    }
  }
}
