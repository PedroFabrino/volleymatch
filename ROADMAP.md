# VolleyMatch — Development Roadmap

All features in implementation order. Each builds on the previous.

---

## 1. Strict Mode Algorithm Correction
**Effort:** Small · **Risk:** Low · **Unblocks:** Items 2, 3

### What Changes & Why
The current strict mode sort mixes bench players and on-court players into one list, using winner/loser result as a tiebreaker. This creates implicit king-of-the-hill behaviour and makes the spectator queue non-deterministic.

**Correct behaviour:**
- Pool all present players after each match — nobody stays on as a team unit
- Fill position blueprint slots in three strict priority groups per slot:
  1. **Bench players** (not in last match) — `games_played ASC` → `MMR DESC`
  2. **Winners** — `games_played ASC` → `MMR DESC`
  3. **Losers** — `games_played ASC` → `MMR DESC`
- Team assignment: purely MMR balancing of selected players
- Match result has zero effect on WHETHER a bench player plays — only on who fills leftover slots

**Casual mode is correct as-is. No changes.**

### Files Changed

**`src/utils/matchmaking.ts` — `draftStrictTeams()`**

Signature stays the same (winner/loser IDs still needed). Internal logic replaces the single sorted list with three explicit groups and a `drawCandidates()` helper that drains them in order:

```typescript
const lastMatchAllIds = new Set([...lastMatchWinningTeamIds, ...lastMatchLosingTeamIds])

const benchPlayers  = allAvailablePlayers.filter(p => !lastMatchAllIds.has(p.id))
const winnerPlayers = allAvailablePlayers.filter(p => lastMatchWinningTeamIds.includes(p.id))
const loserPlayers  = allAvailablePlayers.filter(p => lastMatchLosingTeamIds.includes(p.id))

// Each group sorted: games_played ASC → MMR DESC (no Math.random())
// drawCandidates(pos, count, excludeSet) drains bench → winners → losers
```

Remove the `Math.random()` pre-shuffle (the `.sort(() => Math.random() - 0.5)` call that precedes `.sort(sortByDeserving)`). Everything else in the function (blueprint, MMR team balancing, 6v6 fallback, `active_positions` via `getPos()`) is untouched.

**`src/app/dashboard/live/[session_id]/actions.ts`** — No changes. Winner/loser IDs still queried and passed as before.

**`src/utils/matchmaking.test.ts`** — Update tests to assert group-priority behaviour.

---

## 2. Spectator Queue Redesign
**Effort:** Medium · **Risk:** Low · **Depends on:** Item 1

### What Changes & Why
The current queue is a flat sorted list that implies playing order but lies in strict mode (a setter in position 3 may not play if setter slots are full). The fix redesigns the queue around **name recognition as the primary signal** — the viewer finds their name in "Playing Next" or "Sitting Out", no volleyball knowledge required.

### New utility: `previewNextDraft()`

Add to `src/utils/matchmaking.ts`. Mirrors `draftStrictTeams()` three-group logic exactly — **fully deterministic**, no `Math.random()`. Returns each player annotated with:

```typescript
// Three statuses — no 'on_deck' distinction. Anyone not playing is simply 'sitting_out'.
type PlayerDraftStatus = 'in_next_match' | 'position_conflict' | 'sitting_out'

type PlayerWithStatus = Player & {
  draftStatus: PlayerDraftStatus
  // positionSlotFill only populated in strict mode for players NOT in_next_match:
  positionSlotFill: Array<{
    position: string  // e.g. 'Setter'
    filled: number    // how many of this slot are already taken by selected players
    total: number     // total slots in blueprint (e.g. 2 for Setter in 7v7)
  }>
}
```

**Key guarantee from Item 1:** Because bench players always fill slots before on-court players, bench player status is **deterministic during a live match** — match outcome cannot change whether they play, only who they play with. No "projected if Red wins" logic needed.

### `src/app/view/[pin]/page.tsx`

Add query for last completed match to derive winner/loser IDs. Run `previewNextDraft()` server-side. Pass `playersWithStatus` to child components instead of raw `players` + `queue`.

