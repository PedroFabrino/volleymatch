# 09 · TD-005, TD-006, TD-007 — Reduce Oversized `page.tsx` Files

**Priority:** P2  
**Effort:** Medium (3–5h total across 3 pages)  
**Touches:** `app/dashboard/`, `features/`

---

## Problem

Three dashboard pages exceed the 150-line hard limit with inline UI markup and business logic.

| File | Lines | Hard Limit |
|---|---|---|
| `app/dashboard/page.tsx` | 211 | 150 |
| `app/dashboard/session/page.tsx` | 238 | 150 |
| `app/dashboard/roster/page.tsx` | 190 | 150 |

---

## Strategy

For each page:
1. Identify distinct visual sections
2. Create named components in the relevant feature slice
3. Reduce the page to: auth check → data fetch → render components

---

## Part A — `app/dashboard/page.tsx` (TD-005)

### Visual Sections to Extract

| Section | Target Component |
|---|---|
| Header row (title + sign-out) | `DashboardHeader.tsx` |
| Quick Actions column | `QuickActionsColumn.tsx` |
| Player Rankings / Leaderboard | `PlayerRankingsColumn.tsx` |
| Recent Matches | `RecentMatchesColumn.tsx` |
| Past Sessions | `PastSessionsRow.tsx` |

### Step 1 — Create `features/dashboard/` slice

```
features/dashboard/
├── components/
│   ├── DashboardHeader.tsx
│   ├── QuickActionsColumn.tsx
│   ├── PlayerRankingsColumn.tsx
│   ├── RecentMatchesColumn.tsx
│   └── PastSessionsRow.tsx
└── index.ts
```

### Step 2 — Extract `DashboardHeader.tsx`

Props:
```ts
type DashboardHeaderProps = {
  signOutAction: () => Promise<void>
  title: string
  subtitle: string
}
```

### Step 3 — Extract `QuickActionsColumn.tsx`

Props:
```ts
type QuickActionsColumnProps = {
  hasActiveSession: boolean
  playerCount: number
  labels: { ... }  // or useTranslations inside the component
}
```

> Prefer `useTranslations` inside the component to reduce prop drilling — this is a Server Component so use `getTranslations`.

### Step 4 — Extract `PlayerRankingsColumn.tsx` and `RecentMatchesColumn.tsx`

Pass computed `rankedPlayers` and `latestMatches` as props. Extract `getPlayerName` helper into the component itself.

### Step 5 — Extract `PastSessionsRow.tsx`

### Step 6 — Rewrite `app/dashboard/page.tsx`

Target shape (~80 lines):
```tsx
export default async function DashboardPage() {
  // 1. Auth
  // 2. Parallel data fetch via lib/services
  // 3. Compute stats via lib/stats
  // 4. Render feature components
  return (
    <div>
      <DashboardHeader signOutAction={signOut} ... />
      <div className="grid ...">
        <QuickActionsColumn ... />
        <PlayerRankingsColumn rankedPlayers={rankedPlayers} />
        <RecentMatchesColumn latestMatches={latestMatches} playerStats={playerStats} />
      </div>
      <PastSessionsRow sessions={pastSessions} />
    </div>
  )
}
```

---

## Part B — `app/dashboard/session/page.tsx` (TD-006)

### Visual Sections to Extract

| Section | Target Component |
|---|---|
| Attendance list | Already in `features/roster/` — already delegated ✓ |
| Queue display (active session) | `SessionQueuePanel.tsx` in `features/session/components/` |
| House rules form (new session) | `SessionHouseRulesForm.tsx` in `features/session/components/` |
| Active session card (resume + end) | `ActiveSessionCard.tsx` in `features/session/components/` |

### Step 1 — Move queue-sorting logic to `lib/` or a helper

Currently the page builds `queuedPlayers` with ~15 lines of inline logic (sort by games played, merge with session map). Extract to a pure function:

