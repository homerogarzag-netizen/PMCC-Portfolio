'use client'

import { useTransition, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  const now = new Date()
  const formattedDate = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now)

  if (!mounted) return null

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-mono text-zinc-400">
        {formattedDate}
      </span>
      <button
        onClick={handleRefresh}
        disabled={isPending}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-md transition-all disabled:opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
        title="Recalcular con precios actuales del mercado"
      >
        <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
        Actualizar
      </button>
    </div>
  )
}