```typescript
// New query (last completed match for winner/loser group separation):
const { data: lastCompletedMatch } = await supabase
  .from('matches')
  .select('team_a_players, team_b_players, team_a_score, team_b_score')
  .eq('session_id', session.id)
  .eq('is_completed', true)
  .order('completed_at', { ascending: false })
  .limit(1)
  .maybeSingle()
```

### `SpectatorMatchmaker.tsx` — Between-matches view

Replace spinning icon + flat list with two named sections:

```
✅  PLAYING NEXT          7 players
────────────────────────────────────
Pedro          [Setter]
Ana            [Outside Hitter]
...

🕐  SITTING OUT           5 players
────────────────────────────────────
Bruna    [Setter]   ●●         ← both setter dots filled
Felipe   [OH]       ●●●○       ← 3 of 4 OH slots filled
Sofia    [Libero]   ●○         ← 1 of 2 libero slots filled
```

Dot indicators (`●○`) next to position chips show slot fill state for sitting-out players. Dots are **universal** — a full row `●●` means "no room" without requiring volleyball knowledge. Casual mode: no dots, no position chips in sitting-out section (selection is purely by games_played).

### `SpectatorScoreboard.tsx` — During-match queue strip

Replace uniform chips with status-coloured chips. Shows bench players only (those not in the active match):
- `✅` green = `in_next_match` (deterministic — bench player status never depends on match outcome)
- `⚠️` amber = `position_conflict` (all slots for their position are already taken by other bench players with fewer games)
- `🕐` gray = `sitting_out` (beyond the draft pool)

No "projected if X wins" toggle — queue is now deterministic during a match.

---

## 3. QR Player Self-Registration + Auto-Join
**Effort:** Medium-High · **Risk:** Medium · **Depends on:** nothing

### What Changes & Why
Currently the Hoster manually types every new player's name and picks their positions. A QR code lets new arrivals self-register from their own phone, appearing instantly in the session queue — no Hoster action needed.

### Database

```sql
CREATE TABLE public.invite_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  hoster_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at  TIMESTAMP WITH TIME ZONE NOT NULL
              DEFAULT (now() + interval '15 minutes'),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosters can manage their invite tokens" ON public.invite_tokens
  FOR ALL USING (auth.uid() = hoster_id);
CREATE POLICY "Public can validate unexpired tokens" ON public.invite_tokens
  FOR SELECT USING (expires_at > now());
```

### New Utility: `src/utils/supabase/service.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`. Never exposed to client.

### Server Actions

**`src/app/dashboard/session/actions.ts`** — add `createInviteToken(sessionId)`:
- Deletes previous tokens for this session (cleanup)
- Inserts new token with 15-minute expiry
- Returns `{ token, expiresAt }`
- **Note:** This server action returns data to a Client Component (`QrInvitePanel`). Call it using `useTransition` or a direct `async` call inside a `useEffect`/event handler — not via a `<form action>`. Both patterns are valid in Next.js App Router for server actions that return values.

**`src/app/join/[token]/actions.ts`** — `joinSession(formData)`:
- Validates token is unexpired (using service client — no auth required)
- Validates session is still active
- Validates name (non-empty, ≤50 chars, not a duplicate in roster)
- Validates positions against allowed enum values
- Inserts player into `players` (MMR: 1000, tier: Intermediate) via service client
- Upserts into `session_players` (games_played: 0) — auto-queues them
- Redirects to `/view/[session_pin]` — they land on the live spectator view and see the queue

### UI

**Session page** — `QrInvitePanel.tsx` (Client Component):
- Only renders when a session is active
- On mount: calls `createInviteToken()` to get first token
- Shows QR code (`qrcode.react`) + copyable URL
- Countdown to expiry; auto-calls `createInviteToken()` again at ~2 min remaining, QR updates silently
- New arrivals appear in the attendance list with a `🆕` badge (Supabase Realtime refresh)

**Public join page** — `/join/[token]/page.tsx`:
```
🏐 VolleyMatch
You've been invited to play!

Your name: [__________]
Your positions: [Setter] [OH] [MB] [Libero] [Opp]

[ Join the Game! → ]
```
On success → `redirect('/view/[pin]')`