```ts
// src/lib/stats/queue-helpers.ts  OR  features/session/_helpers.ts
export function buildQueuedPlayerList(
  players: Player[],
  activeMatch: { team_a_players: string[]; team_b_players: string[] } | null,
  sessionPlayersMap: Map<string, number>
): PlayerWithGameCount[] { ... }
```

### Step 2 — Create `SessionHouseRulesForm.tsx`

Move the 70-line form (target score + tie-breaker + matchmaking mode selects) into `features/session/components/SessionHouseRulesForm.tsx`. It calls the existing `startSession` action directly.

### Step 3 — Create `ActiveSessionCard.tsx`

Move the "session is live" card (resume link + end session button) into `features/session/components/ActiveSessionCard.tsx`.

### Step 4 — Create `SessionQueuePanel.tsx`

Move the "Next in Queue" list into `features/session/components/SessionQueuePanel.tsx`.

### Step 5 — Update `features/session/index.ts`

```ts
export * from './actions'
export { default as SessionHouseRulesForm } from './components/SessionHouseRulesForm'
export { default as ActiveSessionCard } from './components/ActiveSessionCard'
export { default as SessionQueuePanel } from './components/SessionQueuePanel'
```

### Step 6 — Rewrite `app/dashboard/session/page.tsx`

Target shape (~80 lines):
```tsx
export default async function SessionSetupPage() {
  // Auth + data fetch
  // buildQueuedPlayerList()
  return (
    <div>
      <div className="grid ...">
        {/* Attendance column — already uses feature components */}
        <div>
          {players?.map(p => <AttendanceToggle ... />)}
        </div>

        {/* Rules / session column */}
        {activeSession
          ? <ActiveSessionCard session={activeSession} queuedPlayers={queuedPlayers} />
          : <SessionHouseRulesForm presentCount={presentCount} />
        }
      </div>
    </div>
  )
}
```

---

## Part C — `app/dashboard/roster/page.tsx` (TD-007)

### Visual Sections to Extract

| Section | Target Component |
|---|---|
| Add / Edit player form | `PlayerForm.tsx` in `features/roster/components/` |
| Player list with MMR / positions | `PlayerList.tsx` in `features/roster/components/` |

### Step 1 — Create `PlayerForm.tsx`

Move the add/edit player form (~70 lines) into `features/roster/components/PlayerForm.tsx`. It calls the existing `addPlayer`/`updatePlayer` actions.

Props:
```ts
type PlayerFormProps = {
  editingPlayer?: Player | null
  availablePositions: string[]
}
```

### Step 2 — Create `PlayerList.tsx`

Move the player list rendering into `features/roster/components/PlayerList.tsx`.

Props:
```ts
type PlayerListProps = {
  players: Player[]
  editId?: string
}
```

### Step 3 — Update `features/roster/index.ts`

```ts
export * from './actions'
export { default as AttendanceToggle } from './components/AttendanceToggle'
export { default as AttendanceControls } from './components/AttendanceControls'
export { default as PlayerForm } from './components/PlayerForm'
export { default as PlayerList } from './components/PlayerList'
```

### Step 4 — Rewrite `app/dashboard/roster/page.tsx`

Target shape (~60 lines):
```tsx
export default async function RosterPage(props) {
  // Auth + fetch players
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3">
        <PlayerForm editingPlayer={editingPlayer} availablePositions={AVAILABLE_POSITIONS} />
        <div className="lg:col-span-2">
          <PlayerList players={players ?? []} editId={editId} />
        </div>
      </div>
    </div>
  )
}
```

---

## Verification (all three pages)

```bash
npx tsc --noEmit
npm run build
npm test
```

---

## Acceptance Criteria

- [ ] `app/dashboard/page.tsx` ≤ 100 lines
- [ ] `app/dashboard/session/page.tsx` ≤ 100 lines
- [ ] `app/dashboard/roster/page.tsx` ≤ 80 lines
- [ ] All extracted components are ≤ 200 lines each
- [ ] Queue-building logic is in a pure function (testable)
- [ ] All dashboard flows work end-to-end
- [ ] `npx tsc --noEmit` and `npm run build` pass
