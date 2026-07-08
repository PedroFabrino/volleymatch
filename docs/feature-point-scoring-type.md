# Feature: Point Scoring Type (Spike / Block / Ace / Other)

Extends the existing **Spectator Point Attribution** flow with a second step: after a spectator selects *who* scored, the panel expands to ask *how* they scored. The selected scoring type is persisted alongside the attribution for later analytics.

> **Depends on:** `feature-spectator-point-attribution.md` — that feature must be live (or shipped together).

---

## User Flow

1. Score ticks up → **"Who Scored?"** voting panel slides up (existing behaviour).
2. Spectator taps a player name → panel **expands** smoothly to reveal a second row of four large tap-target buttons:

   ```
   ┌──────────────────────────────────────────┐
   │  🏐 Who scored for RED?           [8s ⏱] │
   │  ──────────────────────────────────────  │
   │  [ Pedro  ✓  (your vote)               ] │  ← player row, locked/highlighted
   │                                          │
   │  How did Pedro score?                    │  ← expands below
   │  ┌──────────┐ ┌──────────┐              │
   │  │  🏃 Spike │ │  🛡 Block │              │
   │  └──────────┘ └──────────┘              │
   │  ┌──────────┐ ┌──────────┐              │
   │  │  🚀 Ace  │ │ ❓ Other │              │
   │  └──────────┘ └──────────┘              │
   └──────────────────────────────────────────┘
   ```

3. Tapping a scoring type completes the vote. A toast appears: **"Voted: Pedro · Spike ✓"**.
4. The panel collapses after the type is chosen (or when the countdown expires).
5. If the countdown expires after the player was chosen but **before** a type is chosen, the vote is saved with `scoring_type = 'other'` automatically so the player attribution is not lost.
6. Spectators who run out of time before selecting a player behave exactly as today — no change.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| UI flow | **Two-step within same panel** (expand, not navigate) | Keeps context visible; no page transition needed |
| Scoring types | `spike`, `block`, `ace`, `other` | Covers all common volleyball point endings; `other` is a catch-all |
| Timeout fallback | Auto-submit `other` if player chosen but type not | Preserves the more valuable player attribution |
| Vote deduplication | Extend existing `voter_token` + score snapshot key | Same mechanism, no extra state |
| Panel animation | CSS `max-height` transition (slide down) | Matches existing `slide-in-from-bottom-full` style |
| `localStorage` key | Same key `volleymatch_vote_<matchId>_<scoreA>_<scoreB>` | Store `{ playerId, scoringType }` as JSON instead of plain string |

---

## Scoring Type Enum

**New file:** `src/types/pointAttribution.ts`

```ts
export type ScoringType = 'spike' | 'block' | 'ace' | 'other'

export const SCORING_TYPE_OPTIONS: {
  value: ScoringType
  label: string
  emoji: string
}[] = [
  { value: 'spike', label: 'Spike', emoji: '🏃' },
  { value: 'block', label: 'Block', emoji: '🛡️' },
  { value: 'ace',   label: 'Ace',   emoji: '🚀' },
  { value: 'other', label: 'Other', emoji: '❓' },
]
```

---

## Database

### Migration

**New file:** `supabase/migrations/20260708000000_point_attributions_scoring_type.sql`

```sql
-- Add scoring_type column to existing point_attributions table
ALTER TABLE public.point_attributions
  ADD COLUMN scoring_type TEXT
    NOT NULL
    DEFAULT 'other'
    CHECK (scoring_type IN ('spike', 'block', 'ace', 'other'));
```

> **Why `DEFAULT 'other'`?**
> Rows inserted before this feature shipped and rows where the spectator ran out of time
> during the type-selection step both default cleanly to `'other'`. The column is `NOT NULL`
> so analytics queries never need to handle `NULL`.

### No extra index needed
`scoring_type` will be used in aggregations (`GROUP BY scoring_type`) rather than
point-lookups, so a B-tree index gives little benefit at this scale.

---

## Server Action Changes

**File:** `src/app/view/[pin]/actions.ts`

Add `scoringType` as an optional parameter to `submitPointAttribution`. Making it optional
ensures existing callers are not broken during a staged rollout.

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { ScoringType } from '@/types/pointAttribution'

