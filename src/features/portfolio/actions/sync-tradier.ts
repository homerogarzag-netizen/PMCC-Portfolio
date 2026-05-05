'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { TradierService } from '../services/tradier-service'
import { revalidatePath } from 'next/cache'

export async function syncTradierAction() {
  try {
    const supabase = await createClient() 
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Unauthorized')
    const userId = session.user.id

    // 1. Sync Current Positions
    // Deactivamos todas las piernas primero para asegurar que posiciones cerradas desaparezcan
    await supabase.from('option_legs')
      .update({ is_active: false })
      .in('campaign_id', (await supabase.from('pmcc_campaigns').select('id').eq('user_id', userId)).data?.map(c => c.id) || [])

    const positions = await TradierService.fetchPositions()
    const pmccGroups = TradierService.groupIntoPMCC(positions)

    for (const group of pmccGroups) {
      // Calcular metadata unificada (promedio de strikes y suma de capital)
      const totalContracts = group.leaps.reduce((sum, l) => sum + l.contracts, 0)
      const totalCapital = group.leaps.reduce((sum, l) => sum + (l.entryPrice * l.contracts * 100), 0)
      const avgStrike = group.leaps.reduce((sum, l) => sum + (l.strike * l.contracts), 0) / totalContracts

      const { data: campaign } = await supabase
        .from('pmcc_campaigns')
        .upsert({
          user_id: userId,
          ticker: group.ticker,
          status: 'active',
          capital_allocated: totalCapital,
          main_leap_strike: avgStrike,
          main_leap_expiration: group.leaps[0].expiration, // Usar la primera como referencia
          main_leap_symbol: group.leaps[0].symbol
        }, { onConflict: 'user_id,ticker' })
        .select()
        .single()

      if (campaign) {
        // Limpiar piernas anteriores (sincronización destructiva para el estado actual)
        await supabase.from('option_legs').update({ is_active: false }).eq('campaign_id', campaign.id)
        
        const allLegs = []

        // Collect LEAP legs
        for (const leap of group.leaps) {
          allLegs.push({
            campaign_id: campaign.id,
            type: 'leap',
            strike: leap.strike,
            expiration_date: leap.expiration,
            contracts: leap.contracts,
            entry_price: leap.entryPrice,
            is_active: true
          })
        }

        // Collect Short Call legs
        for (const short of group.shortCalls) {
          allLegs.push({
            campaign_id: campaign.id,
            type: 'short_call',
            strike: short.strike,
            expiration_date: short.expiration,
            contracts: Math.abs(short.contracts),
            entry_price: short.entryPrice,
            is_active: true
          })
        }

        // Bulk insert all legs for this campaign
        if (allLegs.length > 0) {
          const { error: legError } = await supabase.from('option_legs').insert(allLegs)
          if (legError) throw legError
        }
      }
    }

    // 2. Sync History (La Bitácora) - Incremental Delta Sync
    const { data: lastTx } = await supabase
      .from('transactions')
      .select('transaction_date')
      .order('transaction_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const historyStartDate = lastTx ? lastTx.transaction_date.split('T')[0] : '2024-01-01'
    console.log(`[SyncHistory] Iniciando Delta Sync desde: ${historyStartDate}`)
    
    // Get all existing transactions since the start date for bulk comparison
    const { data: existingTxs } = await supabase
      .from('transactions')
      .select('campaign_id, amount, transaction_date, description')
      .gte('transaction_date', historyStartDate)

    const existingSet = new Set(existingTxs?.map(tx => 
      `${tx.campaign_id}|${tx.transaction_date.split('T')[0]}|${Number(tx.amount)}`
    ))

    let historyPage = 1
    let hasMoreHistory = true
    let transactionCount = 0
    const newTransactions = []
    
    // Get only ACTIVE campaigns for mapping to prevent mixing with closed ones
    const { data: activeCampaigns } = await supabase
      .from('pmcc_campaigns')
      .select('id, ticker')
      .eq('user_id', userId)
      .eq('status', 'active')

    while (hasMoreHistory && historyPage <= 10) {
      const history = await TradierService.fetchHistory(historyStartDate, historyPage)
      console.log(`[SyncHistory] Procesando página ${historyPage} (${history.length} eventos)`)
      
      if (history.length === 0) {
        hasMoreHistory = false
        break
      }

      for (const event of history) {
        if (event.type !== 'trade' || !event.trade || event.trade.trade_type !== 'option') continue
        
        const ticker = TradierService.parseOptionSymbol(event.trade.symbol, event.trade.quantity, 0).ticker
        const campaign = activeCampaigns?.find(c => c.ticker === ticker)
        if (!campaign) continue

        const tickerInfo = TradierService.parseOptionSymbol(event.trade.symbol, event.trade.quantity, 0)
        
        // Ignore PUTs (PMCC only uses Calls)
        if (tickerInfo.type === 'P') continue

        // Duplicate Check (Idempotencia) using local Set
        const uniqueKey = `${campaign.id}|${event.date.split('T')[0]}|${Number(event.amount)}`

        if (!existingSet.has(uniqueKey)) {
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

          newTransactions.push({
            campaign_id: campaign.id,
            type,
            amount: event.amount,
            description,
            transaction_date: event.date
          })
          transactionCount++
        }
      }

      if (history.length < 500) {
        hasMoreHistory = false
      } else {
        historyPage++
      }
    }

    // Bulk Insert new transactions from history
    if (newTransactions.length > 0) {
      const { error: insError } = await supabase.from('transactions').insert(newTransactions)
      if (insError) throw insError
    }

    // 3. Sync Realized Gain/Loss - Incremental Delta Sync
    const { data: lastGl } = await supabase
      .from('closed_trades')
      .select('close_date')
      .order('close_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const glStartDate = lastGl ? lastGl.close_date.split('T')[0] : '2025-11-01'
    console.log(`[SyncGainLoss] Iniciando Delta Sync desde: ${glStartDate}`)
    
    let glPage = 1
    let hasMoreGl = true

    while (hasMoreGl && glPage <= 20) {
      const closedPositions = await TradierService.fetchGainLoss(glStartDate, undefined, glPage)
      console.log(`[SyncGainLoss] Procesando página ${glPage} (${closedPositions.length} trades)`)
      
      if (closedPositions.length === 0) {
        hasMoreGl = false
        break
      }

      const glUpserts = []

      for (const cp of closedPositions) {
        // Intentar encontrar la campaña por Ticker
        const ticker = TradierService.parseOptionSymbol(cp.symbol, cp.quantity, cp.cost).ticker
        
        const campaign = activeCampaigns?.find(c => c.ticker === ticker)
        
        if (!campaign) continue

        glUpserts.push({
          external_id: `gl-${cp.symbol}-${cp.close_date}-${cp.quantity}`,
          user_id: userId,
          campaign_id: campaign.id,
          symbol: cp.symbol,
          ticker,
          close_date: cp.close_date,
          open_date: cp.open_date,
          cost: cp.cost,
          proceeds: cp.proceeds,
          gain_loss: cp.gain_loss,
          gain_loss_percent: cp.gain_loss_percent,
          quantity: cp.quantity
        })
      }

      if (glUpserts.length > 0) {
        const { error: glError } = await supabase.from('closed_trades').upsert(glUpserts, { onConflict: 'external_id' })
        if (glError) throw glError
      }

      if (closedPositions.length < 100) {
        hasMoreGl = false
      } else {
        glPage++
      }
    }

    revalidatePath('/')
    revalidatePath('/log')
    return { 
      success: true, 
      campaignCount: pmccGroups.length,
      transactionCount: transactionCount 
    }

  } catch (error: any) {
    console.error('Tradier Sync Error:', error)
    return { success: false, error: error.message }
  }
}
