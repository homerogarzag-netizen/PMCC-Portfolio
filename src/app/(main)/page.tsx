export const dynamic = 'force-dynamic'

import { getPerformanceSummary } from '@/features/portfolio/actions/get-performance-summary'
import { CampaignTable } from '@/features/portfolio/components/campaign-table'
import { SyncTradierButton } from '@/features/portfolio/components/sync-tradier-button'
import { RefreshButton } from '@/features/portfolio/components/refresh-button'
import { PortfolioMetrics } from '@/features/portfolio/components/portfolio-metrics'

export default async function BunkerPage() {
  const { portfolio } = await getPerformanceSummary()

  return (
    <div className="flex flex-col lg:flex-row gap-8 relative items-start">
      {/* Sidebar: Portfolio Intelligence (Sticky) */}
      <aside className="w-full lg:w-[280px] lg:sticky lg:top-8 flex-shrink-0">
        <div className="flex flex-col gap-2 mb-6">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Inteligencia Global
          </h2>
          {portfolio && <PortfolioMetrics metrics={portfolio} />}
        </div>
      </aside>

      {/* Main Content: Operations Cockpit */}
      <main className="flex-1 space-y-6 min-w-0 w-full">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100 uppercase italic">
              El Búnker
            </h1>
            <p className="text-xs text-zinc-500 font-medium">
              Control de Operaciones y Flujo de Caja Matemático
            </p>
          </div>
          <div className="flex items-center gap-4">
            <RefreshButton />
            <div className="w-px h-6 bg-zinc-800"></div>
            <SyncTradierButton />
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Campañas Activas (PMCC)
          </h2>
          <CampaignTable />
        </section>
      </main>
    </div>
  )
}
