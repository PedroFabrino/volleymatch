# Feature: Spectator Point Attribution

Spectators watching the match at `/view/[pin]` can vote on who scored a point while the
match is live. This is a data-enrichment layer — spectators **never touch the score**,
that stays 100% with the hoster. The data surfaces later in the Session Summary card.

---

## User Flow

1. The scoreboard shows the current score (Red N × Blue M) — same as today.
2. When a point is scored and the score number ticks up via Realtime refresh, a **"Who Scored?"
   voting panel** slides up from the bottom of the screen.
3. The panel shows the scoring team's 6 players as large tap targets, with a live vote count
   visible next to each name (e.g. "Pedro · 3 votes"). All spectators see the counts update
   in real time.
4. Tapping a player casts the vote and immediately shows a brief toast notification:
   **"Voted for Pedro ✓"**. The panel stays open so other spectators can still vote.
5. The voting window lasts **10 seconds**, starting from when the panel opens. A visible
   countdown timer shows the remaining time.
6. **Edge case — rapid points:** If a new point is scored before the 10-second window
   closes, the current panel closes immediately and a new one opens for the latest point.
   The previous point's votes are already recorded and are not lost.
7. After the window closes (or if the spectator already voted), the panel collapses.
   The spectator's voted state is persisted in `localStorage` keyed on
   `match_id + score_a + score_b`, so a `router.refresh()` cycle does not reset it.
8. On the hoster's screen: a subtle, non-intrusive toast appears ("🗳️ Spectators voted:
   Pedro") — visible for ~3 seconds, no modal, no action required.
9. At the end of the session, the Summary Card can show **"Top Scorer"** derived from
   majority-wins attribution across all points.

---

## Design Decisions (Resolved)

| Decision | Choice | Rationale |
|---|---|---|
| Voting window | **10 seconds** | Enough for most rallies; window resets on next point |
| Rapid points | **Immediately replace panel** | Simpler UX; prior votes already saved |
| Vote visibility | **Show live counts to all spectators** | More engaging, low stakes |
| Hoster feedback | **Brief toast, non-blocking** | Keeps scoreboard clean |
| Tally method | **Majority wins; first-touch tiebreaker** | Fair and deterministic |
| Identity | **Anonymous voter token** (localStorage UUID) | Zero friction, no account needed |

---

## Architecture

### Voter Identity

Each spectator is assigned a random UUID on first visit, stored in `localStorage` under
the key `volleymatch_voter_token`. This token is passed with every vote. It provides:

- **Deduplication:** the DB unique constraint prevents double-voting per point per token.
- **"Already voted" state:** after a `router.refresh()`, the component reads `localStorage`
  to know if it should show "You voted for Pedro ✓" instead of the picker.

This is intentionally lightweight. A determined bad actor can clear localStorage, but this
is a fun social feature — not a competitive ranking — so the trade-off is fine.

---

## Database

```sql
-- Migration file: supabase/migrations/<timestamp>_point_attributions.sql

CREATE TABLE public.point_attributions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  session_id       UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  -- Score snapshot acts as the point identifier (no need to join match_events)
  score_a          INTEGER NOT NULL,
  score_b          INTEGER NOT NULL,
  -- Who spectators think scored
  attributed_to    UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team             TEXT NOT NULL CHECK (team IN ('a', 'b')),
  -- Anonymous identity
  voter_token      TEXT NOT NULL,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- One vote per (match + score snapshot + voter token)
CREATE UNIQUE INDEX point_attributions_unique_vote
  ON public.point_attributions (match_id, score_a, score_b, voter_token);

ALTER TABLE public.point_attributions ENABLE ROW LEVEL SECURITY;

-- Spectators (anonymous) can insert votes
CREATE POLICY "Spectators can insert attributions"
  ON public.point_attributions FOR INSERT WITH CHECK (true);

-- Public read for active sessions (spectators need to see live vote counts)
CREATE POLICY "Public can read attributions for active sessions"
  ON public.point_attributions FOR SELECT
  USING (
    session_id IN (SELECT id FROM sessions WHERE is_active = true)
  );

-- Hosters can read their own historical attributions (for summary card)
CREATE POLICY "Hosters can read their attributions"
  ON public.point_attributions FOR SELECT
  USING (
    session_id IN (SELECT id FROM sessions WHERE hoster_id = auth.uid())
  );
```

> **Why `(score_a, score_b)` as the point key?**
> It avoids coupling to `match_events` rows. Two points at the same score (e.g., score
> is corrected then re-scored) are treated as the same point — acceptable edge case.

---

## Server Action

**New file:** `src/app/view/[pin]/actions.ts`

