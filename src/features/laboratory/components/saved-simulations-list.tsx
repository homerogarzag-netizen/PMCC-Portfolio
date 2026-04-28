'use client'

import React, { useState, useEffect } from 'react'
import { Trash2, RefreshCw, TrendingUp, Zap, Shield, AlertTriangle } from 'lucide-react'
import { deleteSimulation, refreshSimulationMetrics } from '../actions/simulation-persistence'

interface Simulation {
  id: string
  ticker: string
  leap_strike: number
  leap_expiration: string
  short_strike: number
  short_expiration: string
  created_at: string
}

interface Props {
  simulations: Simulation[]
  onDelete: (id: string) => void
}

export function SavedSimulationsList({ simulations, onDelete }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {simulations.map((sim) => (
        <SimulationCard key={sim.id} simulation={sim} onDelete={onDelete} />
      ))}
      
      {simulations.length === 0 && (
        <div className="col-span-full py-12 border border-dashed border-zinc-800 rounded-sm text-center">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">No hay estrategias guardadas en la bóveda.</p>
        </div>
      )}
    </div>
  )
}

function SimulationCard({ simulation, onDelete }: { simulation: Simulation, onDelete: (id: string) => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    const metrics = await refreshSimulationMetrics(
      simulation.ticker,
      simulation.leap_strike,
      simulation.leap_expiration,
      simulation.short_strike,
      simulation.short_expiration
    )
    if (metrics) {
      setData(metrics)
    }
    setLoading(false)
  }

  // Auto-refresh once on mount
  useEffect(() => {
    handleRefresh()
  }, [])

  const handleDelete = async () => {
    if (!isConfirming) {
      setIsConfirming(true)
      // Auto-cancel after 3 seconds if not clicked again
      setTimeout(() => setIsConfirming(false), 3000)
      return
    }
    
    setIsDeleting(true)
    const res = await deleteSimulation(simulation.id)
    if (res.success) {
      onDelete(simulation.id)
    } else {
      setIsDeleting(false)
      setIsConfirming(false)
    }
  }

  // Derived metrics (using current data if available, otherwise just parameters)
  const price = data?.underlyingPrice || 0
  const leapPrice = data?.leapPrice || 0
  const shortPrice = data?.shortPrice || 0
  const totalCost = (leapPrice - shortPrice) * 100
  
  const theta = (data?.shortGreeks?.theta || 0) * -100 + (data?.leapGreeks?.theta || 0) * 100
  const delta = (data?.leapGreeks?.delta || 0) + (data?.shortGreeks?.delta || 0)
  
  const safetyMargin = price ? ((price - simulation.leap_strike) / price) * 100 : 0
  const staticRoi = totalCost > 0 ? (shortPrice * 100 / totalCost) * 100 : 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden flex flex-col group hover:border-zinc-700 transition-all relative">
      <div className="p-4 border-b border-zinc-800 bg-black/20 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold font-mono text-zinc-100 italic tracking-tighter">{simulation.ticker}</h3>
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            {new Date(simulation.created_at).toLocaleDateString()}
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleRefresh()
            }}
            disabled={loading}
            className={`p-1.5 rounded-sm hover:bg-zinc-800 transition-colors ${loading ? 'animate-spin text-amber-500' : 'text-zinc-500'}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleDelete()
            }}
            disabled={isDeleting}
            className={`p-1.5 rounded-sm transition-all flex items-center gap-1.5 ${
              isConfirming 
                ? 'bg-rose-600 text-white px-3' 
                : 'hover:bg-rose-950 text-zinc-500 hover:text-rose-500'
            } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isConfirming ? (
              <>
                <Trash2 className="w-3 h-3" />
                <span className="text-[9px] font-bold uppercase tracking-tighter">¿Confirmar?</span>
              </>
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">LEAP Strike</span>
            <p className="text-sm font-mono text-zinc-100">${simulation.leap_strike} <span className="text-[10px] text-zinc-500">({simulation.leap_expiration})</span></p>
            {data && <p className="text-[10px] text-emerald-500/80 font-mono font-bold">@ ${leapPrice.toFixed(2)} Mid</p>}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">Short Strike</span>
            <p className="text-sm font-mono text-zinc-100">${simulation.short_strike} <span className="text-[10px] text-zinc-500">({simulation.short_expiration})</span></p>
            {data && <p className="text-[10px] text-rose-400 font-mono font-bold">@ ${shortPrice.toFixed(2)} Mid</p>}
          </div>
        </div>

        {data ? (
          <>
            <div className="grid grid-cols-2 gap-4 py-3 border-y border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-600 block">Theta Neto</span>
                  <span className="text-sm font-mono text-amber-500 font-bold">${theta.toFixed(2)}/d</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-600 block">Delta Sis.</span>
                  <span className="text-sm font-mono text-emerald-500 font-bold">{delta.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">Recuperación @ ${(shortPrice * 100).toFixed(0)}/sem</span>
                  <p className="text-base font-mono font-bold text-zinc-100">
                    {(totalCost / (shortPrice * 100 || 0.01)).toFixed(1)} <span className="text-[10px] text-zinc-500 font-normal">SEMS</span>
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">Ratio Extrínseco</span>
                  <p className="text-base font-mono font-bold text-amber-500 italic">
                    {leapPrice > 0 ? (((leapPrice - Math.max(0, price - simulation.leap_strike)) / leapPrice) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-end border-t border-zinc-800/50 pt-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">Margen Seguridad</span>
                  <p className="text-sm font-mono font-bold text-emerald-500">
                    {safetyMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest">Static ROI</span>
                  <p className="text-base font-mono font-bold text-emerald-400">{staticRoi.toFixed(2)}%</p>
                </div>
              </div>
              
              <div className="bg-black/40 p-2.5 rounded-[2px] border border-zinc-800/50 space-y-2">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Capital Entrada</span>
                    <span className="text-sm font-mono text-zinc-100 font-bold">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                 </div>
                 {data?.atmPremium && (
                   <div className="flex justify-between items-center border-t border-zinc-800/50 pt-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-500/80">War Chest Total</span>
                      <span className="text-sm font-mono text-emerald-500 font-bold">
                        ${(totalCost + (data.atmPremium * 1.2 * 4 * 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                   </div>
                 )}
              </div>
            </div>
          </>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center opacity-30">
            <TrendingUp className="w-6 h-6 animate-pulse mb-2" />
            <span className="text-[8px] uppercase tracking-tighter">Fetching current market...</span>
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-black/60 flex justify-between items-center">
        <span className="text-[8px] font-mono text-zinc-500">UNDERLYING: ${price.toFixed(2)}</span>
        {price < simulation.short_strike ? (
          <span className="text-[8px] font-bold text-emerald-500 uppercase flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" /> OTM SAFE
          </span>
        ) : (
          <span className="text-[8px] font-bold text-rose-500 uppercase flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> ITM RISK
          </span>
        )}
      </div>
    </div>
  )
}
