'use client'

import React, { useState } from 'react'
import { updateCampaignBeta } from '../actions/update-campaign'

interface Props {
  campaignId: string
  initialBeta: number
}

export function BetaSelector({ campaignId, initialBeta }: Props) {
  const [beta, setBeta] = useState(initialBeta.toString())
  const [isUpdating, setIsUpdating] = useState(false)

  const handleBlur = async () => {
    const val = parseFloat(beta)
    if (isNaN(val) || val === initialBeta) return

    setIsUpdating(true)
    try {
      await updateCampaignBeta(campaignId, val)
    } catch (err) {
      console.error(err)
      setBeta(initialBeta.toString())
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[8px] uppercase text-zinc-600 font-mono">BETA (Weight)</span>
      <input
        type="text"
        value={beta}
        onChange={(e) => setBeta(e.target.value)}
        onBlur={handleBlur}
        disabled={isUpdating}
        className="bg-transparent border-b border-zinc-800 text-zinc-400 font-mono text-[10px] focus:outline-none focus:border-zinc-500 w-12 py-0.5"
      />
    </div>
  )
}
