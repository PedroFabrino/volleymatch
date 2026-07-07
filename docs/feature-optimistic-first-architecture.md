# Feature: Optimistic-First Architecture

The main complaint since the first live trial: **actions feel slow**. This document
diagnoses the root cause, proposes a two-phase fix (quick wins + deferred background
processing), and lays out the implementation.

---

## Root Cause Analysis

### Score taps — already fast

Score taps use `useOptimistic` correctly. The UI updates instantly. The hoster sees the new
score before the server responds. This is not the problem.

### `finishMatch()` — the real bottleneck

When the hoster taps **"Draft Next"** after a match ends, the following happens
**sequentially before the UI moves**:

```
[1] SELECT match row                            ~50–100 ms
[2] SELECT all match_events for timeline        ~50–100 ms
[3] UPDATE matches SET is_completed = true      ~50–100 ms
[4] for (each player) {                         N × ~100 ms  ← sequential loop!
      SELECT player + session_player row
      UPDATE players SET mmr = ...
      UPSERT session_players
    }
[5] INSERT mmr_history (batch)                  ~50–100 ms
[6] computeMatchDraft() → 4 more DB queries     ~200–400 ms
[7] revalidatePath() + redirect                 Next.js overhead
```

With 12 players, step [4] alone can be **~1.2 seconds** of sequential DB round trips.
Add steps [1–3] and [5–7] and the full `finishMatch` blocks the UI for **~2–3 seconds**
on a good connection, more on gym WiFi.

### `updateScore()` — mild but fixable

Even though score taps feel instant, the server action does two sequential calls:

```typescript
// Currently correct — these fire concurrently via Promise.all — no issue here
await Promise.all([scoreUpdate, eventInsert])
```

This is already optimized. ✅ No change needed here.

### Spectator `router.refresh()` on every score change

Every score update triggers a full server component re-render of `view/[pin]/page.tsx`,
which re-queries: session, active match, all present players, session_players, and last
completed match. That's 5 queries per point scored. Fine for correctness, but slow on
weak connections.

---

## Chosen Approach: Quick Wins + Deferred Background Processing

We skip the full in-memory store (too complex, too risky) and instead apply two layers:

1. **Phase 1 — Quick Wins:** Parallelize DB writes, remove redundant recomputation. Zero
   architectural change. ~3–4 hours work.

2. **Phase 2 — Deferred `finishMatch`:** Split the finish flow into a fast path (instant
   redirect) and a background path (MMR + draft computation). ~4–6 hours work.

Together these eliminate the two largest perceived delays.

---

## Phase 1 — Quick Wins

### 1a. Parallelize `finishMatch` player updates

**File:** `src/app/dashboard/live/[session_id]/actions.ts`

Current code (slow — sequential `for` loop):
```typescript
for (const update of mmrUpdates) {
  await supabase.from('players').update({ mmr: update.newMmr }).eq('id', update.playerId)
  await supabase.from('session_players').upsert({ ... })
  historyInserts.push({ ... })
}
await supabase.from('mmr_history').insert(historyInserts)
```

Fixed (parallel — all player updates fire simultaneously):
```typescript
// Collect all writes first, then fire in one Promise.all
const playerUpdates = mmrUpdates.map(update =>
  supabase.from('players').update({ mmr: update.newMmr }).eq('id', update.playerId)
)

const sessionPlayerUpserts = mmrUpdates.map(update =>
  supabase.from('session_players').upsert({
    session_id: sessionId,
    player_id: update.playerId,
    games_played: playerRecords[update.playerId].games_played_today + update.queueIncrement
  }, { onConflict: 'session_id, player_id' })
)

const historyInserts = mmrUpdates.map(update => ({
  player_id: update.playerId,
  hoster_id: user.id,
  match_id: matchId,
  session_id: sessionId,
  old_mmr: update.oldMmr,
  new_mmr: update.newMmr,
  mmr_change: update.mmrChange,
  reason: 'match_result'
}))

await Promise.all([
  ...playerUpdates,
  ...sessionPlayerUpserts,
  supabase.from('mmr_history').insert(historyInserts)
])
```

**Impact:** Reduces the per-player loop from N sequential round trips (~1.2s for 12 players)
to a single parallel batch (~100ms total). **Biggest single gain.**

