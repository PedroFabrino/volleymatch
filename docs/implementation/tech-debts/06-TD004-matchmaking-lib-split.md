# 06 · TD-004 — Split `lib/matchmaking/index.ts` into Sub-Modules

**Priority:** P1  
**Effort:** Medium (2–3h) — includes updating existing unit tests  
**Touches:** `src/lib/matchmaking/`

> ⚠️ This file has full unit-test coverage (`matchmaking.test.ts`). Run tests after every step.

---

## Problem

`lib/matchmaking/index.ts` is 342 lines with all matchmaking concerns in one place: type definitions, player classification, casual draft, strict draft, queue rotation logic, and setter compensation. AGENTS.md explicitly flags this as a known god file.

---

## Target Structure

```
src/lib/matchmaking/
├── types.ts                # Player type, PlayerWithStatus, MatchDraft
├── draft.ts                # draftTeams (casual snake-draft + setter compensation)
├── strict-draft.ts         # draftStrictTeams (winner-stays-on variant)
├── rotation.ts             # Queue selection logic, PlayerWithStatus computation
├── index.ts                # Barrel re-export — only public API changes here
└── matchmaking.test.ts     # Tests updated to import from sub-modules
```

---

## Step-by-Step

### Step 1 — Create `types.ts`

**File:** `src/lib/matchmaking/types.ts`

Move all type definitions out of `index.ts`:

```ts
export type Player = {
  id: string
  name: string
  mmr: number
  positions: string[]
  active_positions: string[] | null
  games_played_today: number
}

export type PlayerWithStatus = Player & {
  draftStatus: 'in_next_match' | 'waiting'
}

export type MatchDraft = {
  teamA: string[]
  teamB: string[]
  teamAPositions?: Record<string, string>
  teamBPositions?: Record<string, string>
}
```

### Step 2 — Create `draft.ts`

**File:** `src/lib/matchmaking/draft.ts`

Move `isSetter` helper and `draftTeams` function here:

```ts
import type { Player } from './types'

export function isSetter(player: Player): boolean { ... }

export function draftTeams(playersToDraft: Player[]): { teamA: string[]; teamB: string[] } { ... }
```

### Step 3 — Create `strict-draft.ts`

**File:** `src/lib/matchmaking/strict-draft.ts`

Move `draftStrictTeams` here:

```ts
import type { Player } from './types'
import { isSetter } from './draft'

export function draftStrictTeams(
  allPresentPlayers: Player[],
  lastMatchWinningTeamIds: string[],
  lastMatchLosingTeamIds: string[]
): { teamA: string[]; teamB: string[] } { ... }
```

### Step 4 — Create `rotation.ts`

**File:** `src/lib/matchmaking/rotation.ts`

Move queue-selection and `PlayerWithStatus` computation here:

```ts
import type { Player, PlayerWithStatus } from './types'

export function computePlayersWithStatus(
  presentPlayers: Player[],
  pendingDraft: { teamA: string[]; teamB: string[] } | null,
  activeTeamAIds: string[],
  activeTeamBIds: string[]
): PlayerWithStatus[] { ... }
```

### Step 5 — Rewrite `index.ts` as a barrel

```ts
// src/lib/matchmaking/index.ts
export type { Player, PlayerWithStatus, MatchDraft } from './types'
export { isSetter, draftTeams } from './draft'
export { draftStrictTeams } from './strict-draft'
export { computePlayersWithStatus } from './rotation'
```

This keeps the public API identical — all existing callers continue to work without changes.

### Step 6 — Update `matchmaking.test.ts`

The test file imports from `@/lib/matchmaking` (the barrel), so most tests **require no changes**. Only update if any test deep-imports from the old `index.ts` internals.

Verify all tests still pass:

```bash
npm test -- matchmaking
```

### Step 7 — Verify nothing else broke

```bash
npx tsc --noEmit
npm test
```

---

## Files Created

| File | Contents |
|---|---|
| `lib/matchmaking/types.ts` | `Player`, `PlayerWithStatus`, `MatchDraft` |
| `lib/matchmaking/draft.ts` | `isSetter`, `draftTeams` |
| `lib/matchmaking/strict-draft.ts` | `draftStrictTeams` |
| `lib/matchmaking/rotation.ts` | `computePlayersWithStatus` |

## Files Modified

| File | Change |
|---|---|
| `lib/matchmaking/index.ts` | Replaced with barrel re-exports (≤ 15 lines) |
| `lib/matchmaking/matchmaking.test.ts` | Update imports if needed |

## Acceptance Criteria

- [ ] `lib/matchmaking/index.ts` is ≤ 20 lines (barrel only)
- [ ] No sub-module exceeds 200 lines
- [ ] All existing tests pass without modification to test logic
- [ ] External callers (e.g., `features/live-session/actions.ts`) require zero import path changes
- [ ] `npx tsc --noEmit` passes
