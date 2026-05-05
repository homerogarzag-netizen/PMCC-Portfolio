'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { TradierService } from '../services/tradier-service'
import { revalidatePath } from 'next/cache'

export interface MissingTransaction {
  campaign_id: string
  ticker: string
  type: string
  amount: number
  description: string
  transaction_date: string
}

export async function scanMissingTransactions(tickerFilter?: string | null): Promise<{ success: boolean, missing?: MissingTransaction[], error?: string }> {
  try {
    const supabase = await createClient() 
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Unauthorized')
    const userId = session.user.id

    // 1. Get all active campaigns to know which tickers we care about
    let query = supabase
      .from('pmcc_campaigns')
      .select('id, ticker')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (tickerFilter) {
      query = query.eq('ticker', tickerFilter)
    }

    const { data: activeCampaigns } = await query

    if (!activeCampaigns || activeCampaigns.length === 0) {
      return { success: true, missing: [] }
    }

    // 2. Fetch all transactions currently in Supabase for these campaigns
    const campaignIds = activeCampaigns.map(c => c.id)
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('campaign_id, amount, transaction_date')
      .in('campaign_id', campaignIds)
      
    // Create a Set for fast lookup: "campaign_id|date(YYYY-MM-DD)|amount"
    // Normalizing the date is crucial because Supabase returns +00:00 and Tradier returns Z
    // We do NOT use description here because older records in Supabase have a legacy description format
    const existingSet = new Set(existingTxs?.map(tx => 
      `${tx.campaign_id}|${tx.transaction_date.split('T')[0]}|${Number(tx.amount)}`
    ))

    // 3. Deep Scan Tradier History (since beginning of time, e.g., 2020)
    let historyPage = 1
    let hasMoreHistory = true
    const missingTransactions: MissingTransaction[] = []

    while (hasMoreHistory && historyPage <= 15) {
      const history = await TradierService.fetchHistory('2020-01-01', historyPage)
      
      if (history.length === 0) {
        hasMoreHistory = false
        break
      }

      for (const event of history) {
        if (event.type !== 'trade' || !event.trade || event.trade.trade_type !== 'option') continue
        
        const tickerInfo = TradierService.parseOptionSymbol(event.trade.symbol, event.trade.quantity, 0)
        
        // Ignore PUTs
        if (tickerInfo.type === 'P') continue

        const campaign = activeCampaigns.find(c => c.ticker === tickerInfo.ticker)
        if (!campaign) continue

        // Check if this event exists in Supabase using the normalized key
        const uniqueKey = `${campaign.id}|${event.date.split('T')[0]}|${Number(event.amount)}`
        
        if (!existingSet.has(uniqueKey)) {
          // It's missing! Determine type
          const tradeDate = new Date(event.date.split('T')[0] + 'T00:00:00Z')
          const expDate = new Date(tickerInfo.expiration + 'T00:00:00Z')
          const daysToExp = Math.floor((expDate.getTime() - tradeDate.getTime()) / (1000 * 3600 * 24))
          
          let type = event.amount > 0 ? 'premium_collected' : 'roll_cost'
          if (event.trade.quantity > 0 && daysToExp > 180) {
            type = 'initial_capital'
          }

          const action = event.trade.quantity > 0 ? 'BUY' : 'SELL'
          const qty = Math.abs(event.trade.quantity)
          const description = `${action} ${qty} ${event.trade.symbol} @ ${event.trade.price}`

          missingTransactions.push({
            campaign_id: campaign.id,
            ticker: campaign.ticker,
            type,
            amount: event.amount,
            description,
            transaction_date: event.date
          })
        }
      }

      if (history.length < 500) {
        hasMoreHistory = false
      } else {
        historyPage++
      }
    }

    return { success: true, missing: missingTransactions }

  } catch (error: any) {
    console.error('Scan Missing Transactions Error:', error)
    return { success: false, error: error.message }
  }
}

export async function restoreTransactions(transactions: MissingTransaction[]) {
  try {
    const supabase = await createClient() 
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Unauthorized')

    if (transactions.length === 0) return { success: true }

    // Strip out the 'ticker' field as it's not in the transactions table
    const inserts = transactions.map(({ ticker, ...rest }) => rest)

    const { error } = await supabase.from('transactions').insert(inserts)
    
    if (error) throw error

    revalidatePath('/log')
    revalidatePath('/')
    
    return { success: true }
  } catch (error: any) {
    console.error('Restore Transactions Error:', error)
    return { success: false, error: error.message }
  }
}
