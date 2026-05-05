'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateCampaignStatus(campaignId: string, status: 'active' | 'closed') {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('pmcc_campaigns')
      .update({ status })
      .eq('id', campaignId)
      .eq('user_id', session.user.id)

    if (error) throw error

    revalidatePath('/')
    revalidatePath('/log')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating campaign status:', error)
    return { success: false, error: error.message }
  }
}
