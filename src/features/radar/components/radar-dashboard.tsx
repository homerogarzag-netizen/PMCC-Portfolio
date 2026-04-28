'use client'

import React, { useState, useEffect } from 'react'
import { RadarOpportunity, scanOpportunities } from '../actions/scan-opportunities'
import { addToWatchlist, removeFromWatchlist, seedInstitutionalEtfs } from '../actions/watchlist-actions'
import { Plus, X, Search, TrendingUp, TrendingDown, Activity, Globe, Zap, Filter, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  initialOpportunities: RadarOpportunity[]
}

function RadarCard({ opp, onRemove, isDeepScaning, onGoToLab }: { 
  opp: RadarOpportunity, 
  onRemove: (id: string) => void,
  isDeepScaning: boolean,
  onGoToLab: (opp: RadarOpportunity) => void
}) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isConfirming) {
      setIsConfirming(true)
      setTimeout(() => setIsConfirming(false), 3000)
      return
    }

    setIsDeleting(true)
    onRemove(opp.id)
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-sm relative group hover:border-zinc-700 transition-all min-h-[220px] flex flex-col">
      <button 
        type="button"
        onClick={handleRemove}
        disabled={isDeleting}
        className={`absolute top-2 right-2 z-10 p-1 rounded-sm transition-all flex items-center gap-1.5 ${
          isConfirming 
            ? 'bg-rose-600 text-white px-2 opacity-100' 
            : 'opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-500'
        } ${isDeleting ? 'opacity-50' : ''}`}
      >
        {isConfirming ? (
          <span className="text-[8px] font-black uppercase tracking-tighter">¿Borrar?</span>
        ) : (
          <X className="w-4 h-4" />
        )}
      </button>

      <header className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold font-mono text-zinc-100 tracking-tighter italic">{opp.ticker}</h3>
            {isDeepScaning && opp.leapAudit?.isGolden && (
              <span className="bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                Golden Entry
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">${opp.price.toFixed(2)}</span>
        </div>
        <div className={`flex items-center gap-1 ${opp.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {opp.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span className="text-xs font-bold font-mono">{opp.changePercent.toFixed(2)}%</span>
        </div>
      </header>

      {!isDeepScaning ? (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-1">
            <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest">Implicit Vol (IV)</span>
            <p className="text-sm font-mono text-zinc-300">{(opp.iv * 100).toFixed(1)}%</p>
          </div>
          <div className="space-y-1">
            <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest">Volumen</span>
            <p className="text-sm font-mono text-zinc-300">{(opp.volume / 1000000).toFixed(1)}M</p>
          </div>
        </div>
      ) : (
        <div className="mb-6 space-y-3">
          {opp.leapAudit ? (
            <>
              <div 
                onClick={() => onGoToLab(opp)}
                className="grid grid-cols-2 gap-4 border-b border-zinc-800/50 pb-3 cursor-pointer hover:bg-zinc-800 transition-colors p-2 -m-2 rounded-sm"
              >
                <div className="space-y-1">
                  <span className="text-[8px] text-amber-500/80 uppercase font-bold tracking-widest">Strike Hunter</span>
                  <p className="text-sm font-mono text-zinc-100 font-bold">${opp.leapAudit.strike}</p>
                  <p className="text-[8px] text-zinc-500 font-mono italic">{opp.leapAudit.expiration}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] text-amber-500/80 uppercase font-bold tracking-widest">Extrínseco</span>
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-mono font-bold ${opp.leapAudit.isGolden ? 'text-emerald-400' : 'text-zinc-300'}`}>
                      {opp.leapAudit.extrinsicRatio.toFixed(1)}%
                    </p>
                    <ArrowRight className="w-3 h-3 text-zinc-700" />
                  </div>
                  <p className="text-[8px] text-zinc-500 font-mono uppercase">Delta: {opp.leapAudit.delta.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-zinc-600" />
                  <span className="text-[9px] text-zinc-500 font-mono uppercase">OI: {opp.leapAudit.oi}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => onGoToLab(opp)}
                  className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black border border-amber-500/50 px-2 py-1 rounded-[2px] transition-all group/btn"
                >
                  <span className="text-[9px] font-black uppercase tracking-tighter">Simular en Lab</span>
                  <Zap className="w-2.5 h-2.5 fill-current" />
                </button>
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-[10px] text-zinc-700 font-mono italic uppercase tracking-widest">Sin LEAPs líquidos en ventana</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest mb-1">
            {isDeepScaning ? 'Efficiency Score' : 'PMCC Score'}
          </span>
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={`h-3 w-1.5 rounded-[1px] ${i < opp.score ? (opp.score > 7 ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-zinc-800'}`} 
              />
            ))}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[18px] font-bold font-mono text-zinc-100">{opp.score}<span className="text-[10px] text-zinc-500">/10</span></span>
        </div>
      </div>

      {((!isDeepScaning && opp.score >= 8) || (isDeepScaning && opp.leapAudit?.isGolden)) && (
        <div className={`absolute -bottom-px left-0 w-full h-0.5 shadow-[0_0_10px_rgba(16,185,129,0.5)] ${isDeepScaning && opp.leapAudit?.isGolden ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      )}
    </div>
  )
}

export function RadarDashboard({ initialOpportunities }: Props) {
  const [opportunities, setOpportunities] = useState<RadarOpportunity[]>(initialOpportunities)
  const [newTicker, setNewTicker] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeepScaning, setIsDeepScaning] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)

  const router = useRouter()

  const handleAddTicker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTicker || isSubmitting) return
    
    setIsSubmitting(true)
    const result = await addToWatchlist(newTicker)
    if (result.success) {
      setNewTicker('')
      window.location.reload()
    } else {
      alert(result.error)
    }
    setIsSubmitting(false)
  }

  const handleGoToLab = (opp: RadarOpportunity) => {
    if (!opp.leapAudit) return
    const params = new URLSearchParams({
      ticker: opp.ticker,
      leapStrike: opp.leapAudit.strike.toString(),
      leapExp: opp.leapAudit.expiration
    })
    router.push(`/laboratorio?${params.toString()}`)
  }

  const handleRemove = async (id: string) => {
    const result = await removeFromWatchlist(id)
    if (result.success) {
      window.location.reload()
    }
  }

  const handleSeed = async () => {
    if (isSeeding) return
    setIsSeeding(true)
    const res = await seedInstitutionalEtfs()
    if (res.success) {
      window.location.reload()
    } else {
      alert(res.error)
    }
    setIsSeeding(false)
  }

  return (
    <div className="space-y-6">
      {/* Search/Add Bar & Tools */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleAddTicker} className="flex gap-2 max-w-md flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="ADD TICKER (e.g. MSFT)..."
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-sm py-2 pl-10 pr-4 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-zinc-700"
            />
          </div>
          <button 
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'Add to Radar'}
          </button>
        </form>

        <div className="flex gap-2">
          <button 
            onClick={handleSeed}
            disabled={isSeeding}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all border border-zinc-700"
          >
            <Globe className="w-3.5 h-3.5" />
            {isSeeding ? 'Seeding...' : 'Import Market Leaders (ETFs)'}
          </button>

          <button 
            onClick={() => setIsDeepScaning(!isDeepScaning)}
            className={`flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider transition-all border ${
              isDeepScaning 
                ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isDeepScaning ? 'fill-amber-500' : ''}`} />
            Deep LEAP Hunter
          </button>
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {opportunities
          .filter(opp => !isDeepScaning || opp.leapAudit)
          .map((opp) => (
            <RadarCard 
              key={opp.id} 
              opp={opp} 
              onRemove={handleRemove} 
              isDeepScaning={isDeepScaning}
              onGoToLab={handleGoToLab}
            />
          ))}

        {(opportunities.length === 0 || (isDeepScaning && opportunities.filter(o => o.leapAudit).length === 0)) && (
          <div className="col-span-full py-20 border border-dashed border-zinc-800 rounded-sm text-center">
            <Activity className="w-8 h-8 text-zinc-800 mx-auto mb-4" />
            <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
              {isDeepScaning 
                ? 'No se encontraron LEAPs que cumplan los criterios institucionales en tu lista.' 
                : 'No hay activos en el radar. Agrega uno para empezar el monitoreo.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
