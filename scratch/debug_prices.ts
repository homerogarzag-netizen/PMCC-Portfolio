import { TradierService } from './src/features/portfolio/services/tradier-service.ts'

async function debugPrices() {
  console.log('--- DEBUGGING PRICES FOR XLE ---')
  
  // 1. Fetch positions to see raw cost_basis
  const positions = await TradierService.fetchPositions()
  const xlePositions = positions.filter(p => p.symbol.startsWith('XLE'))
  console.log('Positions:', JSON.stringify(xlePositions, null, 2))

  // 2. Fetch quotes to see bid/ask/last
  const symbols = xlePositions.map(p => p.symbol)
  const quotes = await TradierService.fetchQuotes(symbols)
  console.log('Quotes:', JSON.stringify(quotes, null, 2))
}

debugPrices()
