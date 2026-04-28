import React from 'react'
import { getCampaigns } from '../actions/get-campaigns'
import { TkScoreSelector } from './tk-score-selector'
import { BetaSelector } from './beta-selector'

export async function CampaignTable() {
  const campaigns = await getCampaigns()

  if (campaigns.length === 0) {
    return (
      <div className="p-12 border border-dashed border-zinc-800 rounded-md text-center">
        <p className="text-xs text-zinc-500 font-mono uppercase">No hay campañas activas. Sincroniza con Tradier para empezar.</p>
      </div>
    )
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th className="text-center">Regimen (TK)</th>
            <th>LEAP (Basis)</th>
            <th>Short Call (Current)</th>
            <th className="text-right">Investment</th>
            <th className="text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((camp: any) => (
            <React.Fragment key={camp.id}>
              {/* Primary Data Row */}
              <tr className="group hover:bg-white/[0.02] border-b-0">
                <td className="relative">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {/* Status Dot */}
                      {camp.centinela && (
                        <div className={`w-1.5 h-1.5 rounded-full ${camp.centinela.color.replace('text-', 'bg-')} ${
                          camp.centinela.status === 'ROLL_PENDING' || camp.centinela.status === 'DANGER' ? 'animate-pulse' : ''
                        }`} />
                      )}
                      <span className="font-bold text-zinc-100 italic tracking-tighter">{camp.ticker}</span>
                    </div>
                    <span className="text-[9px] text-zinc-600 font-mono ml-3.5">
                      ${camp.underlyingPrice.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="w-48">
                  <div className="flex gap-4 items-center">
                    <TkScoreSelector campaignId={camp.id} initialScore={camp.tkScore} />
                    <BetaSelector campaignId={camp.id} initialBeta={camp.beta || 1.0} />
                  </div>
                </td>
                <td className="text-zinc-500 font-mono text-[10px] whitespace-nowrap">
                  {camp.leapStrike}
                </td>
                <td className="text-zinc-300 font-mono text-[10px] whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{camp.shortCallStrike}</span>
                    <span className="text-[8px] text-zinc-600 uppercase">
                      {camp.tkScore >= 4 ? 'OTM Growth' : 'ATM Shield'}
                    </span>
                  </div>
                </td>
                <td className="text-right font-mono text-[11px] text-zinc-400">
                  <div className="flex flex-col">
                    <span>${camp.capitalAllocated.toLocaleString()}</span>
                    <span className={`text-[8px] uppercase ${camp.liquidityStatus === 'OK' ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`}>
                      War Chest: ${camp.warChestRequired.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="text-right whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500 uppercase text-[9px] font-bold border border-emerald-500/20">
                    {camp.status}
                  </span>
                </td>
              </tr>

              {/* El Centinela Advisory Row */}
              {camp.centinela && (
                <tr className="border-t-0 bg-black/20">
                  <td colSpan={6} className="py-3 px-8">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col md:flex-row items-baseline gap-x-6 gap-y-2">
                        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-1 border-b-2 ${camp.centinela.color} border-current shrink-0 inline-block`}>
                          {camp.centinela.label}
                        </span>
                        <p className="text-[10px] text-zinc-400 font-mono italic leading-relaxed flex-1">
                          {camp.centinela.recommendation}
                        </p>
                      </div>
                        
                      {/* Financial Metrics Row */}
                      <div className="flex gap-6 mt-1 border-t border-white/[0.03] pt-2">
                        <div className="flex flex-col">
                          <span className={`text-[11px] font-mono font-bold ${camp.centinela.metrics.openPl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {camp.centinela.metrics.openPl >= 0 ? '+' : '-'}${Math.abs(camp.centinela.metrics.openPl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[8px] uppercase text-zinc-600 font-mono">Open P/L</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-mono text-zinc-300">
                            ${(camp.centinela.metrics.extrinsic * 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[8px] uppercase text-zinc-600 font-mono">Extry (Bread)</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-mono text-zinc-300">
                            ${(camp.centinela.metrics.intrinsic * 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[8px] uppercase text-zinc-600 font-mono">Intrinsic</span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