**Edge cases:**
- Token expired → form shows error, user asks host to refresh QR
- Session ended before submit → "This session has already ended"
- Duplicate name → "A player named X already exists — ask the host"
- Mid-match join → added to `session_players`, appears in queue, host can sub in or they play next draft

---

## 4. MMR History Table
**Effort:** Small · **Risk:** Very Low · **Unblocks:** Item 5 (partially), Item 6

### What Changes & Why
Currently, `players.mmr` is overwritten on every match completion — there is no record of how it changed or why. This table is the infrastructure that powers the Session Summary "biggest gainer" stat, future player profile graphs, and — critically — is the data that becomes meaningful when players can claim their own accounts (Item 6).

**Build this before Item 5** so that by the time the Summary Card is implemented, real historical data already exists to compute the "Biggest MMR Gainer" stat.

### Who Sees This Data Now?
The MMR history is **Hoster-visible** immediately. It powers:
- The Session Summary share card (Hoster shares it → players see their stats indirectly)
- The Leaderboard page (already exists, can show MMR progression)

Players see their own data indirectly until Item 6 (Player Reclaim) gives them a login. This is intentional sequencing — build the data layer first, surface it to players second.

### Database

```sql
CREATE TABLE public.mmr_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  hoster_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id    UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  session_id  UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  old_mmr     INTEGER NOT NULL,
  new_mmr     INTEGER NOT NULL,
  mmr_change  INTEGER NOT NULL,  -- signed: positive = gain, negative = loss
  reason      TEXT NOT NULL DEFAULT 'match_result',
  -- reason values: 'match_result' | 'manual_adjustment' | 'session_start_snapshot'
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mmr_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosters can view their players mmr history"
  ON public.mmr_history FOR SELECT USING (auth.uid() = hoster_id);
CREATE POLICY "Hosters can insert mmr history"
  ON public.mmr_history FOR INSERT WITH CHECK (auth.uid() = hoster_id);
```

### Code Changes

**`src/app/dashboard/session/actions.ts` — `startSession()`:**
After inserting `session_players`, snapshot current MMR for each present player:
```typescript
await supabase.from('mmr_history').insert(
  presentPlayers.map(p => ({
    player_id: p.id, hoster_id: user.id, session_id: session.id,
    match_id: null, old_mmr: p.mmr, new_mmr: p.mmr,
    mmr_change: 0, reason: 'session_start_snapshot'
  }))
)
```

**`src/app/dashboard/live/[session_id]/actions.ts` — `finishMatch()`:**
After the existing `players.update({ mmr })` loop, also insert into `mmr_history`:
```typescript
await supabase.from('mmr_history').insert(
  mmrUpdates.map(u => ({
    player_id: u.playerId, hoster_id: user.id,
    match_id: matchId, session_id: sessionId,
    old_mmr: u.oldMmr, new_mmr: u.newMmr,
    mmr_change: u.mmrChange, reason: 'match_result'
  }))
)
```

**Session delta computation** (for summary card "biggest gainer"):
```
delta = (last 'match_result' new_mmr for player in this session)
      - (session_start_snapshot old_mmr for player in this session)
```

---

## 5. Session Summary Share Card
**Effort:** Medium · **Risk:** Low · **Depends on:** Item 4

### What Changes & Why
After "End Game Day", instead of returning to the dashboard, the Hoster lands on a visual recap of the session. They can share it as a PNG to their WhatsApp group — branding for VolleyMatch on every share.

### Database

```sql
ALTER TABLE public.sessions
  ADD COLUMN summary_data JSONB DEFAULT NULL;
```

Populated at session end with all pre-computed stats so the summary page is a single cheap read.

### Stats Computed at `endSession()` Time

| Stat | Source | Notes |
|---|---|---|
| Total games, duration, total points | `matches` table | Simple aggregates |
| 🏆 MVP | `matches` winner arrays | Most wins this session |
| 📈 Biggest MMR gainer | `mmr_history` table | Requires Item 4 to be shipped first |
| 💥 Match of the Day | `matches` | Smallest final margin |
| 🔥 Biggest Comeback | `match_events` point timeline | Max deficit climbed by the winning team |
| 💪 Iron Man | `session_players.games_played` | Played every game |

