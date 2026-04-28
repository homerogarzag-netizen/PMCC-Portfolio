import React from 'react'
import { PortfolioMetrics as PortfolioMetricsType } from '../actions/get-performance-summary'

interface Props {
  metrics: PortfolioMetricsType
}

export function PortfolioMetrics({ metrics }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Portfolio Theta Card */}
      <div className="bg-black/40 border border-zinc-800 p-4 rounded-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-1 opacity-10">
          <span className="text-3xl font-bold italic tracking-tighter">THETA</span>
        </div>
        <p className="text-[9px] uppercase font-mono text-zinc-500 tracking-widest mb-1">Portfolio Net Theta</p>
        <div className="flex items-baseline gap-1">
          <h4 className="text-xl font-bold font-mono text-emerald-500">
            +${metrics.netTheta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h4>
          <span className="text-[8px] text-zinc-600 font-mono">/ DAY</span>
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/30 w-full" />
      </div>

      {/* BWD Card */}
      <div className="bg-black/40 border border-zinc-800 p-4 rounded-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-1 opacity-10">
          <span className="text-3xl font-bold italic tracking-tighter text-rose-500">BWD</span>
        </div>
        <p className="text-[9px] uppercase font-mono text-zinc-500 tracking-widest mb-1">Beta-Weighted Delta (SPY)</p>
        <div className="flex items-baseline gap-1">
          <h4 className={`text-xl font-bold font-mono ${metrics.betaWeightedDelta >= 0 ? 'text-zinc-100' : 'text-rose-500'}`}>
            {metrics.betaWeightedDelta >= 0 ? '+' : ''}{metrics.betaWeightedDelta.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </h4>
          <span className="text-[8px] text-zinc-600 font-mono">SHARES</span>
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 bg-rose-500/30 w-full" />
      </div>

      {/* NLV Card */}
      <div className="bg-black/40 border border-zinc-800 p-4 rounded-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-1 opacity-10">
          <span className="text-3xl font-bold italic tracking-tighter text-cyan-500">NLV</span>
        </div>
        <p className="text-[9px] uppercase font-mono text-zinc-500 tracking-widest mb-1">Net Liquidating Value</p>
        <div className="flex items-baseline gap-1">
          <h4 className="text-xl font-bold font-mono text-zinc-100">
            ${metrics.totalNlv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h4>
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 bg-cyan-500/30 w-full" />
      </div>

      {/* Realized Premium Card */}
      <div className="bg-black/40 border border-zinc-800 p-4 rounded-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-1 opacity-10">
          <span className="text-4xl font-bold italic tracking-tighter text-amber-500">CASH</span>
        </div>
        <p className="text-[9px] uppercase font-mono text-zinc-500 tracking-widest mb-1">Realized Income (YTD)</p>
        <div className="flex items-baseline gap-1">
          <h4 className="text-xl font-bold font-mono text-amber-500">
            ${metrics.totalPremium.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </h4>
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 bg-amber-500/30 w-full" />
      </div>

      {/* NEW: War Chest Card */}
      <div className="bg-black/40 border border-zinc-800 p-4 rounded-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-1 opacity-10">
          <span className="text-3xl font-bold italic tracking-tighter text-emerald-500">BOLT</span>
        </div>
        <p className="text-[9px] uppercase font-mono text-zinc-500 tracking-widest mb-1">War Chest (Liquidity)</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[8px] text-zinc-500 uppercase">Available</span>
            <h4 className="text-sm font-bold font-mono text-emerald-500">
              ${metrics.availableWarChest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </h4>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[8px] text-zinc-500 uppercase">Required</span>
            <h4 className="text-sm font-bold font-mono text-zinc-300">
              ${metrics.totalWarChestRequired.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </h4>
          </div>
          <div className="mt-2 text-center py-0.5 bg-zinc-900 border border-zinc-800 rounded-sm">
             <span className={`text-[8px] font-bold uppercase tracking-widest ${metrics.availableWarChest >= metrics.totalWarChestRequired ? 'text-emerald-500' : 'text-rose-500'}`}>
               {metrics.availableWarChest >= metrics.totalWarChestRequired ? 'BATTLE READY' : 'INSUFFICIENT FUNDS'}
             </span>
          </div>
        </div>
        <div className={`absolute bottom-0 left-0 h-0.5 w-full ${metrics.availableWarChest >= metrics.totalWarChestRequired ? 'bg-emerald-500/30' : 'bg-rose-500/50'}`} />
      </div>
    </div>
  )
}
