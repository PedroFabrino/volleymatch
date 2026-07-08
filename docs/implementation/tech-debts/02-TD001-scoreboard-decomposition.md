# 02 · TD-001 — Decompose `Scoreboard.tsx` (602 lines → orchestrator + 7 sub-components)

**Priority:** P1  
**Effort:** Medium (2–4h)  
**Touches:** `features/live-session/components/`

---

## Problem

`Scoreboard.tsx` is 602 lines — more than 2× the 300-line hard limit. It renders 7+ distinct visual sections and holds all state, event handlers, and business logic for the entire live-scoreboard experience.

---

## Target Structure

```
features/live-session/components/
├── Scoreboard.tsx          # ≤ 150 lines — orchestrator only
├── ScorePanel.tsx          # Landscape tap-to-score panels (Team A & B)
├── RosterPanel.tsx         # Portrait team roster accordion (used for both teams)
├── QueuePanel.tsx          # "Next Up" queue section (portrait)
├── AdminControls.tsx       # Bottom footer buttons (cancel, swap, finish early)
├── SubstitutionModal.tsx   # Player-in / player-out selection modal
├── SwapPositionModal.tsx   # Position swap selection modal
└── MatchOverModal.tsx      # End-of-game result + next-action modal
```

---

## Shared State Strategy

All UI state stays in `Scoreboard.tsx` and is passed down as props. No context needed since prop depth stays at ≤ 2 levels.

```ts
// State managed at Scoreboard level:
const [subbingPlayer, setSubbingPlayer] = useState<...>(null)
const [swappingPlayer, setSwappingPlayer] = useState<...>(null)
const [showTeamARoster, setShowTeamARoster] = useState(true)
const [showTeamBRoster, setShowTeamBRoster] = useState(true)
const [showQueue, setShowQueue] = useState(true)
const [toastMessage, setToastMessage] = useState<string | null>(null)
const [elapsed, setElapsed] = useState('00:00')
const [optScoreA, addOptScoreA] = useOptimistic(...)
const [optScoreB, addOptScoreB] = useOptimistic(...)
```

All hooks (`useEffect`, `useOptimistic`, `useRef`) stay in `Scoreboard.tsx` since they depend on each other.

---

## Step-by-Step

### Step 1 — Create `ScorePanel.tsx`

Extracts the landscape-only tappable score area (lines ~207–261 of current file).

```ts
// Props
type ScorePanelProps = {
  teamLabel: 'a' | 'b'
  score: number
  currentTarget: number
  elapsed: string
  onIncrement: () => void
  onDecrement: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  decreaseLabel: string
  targetLabel: string
}
```

### Step 2 — Create `RosterPanel.tsx`

Extracts the portrait roster accordion. Used twice — once for Team A and once for Team B. Currently duplicated at lines ~264–321 and ~323–378.

```ts
type RosterPanelProps = {
  team: 'a' | 'b'
  players: Player[]
  positions: Record<string, string> | undefined
  isOpen: boolean
  onToggle: () => void
  onSub: (player: { id: string; name: string; team: 'a' | 'b' }) => void
  onSwap: (player: { id: string; name: string; team: 'a' | 'b'; position: string }) => void
}
```

This eliminates the near-identical Team A / Team B JSX duplication.

### Step 3 — Create `QueuePanel.tsx`

Extracts lines ~381–424.

```ts
type QueuePanelProps = {
  players: PlayerWithStatus[]
  isOpen: boolean
  onToggle: () => void
}
```

### Step 4 — Create `AdminControls.tsx`

Extracts lines ~426–457.

```ts
type AdminControlsProps = {
  matchId: string
  sessionId: string
  isMatchOver: boolean
  isPending: boolean
  onCancel: () => void
  onSwapTeams: () => void
  onFinishEarly: () => void
  labels: { cancel: string; swapSides: string; finishEarly: string }
}
```

### Step 5 — Create `SubstitutionModal.tsx`

Extracts lines ~459–496.

```ts
type SubstitutionModalProps = {
  subbingPlayer: { id: string; name: string; team: 'a' | 'b' }
  benchedPlayers: Player[]
  isPending: boolean
  onConfirm: (playerInId: string) => void
  onClose: () => void
}
```

### Step 6 — Create `SwapPositionModal.tsx`

Extracts lines ~498–541.

```ts
type SwapPositionModalProps = {
  swappingPlayer: { id: string; name: string; team: 'a' | 'b'; position: string }
  allPlayers: Player[]
  teamAPositions: Record<string, string> | undefined
  teamBPositions: Record<string, string> | undefined
  teamAPlayerIds: string[]
  isPending: boolean
  onConfirm: (targetPlayerId: string) => void
  onClose: () => void
}
```

### Step 7 — Create `MatchOverModal.tsx`

Extracts lines ~543–590.

```ts
type MatchOverModalProps = {
  scoreA: number
  scoreB: number
  isPending: boolean
  onDraftNext: () => void
  onBackToAttendance: () => void
  onUndoPoint: () => void
}
```

### Step 8 — Rewrite `Scoreboard.tsx` as orchestrator

After extraction, `Scoreboard.tsx` becomes a ~150-line file that:
1. Declares all state and refs
2. Contains all `useEffect` hooks and event handlers
3. Computes derived values (`teamAPlayers`, `sortedQueuedPlayers`, `isMatchOver`, etc.)
4. Renders the 7 sub-components with their props

### Step 9 — Update `index.ts`

No changes needed — only `Scoreboard` is exported.

### Step 10 — Verify

```bash
npm run build
npm test
```

---

## Files Created

| File | Purpose |
|---|---|
| `ScorePanel.tsx` | Landscape score tap area |
| `RosterPanel.tsx` | Portrait accordion roster (shared by both teams) |
| `QueuePanel.tsx` | Next-up queue |
| `AdminControls.tsx` | Footer action buttons |
| `SubstitutionModal.tsx` | Sub player modal |
| `SwapPositionModal.tsx` | Swap position modal |
| `MatchOverModal.tsx` | Game over modal |

## Files Modified

| File | Change |
|---|---|
| `Scoreboard.tsx` | Reduced to orchestrator (≤ 150 lines) |

## Acceptance Criteria

- [ ] `Scoreboard.tsx` is ≤ 150 lines
- [ ] All sub-components are ≤ 300 lines
- [ ] Team A and B roster rendering no longer duplicated — both use `RosterPanel`
- [ ] All original interactions (tap-to-score, swipe-down, sub, swap, end game) still work
- [ ] `npm run build` and `npm test` pass
