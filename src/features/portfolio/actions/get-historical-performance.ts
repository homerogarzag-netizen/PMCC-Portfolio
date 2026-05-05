'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { startOfMonth, format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { TradierService } from '../services/tradier-service'

export interface HistoricalDataPoint {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  cumulative: number;
}

export interface PerformanceStats {
  totalRealized: number;
  avgMonthlyIncome: number;
  maxDrawdown: number;
  bestMonth: number;
  worstMonth: number;
  winRate: number; // % of profitable months
}

export interface TickerContribution {
  ticker: string;
  net: number;
  income: number;
  expense: number;
  capital: number;
  leapUnrealized: number;
  shortUnrealized: number;
  totalNet: number;
}

export interface DailyStat {
  date: string;
  net: number;
  tradesCount: number;
}

export async function getHistoricalPerformance() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { monthly: [], tickerStats: [], daily: [], stats: null }

  // --- CONFIGURACIÓN: INICIO DE HISTORIAL ---
  const START_DATE = '2026-04-10'
  // ------------------------------------------

  try {
    const { data: campaigns, error: campError } = await supabase
      .from('pmcc_campaigns')
      .select(`
        id,
        ticker,
        option_legs(id, type, strike, contracts, expiration_date, entry_price, is_active),
        transactions(transaction_date, amount, type)
      `)
      .eq('user_id', session.user.id)

    if (campError || !campaigns) {
      console.error('DATABASE_ERROR:', campError)
      return { monthly: [], tickerStats: [], daily: [], stats: null }
    }

  // 1. Collect symbols for quotes
  const optionSymbols = campaigns.flatMap(c => 
    (c.option_legs || [])
      .filter((l: any) => l.is_active)
      .map((l: any) => {
        const dateStr = l.expiration_date.replace(/-/g, '').substring(2)
        const strikeStr = (l.strike * 1000).toString().padStart(8, '0')
        return `${c.ticker}${dateStr}C${strikeStr}`
      })
  )
  const tickers = campaigns.map(c => c.ticker)
  const allSymbols = [...new Set([...optionSymbols, ...tickers].filter(Boolean))]
  const quotes = await TradierService.fetchQuotes(allSymbols)
  const quoteMap = new Map(quotes.map(q => [q.symbol, q]))

  const monthlyMap = new Map<string, { income: number; expense: number; capital: number; net: number }>()
  const tickerMap = new Map<string, TickerContribution>()
  const dailyMap = new Map<string, { net: number; tickers: Set<string> }>()

  let totalRealized = 0
  let cumulative = 0
  let peak = 0
  let maxDrawdown = 0

  campaigns.forEach(camp => {
    const ticker = camp.ticker
    const t = tickerMap.get(ticker) || { ticker, net: 0, income: 0, expense: 0, capital: 0, leapUnrealized: 0, shortUnrealized: 0, totalNet: 0 }
    
    // Process Transactions for this ticker
    const txs = camp.transactions || []
    txs.forEach((tx: any) => {
      const date = parseISO(tx.transaction_date)
      const monthKey = format(date, 'yyyy-MM')
      const dayKey = format(date, 'yyyy-MM-dd')
      const amount = Number(tx.amount)
      const type = tx.type

      // 1. SIEMPRE AGREGAR A TICKER (HISTORIA COMPLETA)
      if (type === 'premium_collected') t.income += amount
      if (type === 'roll_cost') t.expense += amount
      if (type === 'initial_capital') t.capital += amount
      
      if (type !== 'initial_capital') {
        t.net += amount
        // El totalRealized global también debería ser historia completa para que la tabla sume bien
        totalRealized += amount
      }

      // 2. SOLO AGREGAR A CALENDARIO Y MENSUAL SI ES >= START_DATE
      if (tx.transaction_date >= START_DATE) {
        const m = monthlyMap.get(monthKey) || { income: 0, expense: 0, capital: 0, net: 0 }
        if (type === 'premium_collected') m.income += amount
        if (type === 'roll_cost') m.expense += amount
        if (type === 'initial_capital') m.capital += amount
        
        if (type !== 'initial_capital') {
          m.net += amount
          const d = dailyMap.get(dayKey) || { net: 0, tickers: new Set<string>() }
          d.net += amount
          d.tickers.add(ticker)
          dailyMap.set(dayKey, d)
        }
        monthlyMap.set(monthKey, m)
      }
    })

    // Calculate Unrealized for this ticker
    const legs = camp.option_legs?.filter((l: any) => l.is_active) || []
    let leapMarketValue = 0
    let shortUnrealizedPl = 0
    
    // Initial Capital logic matching Bunker
    const initialCapitalSum = (camp.transactions || [])
      .filter((tx: any) => tx.type === 'initial_capital')
      .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0)
    
    const leapCostBasis = legs.filter((l: any) => l.type === 'leap').reduce((sum: number, l: any) => sum + (l.entry_price * l.contracts * 100), 0)
    const totalInvested = initialCapitalSum !== 0 ? -initialCapitalSum : leapCostBasis

    legs.forEach((l: any) => {
      const dateStr = l.expiration_date.replace(/-/g, '').substring(2)
      const strikeStr = (l.strike * 1000).toString().padStart(8, '0')
      const symbol = `${camp.ticker}${dateStr}C${strikeStr}`
      const q = quoteMap.get(symbol)
      if (q) {
        const midPrice = q.bid && q.ask ? (q.bid + q.ask) / 2 : q.last
        if (l.type === 'leap') {
          leapMarketValue += midPrice * l.contracts * 100
        } else {
          shortUnrealizedPl += (l.entry_price - midPrice) * l.contracts * 100
        }
      }
    })

    t.leapUnrealized = leapMarketValue - totalInvested
    t.shortUnrealized = shortUnrealizedPl
    t.totalNet = t.net + t.leapUnrealized + t.shortUnrealized
    tickerMap.set(ticker, t)
  })

  // 4. Fetch Snapshots for Daily P&L Deltas
  const { data: snapshots } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('user_id', session.user.id)
    .gte('snapshot_date', START_DATE)
    .order('snapshot_date', { ascending: true })

  // Transform Snapshot Data for Charts and Monthly Totals
  const monthly: HistoricalDataPoint[] = []
  const snapshotsSorted = [...(snapshots || [])].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
  
  if (snapshotsSorted.length > 0) {
    const snapshotsByMonth = new Map<string, { income: number; expense: number; net: number }>()
    
    // Calcular deltas mensuales basados en snapshots
    snapshotsSorted.forEach((s, idx) => {
      const date = parseISO(s.snapshot_date)
      const monthKey = format(date, 'yyyy-MM')
      const m = snapshotsByMonth.get(monthKey) || { income: 0, expense: 0, net: 0 }
      
      const prevS = snapshotsSorted[idx - 1]
      const delta = prevS ? Number(s.total_net_pl) - Number(prevS.total_net_pl) : 0
      
      m.net += delta
      // Para income/expense en la gráfica mensual, usamos lo realizado ese mes
      const realizedInMonth = monthlyMap.get(monthKey)
      m.income = realizedInMonth?.income || 0
      m.expense = Math.abs(realizedInMonth?.expense || 0)
      
      snapshotsByMonth.set(monthKey, m)
    })

    let tempCumulative = snapshotsSorted[0] ? Number(snapshotsSorted[0].total_net_pl) : 0
    peak = tempCumulative

    Array.from(snapshotsByMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([key, val]) => {
        // En lugar de sumar deltas para la curva de equidad, usamos el último snapshot del mes
        const lastSnapshotOfMonth = snapshotsSorted
          .filter(s => s.snapshot_date.startsWith(key))
          .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0]
        
        const currentNetWorth = lastSnapshotOfMonth ? Number(lastSnapshotOfMonth.total_net_pl) : tempCumulative

        if (currentNetWorth > peak) peak = currentNetWorth
        const dd = peak > currentNetWorth ? peak - currentNetWorth : 0
        if (dd > maxDrawdown) maxDrawdown = dd

        monthly.push({
          date: key,
          label: format(parseISO(`${key}-01`), 'MMM yy', { locale: es }),
          income: val.income,
          expense: val.expense,
          net: val.net,
          cumulative: currentNetWorth
        })
      })
  }

  const tickerStats = Array.from(tickerMap.values()).sort((a, b) => b.totalNet - a.net)

  const daily: DailyStat[] = []
  
  // Create a map of all days that have activity or snapshots
  // FILTRO DE SEGURIDAD FINAL: Solo días >= START_DATE
  const allDays = new Set<string>()
  
  // Agregar días de transacciones (ya filtrados, pero reforzamos)
  dailyMap.forEach((_, date) => {
    if (date >= START_DATE) allDays.add(date)
  })
  
  // Agregar días de snapshots (ya filtrados, pero reforzamos)
  snapshots?.forEach(s => {
    if (s.snapshot_date >= START_DATE) allDays.add(s.snapshot_date)
  })

  const sortedDays = Array.from(allDays).sort()

  sortedDays.forEach((dateStr, idx) => {
    const snapshot = snapshots?.find(s => s.snapshot_date === dateStr)
    
    let net = 0
    if (snapshot) {
      // Buscar la foto anterior más reciente (sin importar si fue ayer o hace 3 días)
      const prevSnapshot = snapshots
        ?.filter(s => s.snapshot_date < dateStr)
        .sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date))[0]

      if (prevSnapshot) {
        net = Number(snapshot.total_net_pl) - Number(prevSnapshot.total_net_pl)
      } else {
        // Si es la primera foto de la historia, podemos usar el valor acumulado o fallback
        net = dailyMap.get(dateStr)?.net || 0
      }
    } else {
      // Fallback a transacciones realizadas si no hay foto para este día
      net = dailyMap.get(dateStr)?.net || 0
    }

    daily.push({
      date: dateStr,
      net: net,
      tradesCount: dailyMap.get(dateStr)?.tickers.size || 0
    })
  })

  // Basic Stats
  const profitableMonths = monthly.filter(m => m.net > 0).length
  const allMonths = monthly.length
  const stats: PerformanceStats = {
    totalRealized,
    avgMonthlyIncome: allMonths > 0 ? totalRealized / allMonths : 0,
    maxDrawdown,
    bestMonth: Math.max(...monthly.map(m => m.net), 0),
    worstMonth: Math.min(...monthly.map(m => m.net), 0),
    winRate: allMonths > 0 ? (profitableMonths / allMonths) * 100 : 0
  }

    return { monthly, tickerStats, daily, stats }
  } catch (err) {
    console.error('CRITICAL PERFORMANCE ERROR:', err)
    return { monthly: [], tickerStats: [], daily: [], stats: null }
  }
}