**Comeback detection** uses the `match_events` table (already stores running score per point):
```
For each match: replay point-by-point
  Track maximum deficit of the eventual winner at any moment
Best comeback = highest deficit that the winning team overcame
Only surfaced if deficit ≥ 3 points
```

### New Page: `/dashboard/session/summary/[session_id]`

Server Component. Reads `sessions.summary_data`. Renders the card as a visual layout.

```
┌──────────────────────────────────┐
│  🏐  GAME DAY RECAP              │
│  Sunday, Jun 29 · 3h 12min       │
│  6 games · 184 pts total         │
│  ──────────────────────────────  │
│  🏆 MVP                          │
│  Pedro  ·  5W / 6 games          │
│  ──────────────────────────────  │
│  📈 BIGGEST GAINER               │
│  Ana  ·  +87 MMR                 │
│  ──────────────────────────────  │
│  💥 MATCH OF THE DAY  [Game 4]   │
│  Red 14 × 12 Blue                │
│  🔴 Pedro, Ana, Guilherme,       │
│      Carlos, Bruna, Leo          │
│  🔵 Marcos, Julia, Thiago,       │
│      Renata, Felipe, Sofia       │
│  ──────────────────────────────  │
│  🔥 BIGGEST COMEBACK  [Game 3]   │
│  Blue was down 3–8               │
│  and won 12–10                   │
│  ──────────────────────────────  │
│  💪 IRON MAN                     │
│  Carlos · played all 6 games     │
│  ──────────────────────────────  │
│      ⚡ Powered by VolleyMatch    │
└──────────────────────────────────┘
```

**Image generation:** This is the one exception to the project's server-actions-only pattern. Use a Next.js API route handler at `src/app/api/og/session-summary/route.ts` with `@vercel/og` — it returns a PNG image response, which cannot be done via a server action. The summary page fetches this URL client-side to get the image blob for sharing.

The "Share" button uses the Web Share API (`navigator.share({ files: [blob] })`). Fallback: download PNG.

**`endSession()` in `session/actions.ts`:** compute stats, write `summary_data`, then `redirect('/dashboard/session/summary/' + sessionId)` instead of revalidating dashboard.

---

### What Changes & Why
Currently, `players.mmr` is overwritten on every match completion — there is no record of how it changed or why. This table is the infrastructure that powers the Session Summary "biggest gainer" stat, future player profile graphs, and — critically — is the data that becomes meaningful when players can claim their own accounts (Item 6).

