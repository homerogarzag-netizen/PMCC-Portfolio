'use client'

import React, { useState, useEffect } from 'react'
import { getTickerExpirations, getOptionsForExpiration } from '../actions/simulator-actions'
import { Search, Calculator, Shield, Zap, TrendingUp, AlertTriangle, Save, RefreshCw, Layers, Crosshair } from 'lucide-react'
import { saveSimulation, getSavedSimulations } from '../actions/simulation-persistence'
import { SavedSimulationsList } from './saved-simulations-list'
import { useSearchParams } from 'next/navigation'

export function SimulationTerminal() {
  const [ticker, setTicker] = useState('')
  const [context, setContext] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // Selection State
  const [leapExp, setLeapExp] = useState('')
  const [leapOptions, setLeapOptions] = useState<any[]>([])
  const [selectedLeap, setSelectedLeap] = useState<any>(null)
  
  const [shortExp, setShortExp] = useState('')
  const [shortOptions, setShortOptions] = useState<any[]>([])
  const [selectedShort, setSelectedShort] = useState<any>(null)
  
  const [savedSimulations, setSavedSimulations] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Load initial saved simulations
  useEffect(() => {
    getSavedSimulations().then(setSavedSimulations)
  }, [])

  const searchParams = useSearchParams()

  const loadTickerData = async (symbol: string) => {
    setLoading(true)
    const res = await getTickerExpirations(symbol)
    if (res.expirations) {
      setContext(res)
      return res
    }
    setLoading(false)
    return null
  }

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!ticker) return
    await loadTickerData(ticker)
  }

  // Handle incoming parameters from Radar
  useEffect(() => {
    const pTicker = searchParams.get('ticker')
    const pStrike = searchParams.get('leapStrike')
    const pExp = searchParams.get('leapExp')

    if (pTicker) {
      setTicker(pTicker)
      loadTickerData(pTicker).then(res => {
        if (res && pExp) {
          setLeapExp(pExp)
          // Near term for Short as default
          setShortExp(res.expirations[0] || '')
        }
      })
    }
  }, [searchParams])

  // Auto-select strike if passed via params
  useEffect(() => {
    const pStrike = searchParams.get('leapStrike')
    if (pStrike && leapOptions.length > 0 && !selectedLeap) {
      const strikeVal = parseFloat(pStrike)
      const found = leapOptions.find(o => o.strike === strikeVal)
      if (found) setSelectedLeap(found)
    }
  }, [leapOptions, searchParams, selectedLeap])

  // Load options when expirations change
  useEffect(() => {
    if (context && leapExp) {
      getOptionsForExpiration(ticker, leapExp).then(opts => setLeapOptions(Array.isArray(opts) ? opts : []))
    }
  }, [leapExp, context, ticker])

  useEffect(() => {
    if (context && shortExp) {
      getOptionsForExpiration(ticker, shortExp).then(opts => setShortOptions(Array.isArray(opts) ? opts : []))
    }
  }, [shortExp, context, ticker])

  // Helper for Mid Price logic
  const getMid = (opt: any) => {
    if (!opt) return 0
    const mid = (opt.bid + opt.ask) / 2
    return mid > 0 ? mid : opt.last
  }

  // Calculations
  const leapPrice = getMid(selectedLeap)
  const shortPrice = getMid(selectedShort)
  const entryDebit = leapPrice - shortPrice
  const totalCost = entryDebit * 100
  
  // War Chest Formula IQ (CEO Formula)
  const atmShort = shortOptions.reduce((prev, curr) => 
    Math.abs(curr.strike - (context?.underlyingPrice || 0)) < Math.abs(prev.strike - (context?.underlyingPrice || 0)) ? curr : prev
  , shortOptions[0])
  
  const atmPremium = getMid(atmShort)
  const rollBuffer = atmPremium * 1.2 * 4 * 100
  const warChestRequired = totalCost + rollBuffer

  // NEW Intelligence Metrics
  const intrinsicLeap = Math.max(0, (context?.underlyingPrice || 0) - (selectedLeap?.strike || 0))
  const extrinsicLeap = leapPrice - intrinsicLeap
  const safetyMargin = (((context?.underlyingPrice || 0) - (selectedLeap?.strike || 0)) / (context?.underlyingPrice || 1)) * 100
  const recoveryWeeks = totalCost / ((shortPrice || 0.01) * 100)
  const staticRoi = (((shortPrice || 0) * 100) / (totalCost || 1)) * 100

  const handleSave = async () => {
    if (!selectedLeap || !selectedShort || isSaving) return
    setIsSaving(true)
    const res = await saveSimulation({
      ticker,
      leap_strike: selectedLeap.strike,
      leap_expiration: leapExp,
      short_strike: selectedShort.strike,
      short_expiration: shortExp
    })
    if (res.success) {
      const updated = await getSavedSimulations()
      setSavedSimulations(updated)
    }
    setIsSaving(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Configuration */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm">
          <h2 className="text-xs font-bold font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Search className="w-3 h-3" /> Selector de Activo
          </h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input 
              type="text" 
              placeholder="TICKER (ej. SPY)..." 
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              className="flex-1 bg-black border border-zinc-800 rounded-sm py-2 px-4 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-500/50"
            />
            <button className="bg-amber-500 text-black px-4 py-2 font-bold text-xs uppercase rounded-sm hover:bg-amber-400 transition-all">
              {loading ? '...' : 'Cargar'}
            </button>
          </form>
          {context && (
            <div className="mt-4 flex justify-between items-center text-[11px] font-mono">
              <span className="text-zinc-500">PRECIO ACTUAL: <span className="text-zinc-100">${context.underlyingPrice.toFixed(2)}</span></span>
              <span className="text-zinc-500">EXPIRACIONES: <span className="text-zinc-100">{context.expirations.length}</span></span>
            </div>
          )}
        </div>

        {context && (
          <div className="space-y-4">
            {/* LEAP Selector */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm">
              <h2 className="text-xs font-bold font-mono text-emerald-500 uppercase tracking-widest mb-4">Configuración del LEAP (Long)</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] uppercase text-zinc-600 font-bold block mb-1">Expiration</label>
                    <select 
                      value={leapExp} 
                      onChange={e => setLeapExp(e.target.value)}
                      className="w-full bg-black border border-zinc-800 text-[11px] font-mono text-zinc-300 p-1.5 focus:outline-none"
                    >
                      {context.expirations.map((e: any) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] uppercase text-zinc-600 font-bold block mb-1">Strike</label>
                    <select 
                      value={selectedLeap?.strike || ''} 
                      onChange={e => setSelectedLeap(leapOptions.find(o => o.strike === parseFloat(e.target.value)))}
                      className="w-full bg-black border border-zinc-800 text-[11px] font-mono text-zinc-300 p-1.5 focus:outline-none"
                    >
                      <option value="">Seleccionar Strike...</option>
                      {leapOptions.map((o: any) => <option key={o.strike} value={o.strike}>${o.strike} (Delta: {o.greeks?.delta?.toFixed(2) || 'N/A'})</option>)}
                    </select>
                    {selectedLeap && (
                      <div className="mt-1 flex justify-between px-1">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">Mid Price:</span>
                        <span className="text-[9px] text-emerald-500 font-bold font-mono">${getMid(selectedLeap).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Short Selector */}
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm">
              <h2 className="text-xs font-bold font-mono text-rose-500 uppercase tracking-widest mb-4">Configuración de la Corta (Short)</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] uppercase text-zinc-600 font-bold block mb-1">Expiration</label>
                    <select 
                      value={shortExp} 
                      onChange={e => setShortExp(e.target.value)}
                      className="w-full bg-black border border-zinc-800 text-[11px] font-mono text-zinc-300 p-1.5 focus:outline-none"
                    >
                      {context.expirations.slice(0, 8).map((e: any) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] uppercase text-zinc-600 font-bold block mb-1">Strike</label>
                    <select 
                      value={selectedShort?.strike || ''} 
                      onChange={e => setSelectedShort(shortOptions.find(o => o.strike === parseFloat(e.target.value)))}
                      className="w-full bg-black border border-zinc-800 text-[11px] font-mono text-zinc-300 p-1.5 focus:outline-none"
                    >
                      <option value="">Seleccionar Strike...</option>
                      {shortOptions.map((o: any) => <option key={o.strike} value={o.strike}>${o.strike} (Delta: {o.greeks?.delta?.toFixed(2) || 'N/A'})</option>)}
                    </select>
                    {selectedShort && (
                      <div className="mt-1 flex justify-between px-1">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">Mid Price:</span>
                        <span className="text-[9px] text-rose-400 font-bold font-mono">${getMid(selectedShort).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Projections */}
      <div className="lg:col-span-7">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm overflow-hidden h-full flex flex-col">
          <div className="p-6 border-b border-zinc-800 bg-black/20">
            <h2 className="text-xs font-bold font-mono text-zinc-100 uppercase tracking-[0.2em] flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-500" /> Proyecciones de Estrategia
            </h2>
          </div>
          
          <div className="flex-1 p-8 space-y-12">
            {!selectedLeap ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-50 space-y-4 py-20">
                <Calculator className="w-12 h-12" />
                <p className="text-[10px] uppercase font-mono tracking-widest">Configura una posición para ver proyecciones</p>
              </div>
            ) : (
              <>
                {/* Capital Metrics */}
                <div className="grid grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest">Débito Neto (Capital)</span>
                    <h3 className="text-3xl font-bold font-mono text-zinc-100 tracking-tighter italic">
                      ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest">War Chest Required</span>
                    <h3 className="text-3xl font-bold font-mono text-emerald-500 tracking-tighter italic">
                      ${warChestRequired.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] uppercase font-bold text-zinc-600 tracking-widest">Reserva Defensiva (4 Sem)</span>
                    <h3 className="text-3xl font-bold font-mono text-rose-500/50 tracking-tighter italic">
                      ${rollBuffer.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </h3>
                  </div>
                </div>

                {/* Greeks Projection */}
                <div className="grid grid-cols-2 gap-8 py-8 border-y border-zinc-800/50">
                  <div className="bg-black/40 p-6 border border-zinc-800 rounded-sm relative group overflow-hidden">
                    <Zap className="absolute top-2 right-2 w-12 h-12 text-amber-500 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform" />
                    <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Net Theta Proyectado</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold font-mono text-amber-500">
                        {((selectedShort?.greeks?.theta || 0) * -100 + (selectedLeap?.greeks?.theta || 0) * 100).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-600 uppercase font-mono">USD/Día</span>
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-2 leading-relaxed">Factor de generación de renta pasiva diaria.</p>
                  </div>

                  <div className="bg-black/40 p-6 border border-zinc-800 rounded-sm relative group overflow-hidden">
                    <TrendingUp className="absolute top-2 right-2 w-12 h-12 text-emerald-500 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform" />
                    <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono">Delta del Sistema</span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold font-mono text-emerald-500">
                        {((selectedLeap?.greeks?.delta || 0) + (selectedShort?.greeks?.delta || 0)).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-600 uppercase font-mono">Acciones Equiv.</span>
                    </div>
                    <p className="text-[9px] text-zinc-600 mt-2 leading-relaxed">Sensibilidad al movimiento del {ticker}.</p>
                  </div>
                </div>

                {/* Advanced Intelligence Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-b border-zinc-800/50">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest block">Factor Recuperación</span>
                    <p className="text-xl font-bold font-mono text-zinc-100 italic">
                      {recoveryWeeks.toFixed(1)} <span className="text-[10px] text-zinc-500 uppercase not-italic font-normal">Sems</span>
                    </p>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold">
                      @ ${(shortPrice * 100).toFixed(0)} <span className="text-zinc-600 font-normal">Mid/Sem</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest block">Margen Seguridad</span>
                    <p className="text-xl font-bold font-mono text-emerald-500 italic">{safetyMargin.toFixed(1)}%</p>
                    <p className="text-[10px] text-zinc-600 uppercase">Caída Permitida (ITM)</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest block">Ratio Extrínseco</span>
                    <p className="text-xl font-bold font-mono text-amber-500 italic">{((extrinsicLeap / (leapPrice || 1)) * 100).toFixed(0)}%</p>
                    <p className="text-[10px] text-zinc-600 uppercase">Valor Temporal (Riesgo)</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest block">Static ROI Semanal</span>
                    <p className="text-xl font-bold font-mono text-emerald-400 italic">{staticRoi.toFixed(2)}%</p>
                    <p className="text-[10px] text-zinc-600 uppercase">Renta si Ticker Flat</p>
                  </div>
                </div>

                {/* Centinela Preview */}
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-sm space-y-4">
                  <header className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Diagnóstico Preventivo (Centinela)</span>
                    </div>
                    {((selectedShort?.strike || 0) < (context?.underlyingPrice || 0)) ? (
                        <span className="bg-rose-500 text-black px-2 py-0.5 text-[9px] font-bold rounded-sm flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> ITM RISK
                        </span>
                    ) : (
                        <span className="bg-emerald-500 text-black px-2 py-0.5 text-[9px] font-bold rounded-sm flex items-center gap-1">
                            SAFE ENTRY
                        </span>
                    )}
                  </header>
                  <p className="text-xs text-zinc-400 font-mono italic">
                    "Al entrar en esta posición con un Capital de ${totalCost.toLocaleString()}, tu Break-even para el primer ciclo es de ${(selectedShort?.strike + selectedShort?.last).toFixed(2)}. 
                    Se recomienda un War Chest Total de ${warChestRequired.toLocaleString()} (Incluyendo $${rollBuffer.toLocaleString()} de reserva) para mitigar riesgos ITM."
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="p-4 bg-black/40 border-t border-zinc-800 flex justify-between items-center px-8">
             <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em]">Data streams provided by Tradier Brokerage Inc.</p>
             <button 
                onClick={handleSave}
                disabled={isSaving || !selectedLeap}
                className="bg-zinc-100 hover:bg-emerald-500 hover:text-white text-black px-4 py-2 rounded-sm font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-30 flex items-center gap-2"
             >
                <Save className="w-3 h-3" />
                {isSaving ? 'Guardando...' : 'Guardar Estrategia'}
             </button>
          </div>
        </div>
      </div>

      {/* Persistence Layer Breakdown */}
      <div className="lg:col-span-12 py-12 border-t border-zinc-800">
         <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-xl font-bold text-zinc-100 italic tracking-tighter flex items-center gap-2">
                <Layers className="w-5 h-5 text-zinc-500" /> BÓVEDA DE ESTRATEGIAS
              </h2>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono mt-1">
                Saved Simulations & Decision Comparison
              </p>
            </div>
         </div>
         <SavedSimulationsList 
            simulations={savedSimulations} 
            onDelete={async (id) => {
              const updated = savedSimulations.filter(s => s.id !== id)
              setSavedSimulations(updated)
            }}
         />
      </div>
    </div>
  )
}
