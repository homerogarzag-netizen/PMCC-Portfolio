'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting transaction:', error)
    return { success: false, error }
  }

  revalidatePath('/log')
  return { success: true }
}
