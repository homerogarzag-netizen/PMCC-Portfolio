'use client'

import { CampaignPerformance } from '../actions/get-performance-summary'

interface Props {
  campaigns: CampaignPerformance[];
  selectedTicker?: string | null;
  onSelect: (ticker: string | null) => void;
}

export function PerformanceSummary({ campaigns, selectedTicker, onSelect }: Props) {
  if (campaigns.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
      {campaigns.map((summary) => (
        <PerformanceCard 
          key={summary.campaignId} 
          summary={summary} 
          isSelected={selectedTicker === summary.ticker}
          onSelect={() => onSelect(selectedTicker === summary.ticker ? null : summary.ticker)}
        />
      ))}
    </div>
  )
}

function PerformanceCard({ 
  summary, 
  isSelected, 
  onSelect 
}: { 
  summary: CampaignPerformance, 
  isSelected: boolean,
  onSelect: () => void 
}) {
  return (
    <div 
      onClick={onSelect}
      className={`bg-slate-900/50 border p-6 rounded-sm transition-all group relative overflow-hidden cursor-pointer ${
        isSelected 
          ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/50' 
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Total P&L Banner */}
      <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${summary.netPl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
        Total P&L: ${summary.netPl.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>

      <div className="flex justify-between items-start mb-6 pt-2">
        <div>
          <h3 className="text-2xl font-bold tracking-tighter text-zinc-100 uppercase italic">
            {summary.ticker}
          </h3>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
            {summary.status === 'active' ? 'Campaign in Progress' : 'Closed'}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-mono font-bold ${summary.totalPremium >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            +${summary.totalPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-[9px] font-mono text-zinc-500 uppercase">Realized (Primas)</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* LEAP Valuation Section */}
        <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase font-mono text-zinc-400">Estado del LEAP</span>
            <span className={`text-xs font-mono font-bold ${(summary.marketValue - summary.totalInvested) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(summary.marketValue - summary.totalInvested) >= 0 ? '+' : ''}${(summary.marketValue - summary.totalInvested).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-mono text-zinc-100">${summary.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-[8px] uppercase text-zinc-500 font-mono">Market Value</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-zinc-100">${summary.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-[8px] uppercase text-zinc-500 font-mono">Costo Base</p>
            </div>
          </div>
        </div>

        {/* Global Progress */}
        <div>
          <div className="flex justify-between items-end mb-1 text-[9px] uppercase font-mono tracking-tighter">
            <span className="text-zinc-500">Recuperación vía Primas</span>
            <span className={summary.recoveryPercent >= 100 ? 'text-cyan-400 font-bold' : 'text-zinc-300'}>
              {summary.recoveryPercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-1 bg-zinc-800 w-full rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${
                summary.recoveryPercent >= 100 ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, summary.recoveryPercent))}%` }}
            />
          </div>
        </div>

        {/* Break Even Meta */}
        <div className="flex justify-between items-center border-t border-zinc-800/50 pt-4">
          <span className="text-[9px] uppercase font-mono text-zinc-500">Cash Flow Break-Even</span>
          <span className="text-xs font-mono font-bold text-zinc-200">
            ${Math.max(0, summary.totalInvested - summary.totalPremium).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  )
}
