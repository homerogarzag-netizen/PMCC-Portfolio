'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { getPerformanceSummary } from './get-performance-summary'
import { format } from 'date-fns'

export async function takePortfolioSnapshot() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Check if snapshot already exists for today
  const { data: existing } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('snapshot_date', todayStr)
    .single()

  // New York Time check for 3:50 PM ET
  const now = new Date()
  const nyTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).format(now)
  
  const [hours, minutes] = nyTime.split(':').map(Number)
  const isPastSnapshotTime = hours > 15 || (hours === 15 && minutes >= 50)

  // If we already have a snapshot and it's PAST 3:50 PM, we "freeze" it.
  // Don't update anymore to avoid post-market spreads.
  if (existing && isPastSnapshotTime) return null

  // Get current state from the Bunker logic (the source of truth)
  const { portfolio } = await getPerformanceSummary()
  if (!portfolio) return null

  // Calculate totals
  const totalRealized = portfolio.totalPremium
  
  // For unrealized, we need to sum up from all campaigns
  // Actually, getPerformanceSummary already has most of it.
  // totalNlv is (LeapMarketValue + ShortMarketValue + WarChest)
  // But we want to store the components for future auditing.
  
  // Let's just calculate the Total Net P&L sum across all campaigns
  const { campaigns } = await getPerformanceSummary()
  const totalNetPl = campaigns.reduce((sum, c) => sum + c.netPl, 0)
  const totalLeapUnrealized = campaigns.reduce((sum, c) => sum + (c.marketValue - c.totalInvested), 0)
  const totalShortUnrealized = campaigns.reduce((sum, c) => sum + (c.unrealizedPl - (c.marketValue - c.totalInvested)), 0)

  const { error } = await supabase
    .from('portfolio_snapshots')
    .upsert({
      id: existing?.id, // If it exists, update it. If not, Postgres creates it.
      user_id: session.user.id,
      snapshot_date: todayStr,
      total_realized: totalRealized,
      total_unrealized_leap: totalLeapUnrealized,
      total_unrealized_short: totalShortUnrealized,
      total_net_pl: totalNetPl
    })

  if (error) {
    console.error('CRITICAL: Error taking snapshot:', JSON.stringify(error, null, 2))
    return { error: error.message }
  }

  return { success: true, total: totalNetPl }
}