export async function submitPointAttribution(
  matchId: string,
  sessionId: string,
  playerId: string,
  team: 'a' | 'b',
  scoreA: number,
  scoreB: number,
  voterToken: string,
  scoringType: ScoringType = 'other'   // ← new optional param with safe default
) {
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('is_completed, team_a_players, team_b_players, team_a_score, team_b_score')
    .eq('id', matchId)
    .single()

  if (!match || match.is_completed) return { error: 'match_not_active' }

  const teamPlayers = team === 'a' ? match.team_a_players : match.team_b_players
  if (!teamPlayers.includes(playerId)) return { error: 'player_not_on_team' }

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
    scoring_type: scoringType,         // ← new field
  })

  if (error && error.code !== '23505') {
    console.error('Failed to insert attribution:', error)
    return { error: 'insert_failed' }
  }

  return { ok: true }
}
```

---

## UI State Machine

The voting panel now has **three internal phases** within the `'voting'` state:

```
idle
 │
 ▼
voting (phase: 'choose_player')
 │                │
 │ player tapped  │ countdown = 0
 ▼                ▼
voting (phase: 'choose_type')   ──► idle
 │                │
 │ type tapped    │ countdown = 0 → auto-submit 'other'
 ▼                ▼
voted ──────────────────────────► idle
```

### New state variables in `SpectatorScoreboard.tsx`

```ts
type VotingPhase = 'choose_player' | 'choose_type'

const [votingPhase, setVotingPhase] = useState<VotingPhase>('choose_player')
const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null)
const [selectedScoringType, setSelectedScoringType] = useState<ScoringType | null>(null)
```

### Replace `castVote` with two handlers

```ts
// Step 1 — player tapped
const selectPlayer = (playerId: string, playerName: string) => {
  if (votingState !== 'voting' || votingPhase !== 'choose_player') return
  setSelectedPlayerId(playerId)
  setSelectedPlayerName(playerName)
  setVotingPhase('choose_type')
  // submitPointAttribution is NOT called yet
}

