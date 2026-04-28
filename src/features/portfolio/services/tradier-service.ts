export interface TradierPosition {
  id: number
  symbol: string
  quantity: number
  cost_basis: number
  date_acquired: string
}

export interface ParsedOption {
  ticker: string
  symbol: string 
  expiration: string
  type: 'C' | 'P'
  strike: number
  isOption: boolean
  contracts: number
  entryPrice: number
}

export interface PMCCGroup {
  ticker: string
  leap: ParsedOption
  shortCalls: ParsedOption[]
}

export interface TradierGainLoss {
  close_date: string
  cost: number
  gain_loss: number
  gain_loss_percent: number
  open_date: string
  proceeds: number
  quantity: number
  symbol: string
}

export interface TradierHistoryEvent {
  amount: number
  date: string
  type: string
  trade?: {
    symbol: string
    quantity: number
    price: number
    trade_type: string
  }
}

export class TradierService {
  private static TOKEN = process.env.TRADIER_TOKEN
  private static ACCOUNT_ID = process.env.TRADIER_ACCOUNT_ID

  /**
   * Fetches Realized Gain/Loss from Tradier
   */
  static async fetchGainLoss(start?: string, end?: string, page: number = 1): Promise<TradierGainLoss[]> {
    const url = new URL(`https://api.tradier.com/v1/accounts/${this.ACCOUNT_ID}/gainloss`)
    if (start) url.searchParams.append('start', start)
    if (end) url.searchParams.append('end', end)
    url.searchParams.append('page', page.toString())
    url.searchParams.append('limit', '100')

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.TOKEN}`,
        Accept: 'application/json',
      },
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      throw new Error(`Tradier GainLoss API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const gainloss = data.gainloss?.closed_position || []
    return Array.isArray(gainloss) ? gainloss : [gainloss]
  }

  /**
   * Fetches current market quotes from Tradier
   */
  static async fetchQuotes(symbols: string[]): Promise<any[]> {
    if (symbols.length === 0) return []
    
    // Use market quotes for data and greeks
    const quoteUrl = new URL('https://api.tradier.com/v1/markets/quotes')
    quoteUrl.searchParams.append('symbols', symbols.join(','))
    quoteUrl.searchParams.append('greeks', 'true')

    const response = await fetch(quoteUrl.toString(), {
      headers: {
        Authorization: `Bearer ${this.TOKEN}`,
        Accept: 'application/json',
      },
      next: { revalidate: 0 },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Tradier Quotes API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const quotes = data.quotes?.quote || []
    return Array.isArray(quotes) ? quotes : [quotes]
  }

  /**
   * Fetches transaction history from Tradier
   */
  static async fetchHistory(start?: string, page: number = 1): Promise<TradierHistoryEvent[]> {
    const url = new URL(`https://api.tradier.com/v1/accounts/${this.ACCOUNT_ID}/history`)
    if (start) url.searchParams.append('start', start)
    url.searchParams.append('page', page.toString())
    url.searchParams.append('limit', '500')

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.TOKEN}`,
        Accept: 'application/json',
      },
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      throw new Error(`Tradier History API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const events = data.history?.event || []
    return Array.isArray(events) ? events : [events]
  }

  /**
   * Parses an OCC option symbol into its components
   */
  static parseOptionSymbol(symbol: string, quantity: number, costBasis: number): ParsedOption {
    const regex = /^([A-Z]+)(\d{6})([CP])(\d{8})$/
    const match = symbol.match(regex)

    if (!match) {
      return {
        ticker: symbol,
        symbol: symbol,
        expiration: '',
        type: 'C',
        strike: 0,
        isOption: false,
        contracts: quantity,
        entryPrice: costBasis / Math.abs(quantity || 1),
      }
    }

    const [_, ticker, expPart, type, strikePart] = match
    const year = `20${expPart.substring(0, 2)}`
    const month = expPart.substring(2, 4)
    const day = expPart.substring(4, 6)
    const expiration = `${year}-${month}-${day}`
    const strike = parseInt(strikePart) / 1000

    return {
      ticker,
      symbol,
      expiration,
      type: type as 'C' | 'P',
      strike,
      isOption: true,
      contracts: quantity,
      entryPrice: quantity !== 0 ? Math.abs(costBasis / quantity) / 100 : 0, 
    }
  }

  static async fetchPositions(): Promise<TradierPosition[]> {
    const response = await fetch(
      `https://api.tradier.com/v1/accounts/${this.ACCOUNT_ID}/positions`,
      {
        headers: {
          Authorization: `Bearer ${this.TOKEN}`,
          Accept: 'application/json',
        },
        next: { revalidate: 0 },
        cache: 'no-store'
      }
    )

    if (!response.ok) {
      throw new Error(`Tradier API failed: ${response.statusText}`)
    }

    const data = await response.json()
    const positions = data.positions?.position || []
    return Array.isArray(positions) ? positions : [positions]
  }

  static groupIntoPMCC(positions: TradierPosition[]): PMCCGroup[] {
    const parsed = positions.map(p => this.parseOptionSymbol(p.symbol, p.quantity, p.cost_basis))
    const tickers = [...new Set(parsed.map(p => p.ticker))]
    
    const groups: PMCCGroup[] = []

    tickers.forEach(ticker => {
      const tickerOptions = parsed.filter(p => p.ticker === ticker && p.isOption && p.type === 'C')
      const leaps = tickerOptions.filter(p => p.contracts > 0)
      const shortCalls = tickerOptions.filter(p => p.contracts < 0)

      if (leaps.length > 0) {
        groups.push({
          ticker,
          leaps,
          shortCalls
        })
      }
    })

    return groups
  }

  static async fetchExpirations(symbol: string): Promise<string[]> {
    const url = new URL('https://api.tradier.com/v1/markets/options/expirations')
    url.searchParams.append('symbol', symbol)
    url.searchParams.append('includeAllRoots', 'true')

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.TOKEN}`,
        Accept: 'application/json',
      },
      next: { revalidate: 0 }
    })

    if (!response.ok) throw new Error(`Tradier Expirations API failed: ${response.statusText}`)
    const data = await response.json()
    const expirations = data.expirations?.date || []
    return Array.isArray(expirations) ? expirations : [expirations]
  }

  static async fetchOptionChain(symbol: string, expiration: string): Promise<any[]> {
    const url = new URL('https://api.tradier.com/v1/markets/options/chains')
    url.searchParams.append('symbol', symbol)
    url.searchParams.append('expiration', expiration)
    url.searchParams.append('greeks', 'true')

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.TOKEN}`,
        Accept: 'application/json',
      },
      next: { revalidate: 0 }
    })

    if (!response.ok) throw new Error(`Tradier Chains API failed: ${response.statusText}`)
    const data = await response.json()
    const options = data.options?.option || []
    return Array.isArray(options) ? options : [options]
  }

  static async getATMPremium(symbol: string): Promise<number> {
    try {
      const quotes = await this.fetchQuotes([symbol])
      const underlyingPrice = quotes[0]?.last || 0
      if (underlyingPrice === 0) return 0

      const expirations = await this.fetchExpirations(symbol)
      const nearestExp = expirations[0]
      if (!nearestExp) return 0

      const chain = await this.fetchOptionChain(symbol, nearestExp)
      const calls = chain.filter(o => o.option_type === 'call')
      if (calls.length === 0) return 0

      const atmCall = calls.reduce((prev, curr) => {
        return (Math.abs(curr.strike - underlyingPrice) < Math.abs(prev.strike - underlyingPrice) ? curr : prev)
      })

      const mark = (atmCall.bid + atmCall.ask) / 2
      return mark > 0 ? mark : atmCall.last
    } catch (err) {
      console.error(`[TradierService] Error getting ATM premium for ${symbol}:`, err)
      return 0
    }
  }
}
