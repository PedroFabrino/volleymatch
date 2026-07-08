# 08 · TD-011 & TD-012 — Relocate Spectator & Summary Components into `features/`

**Priority:** P2  
**Effort:** Medium (2–3h)  
**Touches:** `app/view/`, `app/dashboard/summary/`, `features/live-session/`, `features/summary/`

---

## Problem

Feature-specific UI components are living inside the `app/` routing layer, which should only contain thin page orchestrators.

| Misplaced file | Size | Correct location |
|---|---|---|
| `app/view/[pin]/SpectatorScoreboard.tsx` | ~480 lines | `features/live-session/` or `features/spectator/` |
| `app/view/[pin]/SpectatorMatchmaker.tsx` | ~130 lines | same |
| `app/view/[pin]/RealtimeSubscriber.tsx` | ~35 lines | same |
| `app/dashboard/summary/[session_id]/HighlightsGrid.tsx` | ~340 lines | `features/summary/components/` |

Additionally, `SpectatorScoreboard.tsx` **duplicates** the `sortPlayersByPos` helper and player-row JSX from `Scoreboard.tsx`. This should be extracted into a shared component.

---

## Step-by-Step

### Part A — Shared player display component

#### Step 1 — Create `PlayerRosterRow.tsx` in shared components

**File:** `src/components/PlayerRosterRow.tsx`

Extract the shared player-row rendering (currently duplicated in `Scoreboard.tsx` and `SpectatorScoreboard.tsx`) into a reusable component:

```ts
type PlayerRosterRowProps = {
  player: Player
  position: string | undefined
  team: 'a' | 'b'
  isSpectatorMode?: boolean
  onSub?: (player: Player) => void
  onSwap?: (player: Player) => void
}

export function PlayerRosterRow({ player, position, team, isSpectatorMode, onSub, onSwap }: PlayerRosterRowProps) {
  // shared row rendering
}
```

Add to `src/components/index.ts` barrel.

#### Step 2 — Extract `sortPlayersByPos` into `lib/`

This pure helper is duplicated in both scoreboards. Move it to `src/lib/matchmaking/rotation.ts` (created in TD-004) or `src/utils/`:

```ts
// src/utils/sortPlayersByPos.ts
export const POSITION_ORDER = ['Setter', 'Middle Blocker', 'Outside Hitter', 'Opposite Hitter', 'Libero', 'Any']

export function sortPlayersByPos<T extends { id: string; positions?: string[] }>(
  players: T[],
  positions?: Record<string, string>
): T[] { ... }
```

---

### Part B — Relocate spectator components

#### Step 3 — Create `features/spectator/` feature slice

```
features/spectator/
├── components/
│   ├── SpectatorScoreboard.tsx   # moved from app/view/[pin]/
│   ├── SpectatorMatchmaker.tsx   # moved from app/view/[pin]/
│   └── RealtimeSubscriber.tsx    # moved from app/view/[pin]/
└── index.ts                      # barrel
```

#### Step 4 — Move and update files

1. Move the three files into `features/spectator/components/`
2. Update all imports inside the files to use new relative paths
3. Replace the duplicated `sortPlayersByPos` with the shared utility from Step 2
4. Replace duplicated player-row JSX with `<PlayerRosterRow />` from Step 1

#### Step 5 — Create `features/spectator/index.ts`

```ts
export { default as SpectatorScoreboard } from './components/SpectatorScoreboard'
export { default as SpectatorMatchmaker } from './components/SpectatorMatchmaker'
export { default as RealtimeSubscriber } from './components/RealtimeSubscriber'
```

#### Step 6 — Update `app/view/[pin]/page.tsx`

```diff
- import SpectatorScoreboard from './SpectatorScoreboard'
- import SpectatorMatchmaker from './SpectatorMatchmaker'
- import RealtimeSubscriber from './RealtimeSubscriber'
+ import { SpectatorScoreboard, SpectatorMatchmaker, RealtimeSubscriber } from '@/features/spectator'
```

---

### Part C — Relocate `HighlightsGrid.tsx`

#### Step 7 — Move `HighlightsGrid.tsx` to `features/summary/`

**From:** `app/dashboard/summary/[session_id]/HighlightsGrid.tsx`  
**To:** `features/summary/components/HighlightsGrid.tsx`

#### Step 8 — Update `features/summary/index.ts`

```ts
export { default as HighlightsGrid } from './components/HighlightsGrid'
// ... existing exports
```

#### Step 9 — Update `app/dashboard/summary/[session_id]/page.tsx`

```diff
- import HighlightsGrid from './HighlightsGrid'
+ import { HighlightsGrid } from '@/features/summary'
```

Also move `ShareButton.tsx` to `features/summary/components/` while you're in this area.

---

### Step 10 — Verify

```bash
npx tsc --noEmit
npm run build
npm test
```

---

## Files Created

| File | Purpose |
|---|---|
| `features/spectator/components/SpectatorScoreboard.tsx` | Moved |
| `features/spectator/components/SpectatorMatchmaker.tsx` | Moved |
| `features/spectator/components/RealtimeSubscriber.tsx` | Moved |
| `features/spectator/index.ts` | Barrel |
| `features/summary/components/HighlightsGrid.tsx` | Moved |
| `components/PlayerRosterRow.tsx` | New shared component |
| `utils/sortPlayersByPos.ts` | Extracted shared utility |

## Files Deleted

| File | Reason |
|---|---|
| `app/view/[pin]/SpectatorScoreboard.tsx` | Moved to features |
| `app/view/[pin]/SpectatorMatchmaker.tsx` | Moved to features |
| `app/view/[pin]/RealtimeSubscriber.tsx` | Moved to features |
| `app/dashboard/summary/[session_id]/HighlightsGrid.tsx` | Moved to features |

## Acceptance Criteria

- [ ] `app/view/[pin]/` contains only `page.tsx` and `actions.ts`
- [ ] `app/dashboard/summary/[session_id]/` contains only `page.tsx` and `ShareButton.tsx` (or ShareButton also moved)
- [ ] `sortPlayersByPos` is defined in exactly one place
- [ ] Player roster row rendering is defined in exactly one place
- [ ] `npx tsc --noEmit` and `npm run build` pass