---

### 1b. Skip redundant `computeMatchDraft` in `finishMatch`

**File:** `src/app/dashboard/live/[session_id]/actions.ts`

Currently, `finishMatch` with `destination = 'draft'` calls `computeMatchDraft` at the end.
But `saveMatch` already pre-computes and stores `sessions.pending_draft` immediately when
a new match starts.

If `pending_draft` is already populated and up-to-date, the recomputation in `finishMatch`
is redundant. We can skip it:

```typescript
if (destination === 'draft') {
  // Check if pending_draft was already computed (it should be, from saveMatch)
  const { data: sessionData } = await supabase
    .from('sessions')
    .select('pending_draft')
    .eq('id', sessionId)
    .single()

  if (!sessionData?.pending_draft) {
    // Fallback: compute fresh if somehow missing
    const draft = await computeMatchDraft(supabase, sessionId, user.id)
    await supabase.from('sessions').update({ pending_draft: draft ?? null }).eq('id', sessionId)
  }

  revalidatePath(`/dashboard/live/${sessionId}`, 'page')
}
```

**Impact:** Saves ~200–400ms per match finish in the normal case.

---

### 1c. Cache static spectator data

**File:** `src/app/view/[pin]/page.tsx`

The player roster and session config don't change during a match. Wrapping the roster
queries in `unstable_cache` with a short TTL prevents them from re-running on every
`router.refresh()`:

```typescript
import { unstable_cache } from 'next/cache'

const getSessionPlayers = unstable_cache(
  async (sessionId: string, hosterId: string) => {
    const supabase = await createClient()
    const { data: rawPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('hoster_id', hosterId)
      .eq('is_present_today', true)

    const { data: sessionPlayers } = await supabase
      .from('session_players')
      .select('player_id, games_played')
      .eq('session_id', sessionId)

    return { rawPlayers, sessionPlayers }
  },
  ['spectator-players'],
  { revalidate: 5, tags: [`session-${sessionId}`] }  // 5 second TTL
)
```

On substitution or attendance change, the hoster's action would call
`revalidateTag(`session-${sessionId}`)` to bust the cache.

**Impact:** Reduces spectator page DB queries from 5 per refresh to 2 (session + active match)
for the common case.

---

## Phase 2 — Deferred `finishMatch` Background Processing

### The Problem

Even with Phase 1's parallelization, `finishMatch` still blocks on:
- All those parallel writes completing (~100ms, but still)
- The `revalidatePath` + server re-render cycle
- The redirect itself

The hoster sees a loading spinner for ~500–800ms after tapping "Draft Next". Not terrible,
but still perceptible.

### The Solution

Split `finishMatch` into two layers:

**Fast path (on the server action):**
1. Mark `matches.is_completed = true` and store final scores. (~100ms)
2. Immediately redirect to `/dashboard/live/[session_id]`.

**Background path (Route Handler, fire-and-forget):**
1. Calculate MMR changes.
2. Write all `players`, `session_players`, `mmr_history` updates.
3. Compute next draft and write `sessions.pending_draft`.
4. Emit a Realtime event so the draft screen knows when the data is ready.

