'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertAuthenticated } from '@/types/action-error'
import {
  findDuplicatePlayerName,
  insertPlayer,
  updatePlayerRecord,
  deletePlayerRecord,
} from '@/lib/services'
import { tierToMmr } from '@/types/player'

export async function addPlayer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  assertAuthenticated(user)

  const name = (formData.get('name') as string).trim()

  const existingPlayer = await findDuplicatePlayerName(supabase, user.id, name)

  if (existingPlayer) {
    redirect('/dashboard/roster?error=Duplicate+player+name')
  }

  const initial_tier = formData.get('initial_tier') as string
  const mmr = tierToMmr(initial_tier)

  const positions = formData.getAll('positions') as string[]

  const { error } = await insertPlayer(supabase, {
    hoster_id: user.id,
    name,
    mmr,
    initial_tier: initial_tier as 'Beginner' | 'Intermediate' | 'Advanced',
    positions: positions as ('Setter' | 'Outside Hitter' | 'Middle Blocker' | 'Libero' | 'Opposite Hitter')[],
  })

  if (error) {
    console.error('Error adding player:', error)
  }

  revalidatePath('/dashboard/roster')
  redirect('/dashboard/roster')
}

export async function updatePlayer(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  assertAuthenticated(user)

  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  const positions = formData.getAll('positions') as string[]
  const initial_tier = formData.get('initial_tier') as string

  const existingPlayer = await findDuplicatePlayerName(supabase, user.id, name, id)

  if (existingPlayer) {
    redirect(`/dashboard/roster?edit=${id}&error=Duplicate+player+name`)
  }

  const { error } = await updatePlayerRecord(supabase, id, user.id, {
    name,
    positions: positions as ('Setter' | 'Outside Hitter' | 'Middle Blocker' | 'Libero' | 'Opposite Hitter')[],
    initial_tier: initial_tier as 'Beginner' | 'Intermediate' | 'Advanced',
  })

  if (error) {
    console.error('Error updating player:', error)
  }

  revalidatePath('/dashboard/roster')
  redirect('/dashboard/roster')
}

export async function deletePlayer(playerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  assertAuthenticated(user)

  await deletePlayerRecord(supabase, playerId, user.id)
  revalidatePath('/dashboard/roster')
}
