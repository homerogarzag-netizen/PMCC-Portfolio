import { RadarDashboard } from '@/features/radar/components/radar-dashboard'
import { getWatchlist } from '@/features/radar/actions/watchlist-actions'
import { scanOpportunities } from '@/features/radar/actions/scan-opportunities'

export default async function RadarPage() {
  const watchlist = await getWatchlist()
  const opportunities = await scanOpportunities(watchlist)

  return (
    <div className="flex-1 overflow-auto bg-[#020617] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 italic tracking-tighter">EL RADAR</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-mono mt-1">
              Market Surveillance & Opportunity Identification
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-zinc-600 block">SCAN STATUS</span>
            <span className="text-[10px] font-bold text-emerald-500 uppercase flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time Active
            </span>
          </div>
        </header>

        <RadarDashboard initialOpportunities={opportunities} />
      </div>
    </div>
  )
}
