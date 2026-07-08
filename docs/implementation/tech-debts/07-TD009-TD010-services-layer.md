# 07 · TD-009 & TD-010 — Move Raw Supabase Calls Out of `app/` Pages

**Priority:** P2  
**Effort:** Small–Medium (1–2h)  
**Touches:** `app/dashboard/summary/`, `app/dashboard/session/`, `app/dashboard/roster/`, `lib/services/`

---

## Problem

Three `app/` pages contain raw `supabase.from()` calls, bypassing `lib/services/`. This violates the data access pattern defined in AGENTS.md §7.

| Page | Raw Supabase calls |
|---|---|
| `app/dashboard/summary/[session_id]/page.tsx` L35 | `sessions.update({ summary_data })` |
| `app/dashboard/session/page.tsx` | `players`, `sessions`, `matches`, `session_players` |
| `app/dashboard/roster/page.tsx` | `players` |

---

## Step-by-Step

### Step 1 — Add `storeSummaryData` to `session.service.ts`

**File:** `src/lib/services/session.service.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export async function storeSummaryData(
  supabase: SupabaseClient,
  sessionId: string,
  summaryData: unknown
): Promise<void> {
  await supabase
    .from('sessions')
    .update({ summary_data: summaryData })
    .eq('id', sessionId)
}
```

**Update `summary/[session_id]/page.tsx`:**

```diff
+ import { getSessionSummaryData } from '@/lib/stats'
+ import { storeSummaryData } from '@/lib/services'

  if (!summaryData) {
    summaryData = await getSessionSummaryData(supabase, sessionId)
-   await supabase.from('sessions').update({ summary_data: summaryData }).eq('id', sessionId)
+   await storeSummaryData(supabase, sessionId, summaryData)
  }
```

---

### Step 2 — Extend `session.service.ts` for session page queries

The `app/dashboard/session/page.tsx` makes four raw queries. Move them to services:

**Add to `src/lib/services/session.service.ts`:**

```ts
export async function getActiveSession(supabase: SupabaseClient, hosterId: string) {
  // Already exists — verify it covers the session/page.tsx query shape
}

export async function getActiveMatchForSession(
  supabase: SupabaseClient,
  sessionId: string
) {
  const { data } = await supabase
    .from('matches')
    .select('team_a_players, team_b_players')
    .eq('session_id', sessionId)
    .eq('is_completed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export async function getSessionPlayersMap(
  supabase: SupabaseClient,
  sessionId: string
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('session_players')
    .select('player_id, games_played')
    .eq('session_id', sessionId)
  return new Map((data ?? []).map(sp => [sp.player_id, sp.games_played]))
}
```

**Update `app/dashboard/session/page.tsx`:**

```diff
- const { data: activeSession } = await supabase.from('sessions').select(...)...
- const { data: match } = await supabase.from('matches').select(...)...
- const { data: sessionPlayers } = await supabase.from('session_players').select(...)...

+ import { getActiveSession, getActiveMatchForSession, getSessionPlayersMap } from '@/lib/services'
+ const activeSession = await getActiveSession(supabase, user.id)
+ const activeMatch = activeSession ? await getActiveMatchForSession(supabase, activeSession.id) : null
+ const sessionPlayersMap = activeSession ? await getSessionPlayersMap(supabase, activeSession.id) : new Map()
```

---

### Step 3 — Extend `player.service.ts` for roster page

**Add to `src/lib/services/player.service.ts`:**

```ts
export async function getPlayersByHoster(
  supabase: SupabaseClient,
  hosterId: string
) {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('hoster_id', hosterId)
    .order('name', { ascending: true })
  return data ?? []
}
```

**Update `app/dashboard/roster/page.tsx`:**

```diff
- const { data: players } = await supabase.from('players').select('*').order('name', { ascending: true })
+ import { getPlayersByHoster } from '@/lib/services'
+ const players = await getPlayersByHoster(supabase, user.id)
```

---

### Step 4 — Update `lib/services/index.ts` barrel

Ensure all new service functions are re-exported:

```ts
// src/lib/services/index.ts
export * from './session.service'
export * from './player.service'
export * from './match.service'
```

### Step 5 — Verify

```bash
npx tsc --noEmit
npm run build
```

---

## Files Modified

| File | Change |
|---|---|
| `lib/services/session.service.ts` | Add `storeSummaryData`, `getActiveMatchForSession`, `getSessionPlayersMap` |
| `lib/services/player.service.ts` | Add `getPlayersByHoster` |
| `lib/services/index.ts` | Ensure all new functions are exported |
| `app/dashboard/summary/[session_id]/page.tsx` | Replace raw `.update()` with `storeSummaryData` |
| `app/dashboard/session/page.tsx` | Replace 3 raw queries with service calls |
| `app/dashboard/roster/page.tsx` | Replace raw `players` query with `getPlayersByHoster` |

## Acceptance Criteria

- [ ] Zero `supabase.from()` calls in any `app/` page file
- [ ] All new service functions are exported via `lib/services/index.ts`
- [ ] All data access goes through `lib/services/`
- [ ] `npx tsc --noEmit` and `npm run build` pass