```typescript
'use server'

import { createClient } from '@/utils/supabase/server'

export async function submitPointAttribution(
  matchId: string,
  sessionId: string,
  playerId: string,
  team: 'a' | 'b',
  scoreA: number,
  scoreB: number,
  voterToken: string
) {
  const supabase = await createClient()

  // Guard: match must still be active
  const { data: match } = await supabase
    .from('matches')
    .select('is_completed, team_a_players, team_b_players, team_a_score, team_b_score')
    .eq('id', matchId)
    .single()

  if (!match || match.is_completed) return { error: 'match_not_active' }

  // Guard: player must be on the scoring team
  const teamPlayers = team === 'a' ? match.team_a_players : match.team_b_players
  if (!teamPlayers.includes(playerId)) return { error: 'player_not_on_team' }

  // Guard: score snapshot must match current state (anti-abuse for stale requests)
  if (match.team_a_score !== scoreA || match.team_b_score !== scoreB) {
    return { error: 'score_stale' }
  }

  const { error } = await supabase.from('point_attributions').insert({
    match_id: matchId,
    session_id: sessionId,
    score_a: scoreA,
    score_b: scoreB,
    attributed_to: playerId,
    team,
    voter_token: voterToken,
  })

  // Unique constraint violation = already voted. Not an error from the UX perspective.
  if (error && error.code !== '23505') {
    console.error('Failed to insert attribution:', error)
    return { error: 'insert_failed' }
  }

  return { ok: true }
}
```

---

## Realtime — Live Vote Counts

The spectator page already has a Supabase Realtime subscription in `RealtimeSubscriber.tsx`.
We add a **second channel** that listens to `point_attributions` inserts filtered by
`session_id`. On each insert event, the client updates a local vote-count map in state
without doing a full `router.refresh()` — this keeps the panel snappy.

```typescript
// Inside RealtimeSubscriber.tsx or a new VoteCountSubscriber.tsx
const attributionsChannel = supabase.channel('public:point_attributions')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'point_attributions',
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => {
      onNewVote(payload.new)  // callback to update local vote counts state
    }
  )
  .subscribe()
```

`onNewVote` is a callback passed down from `SpectatorScoreboard.tsx` that increments a
`Map<playerId, count>` held in component state — no full page reload needed for vote display.

---

## UI — `SpectatorScoreboard.tsx` Changes

### State additions

```typescript
type VotingState = 'idle' | 'voting' | 'voted'

const [votingState, setVotingState] = useState<VotingState>('idle')
const [votingTeam, setVotingTeam] = useState<'a' | 'b' | null>(null)
const [votingScoreSnapshot, setVotingScoreSnapshot] = useState<{ a: number; b: number } | null>(null)
const [voteCounts, setVoteCounts] = useState<Map<string, number>>(new Map())
const [myVote, setMyVote] = useState<string | null>(null)  // playerId I voted for
const [countdown, setCountdown] = useState(10)
const prevScoreRef = useRef({ a: match.team_a_score, b: match.team_b_score })
```

### Score change detection

```typescript
useEffect(() => {
  const prev = prevScoreRef.current
  const newA = match.team_a_score
  const newB = match.team_b_score

  if (newA > prev.a) {
    openVotingPanel('a', newA, newB)
  } else if (newB > prev.b) {
    openVotingPanel('b', newA, newB)
  }

  prevScoreRef.current = { a: newA, b: newB }
}, [match.team_a_score, match.team_b_score])
```

### Voting panel

Slides up from the bottom of the scoreboard area (does not replace the score display):

```
┌──────────────────────────────────────────┐
│  🏐 Who scored for RED?           [8s ⏱] │
│  ──────────────────────────────────────  │
│  [ Pedro           3 votes            ] │
│  [ Ana             1 vote             ] │
│  [ Guilherme       0 votes            ] │
│  [ Carlos          2 votes            ] │
│  [ Bruna           0 votes            ] │
│  [ Leo             0 votes            ] │
└──────────────────────────────────────────┘
```

After tapping Pedro → toast appears "Voted for Pedro ✓" for 2 seconds. Panel stays open
for remaining spectators. Tapping button becomes disabled for the voter who already voted.

### Hoster toast

In `Scoreboard.tsx`, subscribe to the same `point_attributions` Realtime channel. After
the voting window closes (listen for a 10s debounce after the last insert for that
score snapshot), fire a toast with the majority winner:

```
"🗳️ Spectators: Pedro scored"
```

Use a simple `setTimeout` + state flag. No library needed.

---

## Files Touched

| File | Change |
|---|---|
| `supabase/migrations/<ts>_point_attributions.sql` | New migration |
| `src/app/view/[pin]/actions.ts` | **New file** — `submitPointAttribution` |
| `src/app/view/[pin]/SpectatorScoreboard.tsx` | Voting panel UI + score change detection |
| `src/app/view/[pin]/RealtimeSubscriber.tsx` | Add `point_attributions` channel |
| `src/app/dashboard/live/[session_id]/Scoreboard.tsx` | Hoster toast on majority winner |
| `src/app/dashboard/summary/[session_id]/page.tsx` | "Top Scorer" stat (optional, later) |

---

## Effort

| Task | Estimate |
|---|---|
| DB migration + RLS policies | ~30 min |
| `submitPointAttribution` server action | ~1 h |
| Realtime vote-count subscription | ~30 min |
| `SpectatorScoreboard.tsx` voting panel | ~2–3 h |
| `localStorage` voter token + dedup state | ~30 min |
| Hoster toast in `Scoreboard.tsx` | ~30 min |
| "Top Scorer" on Summary Card *(optional)* | ~1 h |
| **Total (without Summary Card)** | **~5–6 h** |

**Risk:** Low — purely additive, no existing flow is modified.  
**Dependencies:** None — can be shipped independently at any time.