### Who Sees This Data Now?
The MMR history is **Hoster-visible** immediately. It powers:
- The Session Summary share card (Hoster shares it → players see their stats indirectly)
- The Leaderboard page (already exists, can show MMR alongside wins)
- The Spectator view (can surface a player's current MMR as context)

Players see their own data indirectly until Item 6 (Player Reclaim) gives them a login. This is intentional sequencing — build the data layer first, surface it to players second.

### Database

```sql
CREATE TABLE public.mmr_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  hoster_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id    UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  session_id  UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  old_mmr     INTEGER NOT NULL,
  new_mmr     INTEGER NOT NULL,
  mmr_change  INTEGER NOT NULL,  -- signed: positive = gain, negative = loss
  reason      TEXT NOT NULL DEFAULT 'match_result',
  -- reason: 'match_result' | 'manual_adjustment' | 'session_start_snapshot'
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.mmr_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosters can view their players mmr history"
  ON public.mmr_history FOR SELECT USING (auth.uid() = hoster_id);
CREATE POLICY "Hosters can insert mmr history"
  ON public.mmr_history FOR INSERT WITH CHECK (auth.uid() = hoster_id);
```

### Code Changes

**`src/app/dashboard/session/actions.ts` — `startSession()`:**
After inserting `session_players`, snapshot current MMR for each present player:
```typescript
await supabase.from('mmr_history').insert(
  presentPlayers.map(p => ({
    player_id: p.id, hoster_id: user.id, session_id: session.id,
    match_id: null, old_mmr: p.mmr, new_mmr: p.mmr,
    mmr_change: 0, reason: 'session_start_snapshot'
  }))
)
```

**`src/app/dashboard/live/[session_id]/actions.ts` — `finishMatch()`:**
After the existing `players.update({ mmr })` loop, also insert into `mmr_history`:
```typescript
await supabase.from('mmr_history').insert(
  mmrUpdates.map(u => ({
    player_id: u.playerId, hoster_id: user.id,
    match_id: matchId, session_id: sessionId,
    old_mmr: u.oldMmr, new_mmr: u.newMmr,
    mmr_change: u.mmrChange, reason: 'match_result'
  }))
)
```

**Session delta computation** (for summary card "biggest gainer"):
```
delta = (last 'match_result' new_mmr for player in this session)
      - (session_start_snapshot old_mmr for player in this session)
```

---

## 6. Session End Flow & Shareable Image
**Effort:** Small-Medium · **Risk:** Low · **Depends on:** Item 5

### What Changes & Why
Currently `endSession()` just marks the session inactive and revalidates the dashboard — the Hoster lands back on the session page with no recap. This item closes the loop:
1. **Auto-redirect** to the summary page the moment the session ends, so the Hoster sees the recap without any extra navigation.
2. **Shareable PNG image** — the summary card already renders in the browser; exporting it as an image makes it trivially shareable to WhatsApp groups without the recipient needing an account.

### 6a. `endSession()` Redirect

**`src/app/dashboard/session/actions.ts` — `endSession()`:**

Replace the final `revalidatePath('/dashboard', 'layout')` with a redirect to the summary page:

```typescript
// After marking session inactive and resetting attendance:
redirect(`/dashboard/summary/${sessionId}`)
```

The same change applies wherever `endSession()` is called from the live page (`Matchmaker.tsx`).

### 6b. `sessions.summary_data` Column (Pre-computation)

**Why pre-compute:** The share image route needs to render the exact same snapshot every time someone opens the share link. On-demand recomputation is acceptable while iterating, but for a stable shareable card the data must be frozen at session end.

**Database:**
```sql
ALTER TABLE public.sessions
  ADD COLUMN summary_data JSONB DEFAULT NULL;
```

**`endSession()` — compute and persist before redirect:**
```typescript
const summaryData = await getSessionSummaryData(supabase, sessionId)
await supabase
  .from('sessions')
  .update({ summary_data: summaryData })
  .eq('id', sessionId)

redirect(`/dashboard/summary/${sessionId}`)
```

The summary page reads `summary_data` first; falls back to live computation if null (for sessions created before this migration).

### 6c. Shareable PNG — `src/app/api/og/session-summary/route.ts`

Use `@vercel/og` to return a PNG image response from the frozen `summary_data`:

```typescript
// GET /api/og/session-summary?session_id=<uuid>
import { ImageResponse } from '@vercel/og'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  // Fetch session.summary_data (public read — no auth needed for the image)
  // Render the card layout as JSX → PNG
  return new ImageResponse(<SummaryCardImage data={summaryData} />, { width: 1080, height: 1080 })
}
```

**Share button** in the summary page (`HighlightsGrid.tsx` or a new `ShareButton.tsx` client component):
```typescript
const blob = await fetch(`/api/og/session-summary?session_id=${sessionId}`).then(r => r.blob())
const file = new File([blob], 'game-day-recap.png', { type: 'image/png' })
if (navigator.canShare?.({ files: [file] })) {
  await navigator.share({ files: [file], title: 'Game Day Recap' })
} else {
  // Fallback: trigger download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'game-day-recap.png'; a.click()
}
```

**Note:** This is the one exception to the project's server-actions-only pattern. `@vercel/og` returns a `Response` with an image body — this cannot be done via a server action and requires a Route Handler.

### Edge Cases
- Session with 0 matches → summary shows empty state, no error
- `navigator.share` not supported (desktop) → fallback to download
- `summary_data` null (pre-migration sessions) → page falls back to live DB computation, share button disabled or hidden

---

## 7. Player Account Reclaim
**Effort:** High · **Risk:** Medium · **Depends on:** Item 6 · 🔮 Future

### What Changes & Why
Players are currently name records owned by a Hoster. This feature lets a real Supabase Auth user claim their record — linking their identity to their history — without disrupting the Hoster's data.

### Database

```sql
-- Link a player record to a real auth user (optional — null until claimed)
ALTER TABLE public.players
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;

-- Claim requests, pending Hoster approval
CREATE TABLE public.player_claims (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  hoster_id         UUID NOT NULL REFERENCES auth.users(id),
  claimant_user_id  UUID NOT NULL REFERENCES auth.users(id),
  status            TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at       TIMESTAMP WITH TIME ZONE
);
```

### Claim Flow

1. Pedro signs up for a Hoster account (standard Supabase Auth signup)
2. On his dashboard: "Already playing in someone's group? Find your record" → enters PIN
3. Sees list of player names in that session → taps "That's me"
4. Claim created with `status: 'pending'`
5. Hoster sees notification: "Pedro has claimed the player record 'Pedro'. [Approve] [Reject]"
6. On approval: `players.user_id = Pedro's user ID`
7. Pedro can now log in and see his full `mmr_history` across all sessions he's been part of

### Privacy Rules
- `hoster_id` unchanged — Hoster retains ownership of the record
- `user_id` grants **read-only** access to the player's own history
- Hoster can revoke at any time (`user_id = null`)
- Players cannot edit their own MMR or stats

---

## 8. AppSumo Lifetime Deal
**Effort:** Business only · **Risk:** Low · 🔮🔮 Far Future

### Prerequisites (all must be true before applying)
- [ ] Freemium paywall live and enforced
- [ ] At least 50 happy active users for Day 1 reviews
- [ ] Terms of Service + Privacy Policy pages
- [ ] Support system (help docs + contact email)
- [ ] Clear sunset guarantee in ToS (minimum 2 years)

### Suggested Offer
| Tier | Price | Access |
|---|---|---|
| 1 code | $59 | 1 Hoster, up to 25 players, lifetime |
| 2 codes | $118 | 1 Hoster, unlimited players + data export |
| 3 codes | $177 | 3 Hosters, shared group leaderboard |

Expected: 200–600 purchases → $12k–$35k one-time. Run once, cap at ~500 licenses, close the deal.

---

## Implementation Checklist

```
[x] 1. Algorithm Correction
      [x] draftStrictTeams() — three group priority, remove Math.random() pre-shuffle
      [x] matchmaking.test.ts — update assertions

[x] 2. Spectator Queue Redesign
      [x] previewNextDraft() utility function
      [x] view/[pin]/page.tsx — add last-match query, run preview
      [x] SpectatorMatchmaker.tsx — two-section layout + dot indicators
      [x] SpectatorScoreboard.tsx — status-coloured queue strip

[x] 3. QR Self-Registration  (simplified: PIN-based, no token rotation)
      [x] src/utils/supabase/admin.ts — service role client
      [x] /join/[pin] public page + joinSessionAction() server action
      [x] QR code in global top bar (visible on session + live pages)
      [x] Autocomplete for returning players, late-joiner FIFO queue

[x] 4. MMR History Table
      [x] mmr_history table + RLS
      [x] startSession() — snapshot MMRs
      [x] finishMatch() — record history rows

[x] 5. Session Summary Card  (on-demand computation — see Item 6 for snapshot + share)
      [x] /dashboard/summary/[session_id] page
      [x] getSessionSummaryData() — MVP, comeback, blowout, leaderboard, iron man

[ ] 6. Session End Flow & Shareable Image
      [ ] endSession() — redirect to /dashboard/summary/[session_id]
      [ ] sessions.summary_data JSONB column — supabase/migrations/*.sql migration file
      [ ] Apply migration to production (supabase db push)
      [ ] endSession() — compute stats via getSessionSummaryData(), persist summary_data
      [ ] Summary page reads summary_data first, falls back to live query
      [ ] src/app/api/og/session-summary/route.ts (@vercel/og — API route exception)
      [ ] ShareButton.tsx — Web Share API + download fallback

[ ] 7. Player Account Reclaim  🔮
      [ ] players.user_id column
      [ ] player_claims table + RLS
      [ ] Claim request flow UI
      [ ] Hoster approval notification + UI
      [ ] Claimed player dashboard (read-only history view)

[ ] 8. AppSumo Launch  🔮🔮
      [ ] Freemium paywall
      [ ] Legal pages
      [ ] Apply at appsumo.com/businesses
```
