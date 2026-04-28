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
        
        // Insertar todas las piernas LEAP
        for (const leap of group.leaps) {
          await supabase.from('option_legs').insert({
            campaign_id: campaign.id,
            type: 'leap',
            strike: leap.strike,
            expiration_date: leap.expiration,
            contracts: leap.contracts,
            entry_price: leap.entryPrice,
            is_active: true
          })
        }

        // Insertar todas las piernas Short Call
        for (const short of group.shortCalls) {
          await supabase.from('option_legs').insert({
            campaign_id: campaign.id,
            type: 'short_call',
            strike: short.strike,
            expiration_date: short.expiration,
            contracts: Math.abs(short.contracts),
            entry_price: short.entryPrice,
            is_active: true
          })
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

    const historyStartDate = lastTx ? lastTx.transaction_date.split('T')[0] : '2025-11-01'
    console.log(`[SyncHistory] Iniciando Delta Sync desde: ${historyStartDate}`)
    
    let historyPage = 1
    let hasMoreHistory = true
    let transactionCount = 0
    
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

        const tradeDate = new Date(event.date.split('T')[0] + 'T00:00:00Z')
        const expDate = new Date(tickerInfo.expiration + 'T00:00:00Z')
        const daysToExp = Math.floor((expDate.getTime() - tradeDate.getTime()) / (1000 * 3600 * 24))
        
        let type = event.amount > 0 ? 'premium_collected' : 'roll_cost'
        if (event.trade.quantity > 0 && daysToExp > 180) {
          type = 'initial_capital'
        }

        // FORCE consistent description with quantity: "ACTION QTY SYMBOL @ PRICE"
        const action = event.trade.quantity > 0 ? 'BUY' : 'SELL'
        const qty = Math.abs(event.trade.quantity)
        const description = `${action} ${qty} ${event.trade.symbol} @ ${event.trade.price}`
        
        // Duplicate Check (Idempotencia)
        const { data: existing } = await supabase
          .from('transactions')
          .select('id, type, description')
          .eq('campaign_id', campaign.id)
          .eq('transaction_date', event.date)
          .eq('amount', event.amount)
          .limit(1)
          .maybeSingle()

        if (!existing) {
          await supabase.from('transactions').insert({
            campaign_id: campaign.id,
            type,
            amount: event.amount,
            description,
            transaction_date: event.date
          })
          transactionCount++
        } else if (existing.description !== description) {
          // Solo actualizamos la descripción si le falta la cantidad (registros viejos)
          // NUNCA sobreescribimos el 'type' para respetar las ediciones manuales del usuario.
          await supabase.from('transactions').update({ description }).eq('id', existing.id)
        }
      }

      if (history.length < 500) {
        hasMoreHistory = false
      } else {
        historyPage++
      }
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

      for (const cp of closedPositions) {
        // Intentar encontrar la campaña por Ticker
        const ticker = TradierService.parseOptionSymbol(cp.symbol, cp.quantity, cp.cost).ticker
        
        const { data: campaign } = await supabase
          .from('pmcc_campaigns')
          .select('id')
          .eq('user_id', userId)
          .eq('ticker', ticker)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        if (!campaign) continue

        await supabase.from('closed_trades').upsert({
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
        }, { onConflict: 'external_id' })
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
