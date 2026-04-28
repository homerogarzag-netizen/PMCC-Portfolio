'use client'

import { useState } from 'react'
import { syncTradierAction } from '../actions/sync-tradier'

export function SyncTradierButton() {
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ type: 'idle' })

  const handleSync = async () => {
    setStatus({ type: 'loading' })
    try {
      const result = await syncTradierAction()
      if (result.success) {
        setStatus({ 
          type: 'success', 
          message: `Synced ${result.campaignCount} campaigns & ${result.transactionCount} new logs` 
        })
        // Clear success message after 3 seconds
        setTimeout(() => setStatus({ type: 'idle' }), 5000)
      } else {
        setStatus({ type: 'error', message: result.error })
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: 'Sync failed' })
    }
  }

  const isSyncing = status.type === 'loading'

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-zinc-800 rounded-md bg-zinc-900 hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={`${isSyncing ? 'animate-spin' : ''}`}
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
        {isSyncing ? 'Syncing...' : 'Sync Tradier'}
      </button>
      
      {status.message && (
        <span className={`text-[10px] font-mono ${status.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>
          {status.message}
        </span>
      )}
    </div>
  )
}
