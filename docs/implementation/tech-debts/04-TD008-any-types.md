# 04 · TD-008 — Eliminate `any` Types Across the Codebase

**Priority:** P1  
**Effort:** Medium (2–4h, can be done incrementally per file)  
**Touches:** 13 files across `features/`, `app/`, and `lib/`

---

## Problem

`any` is used in 13 files across all layers. This defeats TypeScript's type-checker, masks bugs, and makes refactoring dangerous. The existing `src/types/` directory already defines `Session`, `Match`, and `Player` types — they just aren't used everywhere.

---

## Strategy

Work file-by-file, from `lib/` outward to `features/` and `app/`. Use existing types where they exist; define new types in `src/types/` when the shape is missing.

---

## Step-by-Step

### Step 1 — Audit existing types in `src/types/`

Before writing new types, check what's already available:

```
src/types/
├── database.ts     # Supabase-generated types (if present)
├── match.ts        # Match-related types
├── player.ts       # Player type
└── session.ts      # Session type
```

Map each `any` site to an existing type or identify gaps.

---

### Step 2 — Fix `lib/stats/summaryStats.ts` (7 instances)

The `computeDashboardStats` signature currently accepts `any[]`:

```diff
- export function computeDashboardStats(players: any[], completedMatches: any[])
+ export function computeDashboardStats(players: Player[], completedMatches: Match[])
```

Replace inline `any` variables with typed alternatives:

```diff
- let biggestComebackMatch: any = null
+ let biggestComebackMatch: Match | null = null

- let biggestDiffMatch: any = null
+ let biggestDiffMatch: Match | null = null

- match.match_events.forEach((event: any) => {
+ match.match_events.forEach((event: MatchEvent) => {
```

Define `MatchEvent` in `src/types/match.ts` if it doesn't exist.

---

### Step 3 — Fix `features/live-session/actions.ts` (5 instances)

```diff
# L18 — saveMatch params
- saveMatch(sessionId: string, teamA: string[], teamB: string[], teamAPositions?: any, teamBPositions?: any)
+ saveMatch(sessionId: string, teamA: string[], teamB: string[], teamAPositions?: Record<string, string>, teamBPositions?: Record<string, string>)

# L256 — computeMatchDraft (will be moved to _draft.ts in TD-002)
- async function computeMatchDraft(supabase: any, ...)
+ async function computeMatchDraft(supabase: SupabaseClient, ...)

# L379/385/396 — mmrUpdates mapping
- mmrUpdates.map((update: any) => ...)
+ mmrUpdates.map((update: MmrUpdateResult) => ...)  // MmrUpdateResult is exported from lib/mmr
```

---

### Step 4 — Fix `features/live-session/components/Matchmaker.tsx` (3 instances)

```diff
- export default function Matchmaker({ session, players, isFirstMatch }: { session: any, players: any[], isFirstMatch: boolean })
+ export default function Matchmaker({ session, players, isFirstMatch, onEndSession }: {
+   session: Session
+   players: Player[]
+   isFirstMatch: boolean
+   onEndSession: (sessionId: string) => Promise<void>
+ })

- const [draft, setDraft] = useState<any>(session.pending_draft ?? null)
+ const [draft, setDraft] = useState<MatchDraft | null>(session.pending_draft ?? null)
```

Define `MatchDraft` in `src/types/match.ts`:
```ts
export type MatchDraft = {
  teamA: string[]
  teamB: string[]
  teamAPositions?: Record<string, string>
  teamBPositions?: Record<string, string>
}
```

---

### Step 5 — Fix `features/live-session/components/Scoreboard.tsx` (3 instances)

```diff
- const sortPlayersByPos = (teamPlayers: any[], positions?: Record<string, string>) =>
+ const sortPlayersByPos = (teamPlayers: Player[], positions?: Record<string, string>) =>

- {sortedTeamA.map((p: any) => {
+ {sortedTeamA.map((p: Player) => {

- {sortedTeamB.map((p: any) => {
+ {sortedTeamB.map((p: Player) => {
```

---

### Step 6 — Fix `features/roster/components/AttendanceToggle.tsx`

```diff
- export default function AttendanceToggle({ player, activeSessionId }: { player: any, activeSessionId?: string })
+ export default function AttendanceToggle({ player, activeSessionId }: { player: Player, activeSessionId?: string })
```

---

### Step 7 — Fix `features/summary/components/TimelineViewer.tsx`

Define a `MatchEvent` type (or reuse from `src/types/match.ts`):

```diff
- export default function TimelineViewer({ timeline, matchStartTime, playerNames }: { timeline: any[], ... })
+ export default function TimelineViewer({ timeline, matchStartTime, playerNames }: { timeline: MatchEvent[], ... })
```

---

### Step 8 — Fix `app/` files

Apply same pattern for each:

| File | Fix |
|---|---|
| `app/dashboard/session/page.tsx` L31 | `queuedPlayers: Player[]` |
| `app/dashboard/summary/[session_id]/HighlightsGrid.tsx` | Define a proper `HighlightData` prop type; replace `any` fields |
| `app/dashboard/summary/[session_id]/page.tsx` L112 | `player: PlayerStat` (define in types or summary feature) |
| `app/join/[pin]/PlayerJoinForm.tsx` | `session: Session`, `players: Player[]` |
| `app/view/[pin]/SpectatorScoreboard.tsx` | `session: Session`, `match: Match`, `teamPlayers: Player[]` |
| `app/view/[pin]/SpectatorMatchmaker.tsx` | `session: Session` |
| `app/api/og/summary/route.tsx` | Type sort callback params; `catch (e: unknown)` + narrow |

---

### Step 9 — Run type-check and tests

```bash
npx tsc --noEmit   # must pass with zero errors
npm test
```

---

## Files Modified

All 13 files listed in TD-008 in the tech-debt register, plus potential additions to `src/types/`.

## New Types to Define (if not already present)

| Type | Location |
|---|---|
| `MatchDraft` | `src/types/match.ts` |
| `MatchEvent` | `src/types/match.ts` |
| `PlayerStat` | `src/types/player.ts` or `features/summary` |
| `HighlightData` | `features/summary/index.ts` or `src/types/` |

## Acceptance Criteria

- [ ] Zero `any` in `features/` and `lib/`
- [ ] Zero `any` in `app/` (catch blocks may use `unknown`)
- [ ] `npx tsc --noEmit` exits with code 0
- [ ] `npm test` passes
- [ ] No runtime regressions
