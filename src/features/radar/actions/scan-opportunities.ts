'use server'

import { TradierService } from '@/features/portfolio/services/tradier-service'

export interface RadarOpportunity {
  ticker: string
  price: number
  change: number
  changePercent: number
  iv: number
  volume: number
  score: number
  id: string
  leapAudit?: {
    strike: number
    expiration: string
    extrinsicRatio: number
    delta: number
    oi: number
    volume: number
    midPrice: number
    isGolden: boolean
  }
}

export async function scanOpportunities(watchlist: { id: string, ticker: string }[]): Promise<RadarOpportunity[]> {
  if (watchlist.length === 0) return []

  const tickers = watchlist.map(w => w.ticker)
  const quotes = await TradierService.fetchQuotes(tickers)
  const quoteMap = new Map(quotes.map(q => [q.symbol, q]))

  const opportunities: RadarOpportunity[] = await Promise.all(watchlist.map(async (item) => {
    const q = quoteMap.get(item.ticker)
    if (!q) return null

    // DEEP LEAP HUNTER LOGIC
    let leapAudit: RadarOpportunity['leapAudit'] = undefined
    
    try {
      const expirations = await TradierService.fetchExpirations(item.ticker)
      // Filter for target window: Dec 2026 to Jun 2027
      const targetExps = expirations.filter(exp => {
        const date = new Date(exp)
        const year = date.getFullYear()
        const month = date.getMonth() // 0-indexed
        return (year === 2026 && month === 11) || (year === 2027 && month <= 5)
      })

      let bestStrike: any = null
      let lowestExtrinsic = 999

      // Check each target expiration for the best liquid LEAP
      for (const exp of targetExps) {
        const chain = await TradierService.fetchOptionChain(item.ticker, exp)
        const candidates = chain.filter(o => 
          o.option_type === 'call' && 
          o.greeks?.delta >= 0.80 && 
          o.greeks?.delta <= 0.90 &&
          o.open_interest > 50 &&
          o.volume >= 0
        )

        for (const opt of candidates) {
          const mid = (opt.bid + opt.ask) / 2 || opt.last
          const intrinsic = Math.max(0, q.last - opt.strike)
          const extrinsic = mid - intrinsic
          const ratio = (extrinsic / mid) * 100

          if (ratio < lowestExtrinsic) {
            lowestExtrinsic = ratio
            bestStrike = {
              strike: opt.strike,
              expiration: exp,
              extrinsicRatio: ratio,
              delta: opt.greeks?.delta,
              oi: opt.open_interest,
              volume: opt.volume,
              midPrice: mid,
              isGolden: ratio < 10
            }
          }
        }
      }
      leapAudit = bestStrike
    } catch (err) {
      console.error(`[Hunter] Error auditing ${item.ticker}:`, err)
    }

    // Scoring Heuristic
    let score = 5
    if (q.change_percentage > 0) score += 1
    if (leapAudit?.isGolden) score += 3
    if (leapAudit && !leapAudit.isGolden && leapAudit.extrinsicRatio < 15) score += 1

    return {
      id: item.id,
      ticker: item.ticker,
      price: q.last,
      change: q.change,
      changePercent: q.change_percentage,
      iv: q.greeks?.mid_iv || 0,
      volume: q.volume,
      score: Math.min(10, score),
      leapAudit
    }
  }))

  return opportunities.filter(o => o !== null) as RadarOpportunity[]
}
