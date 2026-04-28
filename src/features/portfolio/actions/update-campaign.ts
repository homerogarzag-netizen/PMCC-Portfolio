'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateCampaignTkScore(campaignId: string, tkScore: number) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('pmcc_campaigns')
    .update({ tk_score: tkScore })
    .eq('id', campaignId)

  if (error) {
    console.error('[updateCampaignTkScore] Error:', error)
    throw new Error('Failed to update TK Score')
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export async function updateCampaignBeta(campaignId: string, beta: number) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('pmcc_campaigns')
    .update({ beta })
    .eq('id', campaignId)

  if (error) {
    console.error('[updateCampaignBeta] Error:', error)
    throw new Error('Failed to update Beta')
  }

  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}
