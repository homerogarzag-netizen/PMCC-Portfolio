'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTransactionType(id: string, type: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('transactions')
    .update({ type })
    .eq('id', id)

  if (error) {
    console.error('Error updating transaction type:', error)
    return { success: false, error }
  }

  revalidatePath('/log')
  return { success: true }
}
