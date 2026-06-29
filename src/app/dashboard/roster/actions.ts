'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addPlayer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const name = (formData.get('name') as string).trim()
  
  // Check for duplicate name
  const { data: existingPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('hoster_id', user.id)
    .ilike('name', name)
    .maybeSingle()
    
  if (existingPlayer) {
    redirect('/dashboard/roster?error=Duplicate+player+name')
  }

  const initial_tier = formData.get('initial_tier') as string
  const mmr = initial_tier === 'Beginner' ? 800 : initial_tier === 'Intermediate' ? 1000 : 1200
  
  const positions = formData.getAll('positions') as string[]

  const { error } = await supabase.from('players').insert({
    hoster_id: user.id,
    name,
    mmr,
    initial_tier,
    positions
  })

  if (error) {
    console.error('Error adding player:', error)
  }

  revalidatePath('/dashboard/roster')
  redirect('/dashboard/roster')
}

export async function deletePlayer(playerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  await supabase.from('players').delete().eq('id', playerId).eq('hoster_id', user.id)
  revalidatePath('/dashboard/roster')
}
