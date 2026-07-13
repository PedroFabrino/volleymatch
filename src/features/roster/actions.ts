'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { assertAuthenticated } from '@/types/action-error'
import { requireHostPermission } from '@/lib/auth/require-host-permission'
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
  const ctx = await requireHostPermission(supabase, user.id, 'roster_add')

  const name = (formData.get('name') as string).trim()

  const existingPlayer = await findDuplicatePlayerName(supabase, ctx.effectiveHosterId, name)

  if (existingPlayer) {
    redirect('/dashboard/roster?error=Duplicate+player+name')
  }

  const initial_tier = formData.get('initial_tier') as string
  const mmr = tierToMmr(initial_tier)
  const is_temporary = formData.get('is_temporary') === 'on'

  const positions = formData.getAll('positions') as string[]

  const { error } = await insertPlayer(supabase, {
    hoster_id: ctx.effectiveHosterId,
    name,
    mmr,
    initial_tier: initial_tier as 'Beginner' | 'Intermediate' | 'Advanced',
    positions: positions as ('Setter' | 'Outside Hitter' | 'Middle Blocker' | 'Libero' | 'Opposite Hitter')[],
    is_temporary,
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

  const ctx = await requireHostPermission(supabase, user.id, 'roster_manage')

  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  const positions = formData.getAll('positions') as string[]
  const initial_tier = formData.get('initial_tier') as string
  const is_temporary = formData.get('is_temporary') === 'on'

  const existingPlayer = await findDuplicatePlayerName(supabase, ctx.effectiveHosterId, name, id)

  if (existingPlayer) {
    redirect(`/dashboard/roster?edit=${id}&error=Duplicate+player+name`)
  }

  const { error } = await updatePlayerRecord(supabase, id, ctx.effectiveHosterId, {
    name,
    positions: positions as ('Setter' | 'Outside Hitter' | 'Middle Blocker' | 'Libero' | 'Opposite Hitter')[],
    initial_tier: initial_tier as 'Beginner' | 'Intermediate' | 'Advanced',
    is_temporary,
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
  const ctx = await requireHostPermission(supabase, user.id, 'roster_manage')

  await deletePlayerRecord(supabase, playerId, ctx.effectiveHosterId)
  revalidatePath('/dashboard/roster')
}
