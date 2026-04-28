'use client'

import { useState } from 'react'
import { updateCampaignTkScore } from '../actions/update-campaign'

interface Props {
  campaignId: string
  initialScore: number
}

export function TkScoreSelector({ campaignId, initialScore }: Props) {
  const [score, setScore] = useState(initialScore)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleChange = async (newScore: number) => {
    setScore(newScore)
    setIsUpdating(true)
    try {
      await updateCampaignTkScore(campaignId, newScore)
    } catch (err) {
      console.error(err)
      setScore(initialScore) // Fallback
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-1 bg-black/40 p-1 rounded border border-white/5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => handleChange(n)}
          disabled={isUpdating}
          className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-sm transition-all ${
            score === n 
              ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]' 
              : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
