'use server'

import { TradierService } from '@/features/portfolio/services/tradier-service'

export async function getTickerExpirations(symbol: string) {
  try {
    const expirations = await TradierService.fetchExpirations(symbol)
    const quote = await TradierService.fetchQuotes([symbol])
    return {
      expirations,
      underlyingPrice: quote[0]?.last || 0
    }
  } catch (err) {
    return { error: 'Ticker not found or API error' }
  }
}

export async function getOptionsForExpiration(symbol: string, expiration: string) {
  try {
    const chain = await TradierService.fetchOptionChain(symbol, expiration)
    // Return sorted calls
    return chain
      .filter((o: any) => o.option_type === 'call')
      .sort((a: any, b: any) => a.strike - b.strike)
  } catch (err) {
    return { error: 'Error fetching option chain' }
  }
}