// Step 2 — scoring type tapped
const selectScoringType = async (scoringType: ScoringType) => {
  if (votingState !== 'voting' || votingPhase !== 'choose_type') return
  if (!selectedPlayerId || !votingScoreSnapshot) return

  setSelectedScoringType(scoringType)
  setMyVote(selectedPlayerId)
  setVotingState('voted')
  setToastMessage(`Voted: ${selectedPlayerName} · ${scoringType} ✓`)
  setTimeout(() => setToastMessage(null), 2500)

  const token = getVoterToken()
  const storedKey = `volleymatch_vote_${match.id}_${votingScoreSnapshot.a}_${votingScoreSnapshot.b}`
  localStorage.setItem(storedKey, JSON.stringify({ playerId: selectedPlayerId, scoringType }))

  await submitPointAttribution(
    match.id,
    session.id,
    selectedPlayerId,
    votingTeam!,
    votingScoreSnapshot.a,
    votingScoreSnapshot.b,
    token,
    scoringType
  )
}
```

### Countdown expiry — extend existing `useEffect`

```ts
} else if (countdown === 0 && votingState !== 'idle') {
  // If player was chosen but type was not, auto-submit 'other'
  if (votingPhase === 'choose_type' && selectedPlayerId && votingScoreSnapshot) {
    const token = getVoterToken()
    const storedKey = `volleymatch_vote_${match.id}_${votingScoreSnapshot.a}_${votingScoreSnapshot.b}`
    localStorage.setItem(storedKey, JSON.stringify({ playerId: selectedPlayerId, scoringType: 'other' }))
    submitPointAttribution(
      match.id, session.id, selectedPlayerId, votingTeam!,
      votingScoreSnapshot.a, votingScoreSnapshot.b,
      token, 'other'
    )
  }
  timer = setTimeout(() => setVotingState('idle'), 0)
}
```

### `openVotingPanel` — reset new state

```ts
const openVotingPanel = useCallback((team: 'a' | 'b', scoreA: number, scoreB: number) => {
  // ... existing resets ...
  setVotingPhase('choose_player')     // ← add
  setSelectedPlayerId(null)           // ← add
  setSelectedPlayerName(null)         // ← add
  setSelectedScoringType(null)        // ← add
}, [match.id, getVoterToken])
```

### `localStorage` — read-back with backward-compat fallback

Previously stored a plain `playerId` string. Now stores JSON. Handle both:

```ts
const raw = localStorage.getItem(storedKey)
if (raw) {
  try {
    const stored = JSON.parse(raw)
    setMyVote(stored.playerId)
    setSelectedScoringType(stored.scoringType ?? 'other')
  } catch {
    // legacy plain-string format
    setMyVote(raw)
    setSelectedScoringType('other')
  }
  setVotingState('voted')
}
```

---

## UI — JSX Sketch

The voting panel below the player list expands with `animate-in slide-in-from-bottom-2`
when `votingPhase === 'choose_type'` or `votingState === 'voted'`:

```tsx
{/* Scoring type picker — shown after player is selected */}
{(votingPhase === 'choose_type' || votingState === 'voted') && (
  <div className="mt-4 animate-in slide-in-from-bottom-2 duration-200">
    <p className="text-gray-400 text-sm font-semibold mb-3">
      How did <span className="text-white">{selectedPlayerName}</span> score?
    </p>
    <div className="grid grid-cols-2 gap-2">
      {SCORING_TYPE_OPTIONS.map(({ value, label, emoji }) => (
        <button
          key={value}
          onClick={() => selectScoringType(value)}
          disabled={votingState === 'voted'}
          className={`flex flex-col items-center justify-center gap-1 p-4 rounded-xl border transition font-bold text-sm
            ${selectedScoringType === value
              ? 'bg-green-900/40 border-green-500 text-green-300'
              : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-200'
            }
            ${votingState === 'voted' && selectedScoringType !== value ? 'opacity-40' : ''}`}
        >
          <span className="text-2xl">{emoji}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  </div>
)}
```

Player buttons are disabled (and dimmed if not selected) once `votingPhase === 'choose_type'`
so the spectator cannot change their player choice after advancing.

---

## Realtime — No Changes Needed

The existing `point_attributions` Realtime channel already listens for `INSERT` events.
The `scoring_type` field will be present on `payload.new` automatically — no subscription
changes required.

To show a live **scoring type breakdown** per player in a future iteration
(e.g. "3 spikes, 1 ace"), extend `voteCounts` state to
`Map<playerId, { total: number; byType: Record<ScoringType, number> }>`. That is out of scope for v1.

---

## Analytics Queries (future use in Summary Card)

Once data is collected, these queries work immediately:

```sql
-- Most common scoring type per session
SELECT scoring_type, COUNT(*) AS total
FROM point_attributions
WHERE session_id = '<session_id>'
GROUP BY scoring_type
ORDER BY total DESC;

-- Top scorers broken down by type
SELECT
  p.name,
  pa.scoring_type,
  COUNT(*) AS votes
FROM point_attributions pa
JOIN players p ON p.id = pa.attributed_to
WHERE pa.session_id = '<session_id>'
GROUP BY p.name, pa.scoring_type
ORDER BY votes DESC;

-- Spike / block / ace / other breakdown per player
SELECT
  p.name,
  SUM(CASE WHEN pa.scoring_type = 'spike' THEN 1 ELSE 0 END) AS spikes,
  SUM(CASE WHEN pa.scoring_type = 'block' THEN 1 ELSE 0 END) AS blocks,
  SUM(CASE WHEN pa.scoring_type = 'ace'   THEN 1 ELSE 0 END) AS aces,
  SUM(CASE WHEN pa.scoring_type = 'other' THEN 1 ELSE 0 END) AS other
FROM point_attributions pa
JOIN players p ON p.id = pa.attributed_to
WHERE pa.session_id = '<session_id>'
GROUP BY p.name;
```

These are natural candidates for the **Session Summary Card** once the attribution feature
surfaces its data there.

---

## Files Touched

| File | Change |
|---|---|
| `supabase/migrations/20260708000000_point_attributions_scoring_type.sql` | **New** — `ALTER TABLE` adds `scoring_type` column |
| `src/types/pointAttribution.ts` | **New** — `ScoringType` type + `SCORING_TYPE_OPTIONS` constant |
| `src/app/view/[pin]/actions.ts` | Add optional `scoringType` param to `submitPointAttribution` |
| `src/app/view/[pin]/SpectatorScoreboard.tsx` | New state vars, `selectPlayer` / `selectScoringType` handlers, expanded JSX, `localStorage` compat |

---

## Effort Estimate

| Task | Estimate |
|---|---|
| DB migration | ~15 min |
| `ScoringType` type file | ~10 min |
| `submitPointAttribution` update | ~15 min |
| State machine + handlers in `SpectatorScoreboard.tsx` | ~1–1.5 h |
| Voting panel JSX expansion + animation | ~1–1.5 h |
| `localStorage` key format migration + fallback | ~20 min |
| Manual testing (all paths: happy, timeout, rapid points) | ~30 min |
| **Total** | **~3.5–4.5 h** |

**Risk:** Low — purely additive. The DB migration is backward-compatible (`DEFAULT 'other'`),
and the server action parameter is optional. The existing attribution feature continues to
work unchanged during any staged deploy.

**Dependencies:** The `point_attributions` table (from `feature-spectator-point-attribution.md`)
must exist before this migration runs.
