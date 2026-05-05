'use client'

import { useState } from 'react'
import { Trash2, Search, Loader2, RefreshCw } from 'lucide-react'
import { PerformanceSummary } from './performance-summary'
import { CampaignPerformance } from '../actions/get-performance-summary'
import { scanMissingTransactions, restoreTransactions, MissingTransaction } from '../actions/recover-transactions'
import { updateCampaignStatus } from '../actions/update-campaign-status'
import { useRouter } from 'next/navigation'

interface Transaction {
  id: string
  date: string
  ticker: string
  description: string
  amount: number
  type: string
  status: string
}

interface Props {
  initialTransactions: Transaction[]
  campaigns: CampaignPerformance[]
}

export function LogDashboard({ initialTransactions, campaigns }: Props) {
  const router = useRouter()
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed'>('active')
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null)
  
  // Recovery State
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [missingTxs, setMissingTxs] = useState<MissingTransaction[]>([])
  const [selectedTxs, setSelectedTxs] = useState<Set<number>>(new Set())

  const filteredTransactions = initialTransactions.filter(tx => {
    const matchesTicker = selectedTicker ? tx.ticker === selectedTicker : true
    const matchesStatus = tx.status === statusFilter
    return matchesTicker && matchesStatus
  })

  const filteredCampaigns = campaigns.filter(c => c.status === statusFilter)

  const handleScan = async () => {
    setIsScanning(true)
    setMissingTxs([])
    setSelectedTxs(new Set())
    try {
      const res = await scanMissingTransactions(selectedTicker)
      if (res.success && res.missing) {
        setMissingTxs(res.missing)
      } else {
        alert('Error al escanear: ' + res.error)
      }
    } catch (e) {
      alert('Error de conexión')
    }
    setIsScanning(false)
  }

  const handleRestore = async () => {
    if (selectedTxs.size === 0) return
    setIsRestoring(true)
    const toRestore = missingTxs.filter((_, i) => selectedTxs.has(i))
    try {
      const res = await restoreTransactions(toRestore)
      if (res.success) {
        setIsRecoverModalOpen(false)
      } else {
        alert('Error al restaurar: ' + res.error)
      }
    } catch (e) {
      alert('Error de conexión')
    }
    setIsRestoring(false)
  }

  const handleUpdateStatus = async (id: string, status: 'active' | 'closed') => {
    const res = await updateCampaignStatus(id, status)
    if (res.success) {
      router.refresh()
    }
  }

  return (
    <div className="space-y-8">
      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-md w-fit border border-zinc-800">
        <button
          onClick={() => {
            setStatusFilter('active')
            setSelectedTicker(null) // Limpiar selección al cambiar de pestaña
          }}
          className={`px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${
            statusFilter === 'active' 
              ? 'bg-emerald-500 text-emerald-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Activas
        </button>
        <button
          onClick={() => {
            setStatusFilter('closed')
            setSelectedTicker(null) // Limpiar selección al cambiar de pestaña
          }}
          className={`px-6 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all ${
            statusFilter === 'closed' 
              ? 'bg-zinc-700 text-zinc-100' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Cerradas
        </button>
      </div>

      {/* Interactive Performance Cards */}
      {filteredCampaigns.length > 0 ? (
        <PerformanceSummary 
          campaigns={filteredCampaigns} 
          selectedTicker={selectedTicker}
          onSelect={setSelectedTicker}
          onUpdateStatus={handleUpdateStatus}
        />
      ) : (
        <div className="p-12 border border-dashed border-zinc-800 rounded-sm text-center bg-white/[0.01]">
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-[0.2em]">
            No hay campañas {statusFilter === 'active' ? 'activas' : 'cerradas'} en este momento
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {selectedTicker 
            ? `Historial de Operaciones: ${selectedTicker}` 
            : 'Historial de Operaciones: Todo el Portafolio'
          }
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsRecoverModalOpen(true)
              handleScan()
            }}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-md transition-colors"
          >
            <Search size={12} />
            Auditoría Profunda
          </button>
          
          {selectedTicker && (
            <button 
              onClick={() => setSelectedTicker(null)}
              className="text-[9px] font-bold uppercase px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-md transition-colors"
            >
              Limpiar Filtro
            </button>
          )}
        </div>
      </div>

      <div className="data-table-container relative">
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Ticker</th>
              <th>Concepto / Acción</th>
              <th className="text-right">Monto (USD)</th>
              <th className="text-right">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-24 text-zinc-600 font-mono text-xs uppercase italic">
                  No hay transacciones registradas para este filtro.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="font-mono text-[10px] text-zinc-400">{tx.date}</td>
                  <td className="font-bold text-zinc-100">{tx.ticker}</td>
                  <td className="text-zinc-300 text-[11px] font-mono tracking-tight">
                    {tx.description}
                  </td>
                  <td className={`text-right font-mono font-bold ${tx.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={async () => {
                          const types = ['premium_collected', 'roll_cost', 'initial_capital']
                          const currentIndex = types.indexOf(tx.type)
                          const nextType = types[(currentIndex + 1) % types.length]
                          
                          const { updateTransactionType } = await import('../actions/update-transaction-type')
                          await updateTransactionType(tx.id, nextType)
                        }}
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                          tx.type === 'premium_collected' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' 
                            : tx.type === 'initial_capital'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                            : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20'
                        }`}
                        title="Click para cambiar tipo"
                      >
                        {tx.type.replace('_', ' ')}
                      </button>

                      {deletingTxId === tx.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              const { deleteTransaction } = await import('../actions/delete-transaction')
                              await deleteTransaction(tx.id)
                              setDeletingTxId(null)
                            }}
                            className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-all"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setDeletingTxId(null)}
                            className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-sm bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30 transition-all"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingTxId(tx.id)}
                          className="p-1.5 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-sm transition-all"
                          title="Eliminar transacción"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Recovery Modal */}
      {isRecoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-zinc-800 rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold tracking-tight text-zinc-100 uppercase italic flex items-center gap-2">
                  <Search className="text-blue-500" />
                  Auditoría Profunda Tradier
                </h3>
                <p className="text-xs text-zinc-400 font-mono">Buscando transacciones huérfanas en el historial de tu broker...</p>
              </div>
              <button 
                onClick={() => setIsRecoverModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {isScanning ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest animate-pulse">Escaneando historial completo...</p>
                </div>
              ) : missingTxs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                    <RefreshCw className="text-emerald-500" size={20} />
                  </div>
                  <p className="text-sm font-bold text-zinc-300">¡Todo está perfectamente sincronizado!</p>
                  <p className="text-xs text-zinc-500">No se encontraron operaciones huérfanas en Tradier.</p>
                </div>
              ) : (
                <table className="data-table w-full text-left">
                  <thead className="sticky top-0 bg-slate-900 shadow-md">
                    <tr>
                      <th className="w-10 text-center">
                        <input 
                          type="checkbox" 
                          className="accent-blue-500"
                          checked={selectedTxs.size === missingTxs.length && missingTxs.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTxs(new Set(missingTxs.map((_, i) => i)))
                            } else {
                              setSelectedTxs(new Set())
                            }
                          }}
                        />
                      </th>
                      <th>Fecha</th>
                      <th>Ticker</th>
                      <th>Concepto</th>
                      <th className="text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingTxs.map((tx, idx) => (
                      <tr key={idx} className={selectedTxs.has(idx) ? 'bg-blue-500/5' : ''}>
                        <td className="text-center">
                          <input 
                            type="checkbox" 
                            className="accent-blue-500"
                            checked={selectedTxs.has(idx)}
                            onChange={(e) => {
                              const newSet = new Set(selectedTxs)
                              if (e.target.checked) newSet.add(idx)
                              else newSet.delete(idx)
                              setSelectedTxs(newSet)
                            }}
                          />
                        </td>
                        <td className="font-mono text-[10px] text-zinc-400">{tx.transaction_date.split('T')[0]}</td>
                        <td className="font-bold text-zinc-100">{tx.ticker}</td>
                        <td className="text-zinc-300 text-[11px] font-mono tracking-tight">{tx.description}</td>
                        <td className={`text-right font-mono font-bold ${tx.amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-between items-center bg-slate-950">
              <span className="text-xs text-zinc-500 font-mono">
                {missingTxs.length > 0 ? `${selectedTxs.size} transacciones seleccionadas` : ''}
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsRecoverModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  disabled={selectedTxs.size === 0 || isRestoring || missingTxs.length === 0}
                  onClick={handleRestore}
                  className="flex items-center gap-2 px-6 py-2 text-xs font-bold uppercase tracking-wider text-blue-950 bg-blue-500 hover:bg-blue-400 rounded-md transition-all disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {isRestoring ? <Loader2 className="animate-spin" size={14} /> : null}
                  {isRestoring ? 'Restaurando...' : 'Restaurar Selección'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