The hoster lands on the Matchmaker screen immediately. If `pending_draft` is still null
(background job hasn't finished), a subtle "⚙️ Calculating next match..." spinner shows.
The Realtime subscription picks up the `sessions` update and the draft renders — typically
within 1 second.

---

### Implementation

#### New Route Handler: `src/app/api/finish-match/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  const { matchId, sessionId } = await request.json()

  // This runs in the background — client does NOT await this response
  // Use service role or authenticated session passed via header
  const supabase = await createClient()

  // ... full MMR calculation + all DB writes (same logic as current finishMatch)
  // ... computeMatchDraft + sessions.update({ pending_draft })

  // Supabase Realtime will notify subscribers when sessions is updated
  return NextResponse.json({ ok: true })
}
```

#### Modified `finishMatch` server action

```typescript
export async function finishMatch(
  matchId: string,
  sessionId: string,
  destination: 'draft' | 'attendance' = 'attendance'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Fast path: mark match done immediately
  await supabase.from('matches').update({
    is_completed: true,
    completed_at: new Date().toISOString()
  }).eq('id', matchId)

  // Fire background processing — do NOT await
  // Use absolute URL so it works on Vercel
  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/finish-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, sessionId, userId: user.id }),
    // No await — fire and forget
  }).catch(err => console.error('Background finish-match failed:', err))

  if (destination === 'draft') {
    revalidatePath(`/dashboard/live/${sessionId}`, 'page')
    // Client redirects instantly — background job fills in the draft
  } else {
    revalidatePath('/dashboard/session', 'page')
    redirect('/dashboard/session')
  }
}
```

> [!WARNING]
> The background route handler must be protected against unauthorized calls. Pass a
> signed token or a short-lived secret in the request body, validated server-side. Never
> expose `session_id` + `match_id` alone as authorization.

#### Draft screen loading state — `Matchmaker.tsx`

```typescript
// If pending_draft is null, the background job is still running
if (!session.pending_draft) {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-4">
      <div className="animate-spin text-4xl">⚙️</div>
      <p className="text-gray-400 text-sm">Calculating next match...</p>
    </div>
  )
}
```

The existing `RealtimeSubscriber` in the dashboard live page already triggers
`router.refresh()` on session updates — so when `pending_draft` is written by the
background job, the matchmaker automatically re-renders with the draft data.

> [!NOTE]
> The `RealtimeSubscriber` for the hoster's `/dashboard/live` page needs to be verified
> or added. Currently only the spectator view has one. The hoster page likely relies on
> `revalidatePath` instead.

---

### Data Consistency Guarantee

The fast path marks the match as `is_completed = true` before the MMR writes complete.
This creates a brief window where the match is over but stats aren't updated yet.

**Risk scenarios:**
- Browser crash after fast redirect → MMR for that match is lost.
- Server crash mid-background-job → partial MMR updates possible.

**Mitigation:**
- The background job can check `matches.is_completed = true` AND `mmr_history` rows
  don't exist yet for that `match_id` to detect incomplete jobs on retry.
- For a court-side social app, this risk is acceptable. If it becomes a concern later,
  a job queue (e.g., Supabase Edge Functions + pg_cron) can be added.

---

## Files Changed

| File | Change |
|---|---|
| `src/app/dashboard/live/[session_id]/actions.ts` | Parallelize player writes; skip redundant draft recomputation; split `finishMatch` fast/background |
| `src/app/api/finish-match/route.ts` | **New file** — background MMR + draft computation |
| `src/app/dashboard/live/[session_id]/Matchmaker.tsx` | Loading spinner while `pending_draft` is null |
| `src/app/view/[pin]/page.tsx` | `unstable_cache` wrapper for roster queries |
| `.env.local` | Add `NEXT_PUBLIC_APP_URL` if not already present |

---

## Effort

| Phase | Task | Estimate |
|---|---|---|
| Phase 1 | Parallelize `finishMatch` player writes | ~1 h |
| Phase 1 | Skip redundant `computeMatchDraft` | ~30 min |
| Phase 1 | Cache spectator roster queries | ~30 min |
| Phase 2 | `src/app/api/finish-match/route.ts` background handler | ~2 h |
| Phase 2 | Split `finishMatch` action into fast + fire-and-forget | ~1 h |
| Phase 2 | `Matchmaker.tsx` loading state + Realtime wiring | ~1 h |
| Phase 2 | Auth token for background route protection | ~30 min |
| **Total** | | **~6–7 h** |

**Risk:** Low-Medium.
- Phase 1 is zero-risk refactoring.
- Phase 2 introduces a brief MMR consistency window, acceptable for this use case.

**Dependencies:** None. Can be done before any ROADMAP feature.

---

## Not In Scope (Deferred)

- **Full in-memory client store (Zustand):** Reserved for if the app scales to many
  concurrent multi-device sessions. The complexity/benefit ratio is too high right now.
- **Supabase Edge Functions for background jobs:** The Route Handler approach is simpler
  to deploy on Vercel. Edge Functions are an alternative if Vercel cold starts become a problem.
- **Retry/idempotency for background job failures:** Can be added later with a
  `finish_match_jobs` table and a cron job.
