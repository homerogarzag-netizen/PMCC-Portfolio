export const dynamic = 'force-dynamic'

import { getTransactionLog } from '@/features/portfolio/actions/get-transaction-log'
import { getPerformanceSummary } from '@/features/portfolio/actions/get-performance-summary'
import { LogDashboard } from '@/features/portfolio/components/log-dashboard'
import { RefreshButton } from '@/features/portfolio/components/refresh-button'
import Link from 'next/link'

export default async function LogPage() {
  const transactions = await getTransactionLog()
  const { campaigns } = await getPerformanceSummary()

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
            La Bitácora
          </h1>
          <p className="text-zinc-500 max-w-2xl text-xs font-mono uppercase tracking-wider">
            Auditoría de primas recolectadas y flujo de caja histórico desde diciembre 2025.
          </p>
        </div>
        
        <div className="flex-shrink-0 mb-1">
          <RefreshButton />
        </div>
      </header>

      <LogDashboard 
        initialTransactions={transactions} 
        campaigns={campaigns} 
      />
    </main>
  )
}
