export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getHistoricalPerformance } from '@/features/portfolio/actions/get-historical-performance'
import { PerformanceCharts } from '@/features/portfolio/components/performance-charts'
import { RefreshButton } from '@/features/portfolio/components/refresh-button'
import { takePortfolioSnapshot } from '@/features/portfolio/actions/take-portfolio-snapshot'
import Link from 'next/link'

export default async function PerformancePage() {
  // Take today's snapshot automatically if missing
  await takePortfolioSnapshot()
  
  const { monthly, tickerStats, daily, stats } = await getHistoricalPerformance()

  return (
    <main className="min-h-screen bg-slate-950 text-zinc-100 p-8">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/" className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-100 transition-colors">
              ← Volver al Búnker
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter italic uppercase mb-2">
            Inteligencia de Desempeño
          </h1>
          <p className="text-zinc-500 max-w-2xl text-xs font-mono uppercase tracking-wider">
            Análisis matemático de flujo de caja, fricción de mercado y rentabilidad real desde diciembre 2025.
          </p>
        </div>
        
        <div className="flex-shrink-0 mb-1">
          <RefreshButton />
        </div>
      </header>

      {stats ? (
        <PerformanceCharts 
          data={monthly} 
          tickerStats={tickerStats} 
          dailyStats={daily} 
          stats={stats} 
        />
      ) : (
        <div className="p-24 border border-dashed border-zinc-800 rounded-md text-center">
          <p className="text-xs text-zinc-500 font-mono uppercase">Cargando datos analíticos...</p>
        </div>
      )}
    </main>
  )
}
