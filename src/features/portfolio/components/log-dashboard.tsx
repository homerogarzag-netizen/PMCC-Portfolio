'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { PerformanceSummary } from './performance-summary'
import { CampaignPerformance } from '../actions/get-performance-summary'

interface Transaction {
  id: string
  date: string
  ticker: string
  description: string
  amount: number
  type: string
}

interface Props {
  initialTransactions: Transaction[]
  campaigns: CampaignPerformance[]
}

export function LogDashboard({ initialTransactions, campaigns }: Props) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null)

  const filteredTransactions = selectedTicker 
    ? initialTransactions.filter(tx => tx.ticker === selectedTicker)
    : initialTransactions

  return (
    <div className="space-y-8">
      {/* Interactive Performance Cards */}
      <PerformanceSummary 
        campaigns={campaigns} 
        selectedTicker={selectedTicker}
        onSelect={setSelectedTicker}
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {selectedTicker 
            ? `Historial de Operaciones: ${selectedTicker}` 
            : 'Historial de Operaciones: Todo el Portafolio'
          }
        </h2>
        {selectedTicker && (
          <button 
            onClick={() => setSelectedTicker(null)}
            className="text-[9px] font-bold uppercase px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-sm transition-colors"
          >
            Limpiar Filtro
          </button>
        )}
      </div>

      <div className="data-table-container">
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
    </div>
  )
}
