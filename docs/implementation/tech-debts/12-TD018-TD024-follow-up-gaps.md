# Follow-Up Tech Debts — Post-Implementation Audit

**Audited:** 2026-07-08  
**Against:** Current codebase state after TD-001 → TD-017 implementation passes

> These items were **not present** in the original `docs/tech-debt.md` register but were discovered
> during the post-implementation audit. Each one is a real, actionable violation of `AGENTS.md`.

---

## TD-018 · File Size — `features/session/actions.ts` exceeds `actions.ts` hard limit · P1

| | |
|---|---|
| **File** | `src/features/session/actions.ts` |
| **Size** | 265 lines (hard limit: 200) |
| **Rule** | AGENTS §4.1 — `actions.ts` hard limit is 200 lines |

**What's wrong:**  
`session/actions.ts` holds at least 7 distinct actions (`toggleAttendance`, `batchToggleAttendance`,
`toggleActivePosition`, `setAllAttendance`, `createSession`, `endSession`, `resetSessionPlayers`).
The file also performs inline Supabase queries that belong in `lib/services/`. Combined, the file
has grown to 265 lines — 65 over the hard limit.

**Remediation:**  
Split into two focused files:

```
features/session/
├── actions.ts           # Attendance and position actions (~120 lines)
└── session-actions.ts   # Session lifecycle: createSession, endSession, resetSessionPlayers (~100 lines)
```

Both files should be re-exported from `features/session/index.ts`.

---

## TD-019 · File Size — `features/spectator/components/SpectatorScoreboard.tsx` exceeds component hard limit · P1

| | |
|---|---|
| **File** | `src/features/spectator/components/SpectatorScoreboard.tsx` |
| **Size** | 402 lines (hard limit: 300) |
| **Rule** | AGENTS §4.1 — Feature component hard limit is 300 lines |

**What's wrong:**  
When TD-011 relocated `SpectatorScoreboard.tsx` from `app/view/` to `features/spectator/components/`,
it was not decomposed. The component still renders 4+ distinct visual sections (landscape score
panels, portrait accordion roster, queue panel, voting UI) all within a single 402-line file.

**Remediation:**  
Decompose following the same pattern used for `Scoreboard.tsx` in TD-001:

```
features/spectator/components/
├── SpectatorScoreboard.tsx     # Orchestrator only (~100 lines)
├── SpectatorScorePanel.tsx     # Landscape tap-to-vote score areas
├── SpectatorRosterPanel.tsx    # Portrait team accordion
├── SpectatorQueuePanel.tsx     # Up-next queue
└── VotingOverlay.tsx           # Point attribution voting UI
```

Where sub-component logic is identical to existing `live-session` equivalents, extract to a shared
`components/` component rather than duplicating.

---

## TD-020 · File Size — `features/live-session/components/Scoreboard.tsx` still over limit · P2

| | |
|---|---|
| **File** | `src/features/live-session/components/Scoreboard.tsx` |
| **Size** | 314 lines (hard limit: 300, original target: ~150) |
| **Rule** | AGENTS §4.1, §4.2 |

**What's wrong:**  
TD-001 was implemented — sub-components were extracted — but `Scoreboard.tsx` remains 314 lines,
still 14 lines over the hard limit and more than double the orchestrator target of ~150.

**Remediation:**  
Audit `Scoreboard.tsx` for remaining inline logic (state definitions, helper functions, event
handlers) and extract into a dedicated `useScoreboard` hook in `features/live-session/hooks.ts`,
reducing the component to pure JSX orchestration well under 300 lines.

---

## TD-021 · Cross-Layer Import — `features/spectator` imports from `app/view/` · P1

| | |
|---|---|
| **File** | `src/features/spectator/components/SpectatorScoreboard.tsx` L7 |
| **Rule** | AGENTS §3.3, §7 — `features/` must not import from `app/` |

**What's wrong:**
```ts
// In features/spectator/components/SpectatorScoreboard.tsx
import { submitPointAttribution } from '@/app/view/[pin]/actions'
```

A feature component imports a Server Action from the routing layer (`app/`). This is the wrong
dependency direction — `app/` depends on `features/`, never the reverse.

**Remediation:**  
Move `submitPointAttribution` (currently in `src/app/view/[pin]/actions.ts`) to
`features/spectator/actions.ts` (create if absent) and export via `features/spectator/index.ts`.
Update the `app/view/[pin]/` route to reference the action from the feature barrel.

---

## TD-022 · Cross-Feature Import — `features/roster` → `features/session` · P1

| | |
|---|---|
| **Files** | `src/features/roster/components/AttendanceControls.tsx` L4, `src/features/roster/components/AttendanceToggle.tsx` L4 |
| **Rule** | AGENTS §3.2 — Features must not import from other features |

**What's wrong:**
```ts
// AttendanceControls.tsx
import { setAllAttendance } from '@/features/session'

// AttendanceToggle.tsx
import { batchToggleAttendance, toggleActivePosition } from '@/features/session'
```

`roster` directly depends on `session`, creating the same cross-feature coupling that TD-015
originally addressed for `live-session` → `session`.

**Remediation — two options:**

**Option A (preferred):** Move the attendance-related Server Actions (`toggleAttendance`,
`batchToggleAttendance`, `setAllAttendance`, `toggleActivePosition`) to `features/roster/actions.ts`,
since they manage player presence (a roster concern). Remove them from `features/session`.

**Option B:** Lift the shared actions to `lib/services/` so both features consume them without
depending on each other directly.

---

## TD-023 · Residual `any` Types — Post TD-008 Cleanup · P2

| | |
|---|---|
| **Rule** | AGENTS §4.5 — Do not use TypeScript `any` |

**Instances found after TD-008 was applied:**

| File | Line | `any` usage |
|---|---|---|
| `features/live-session/components/RosterPanel.tsx` | 9 | `players: any[]` in prop type |
| `lib/stats/stat-helpers.ts` | 88 | `calculateTopScorer(attributions: any[], ...)` |

**Remediation:**

- **`RosterPanel.tsx`**: Type the `players` prop as `PlayerWithStatus[]` (from `@/lib/matchmaking`)
  or a narrower shape derived from `Player`. Match what the parent `Scoreboard.tsx` passes in.

- **`stat-helpers.ts`**: Define a `PointAttribution` type in `src/types/` (or reuse one if already
  present) and replace `any[]` with the proper type.

---

## TD-024 · Direct Supabase Calls in `app/dashboard/live/[session_id]/page.tsx` · P2

| | |
|---|---|
| **File** | `src/app/dashboard/live/[session_id]/page.tsx` L27–31 |
| **Rule** | AGENTS §7 — `lib/services/` is the only place that calls Supabase |

**What's wrong:**  
The live session page performs 5 parallel `supabase.from()` calls directly:

```ts
supabase.from('sessions').select('*').eq('id', sessionId).single(),
supabase.from('matches').select('*')...eq('is_completed', false)...,
supabase.from('players').select('*').eq('hoster_id', user.id),
supabase.from('session_players').select('player_id, games_played')...,
supabase.from('matches').select('*', { count: 'exact', head: true })...
```

This page was **not** covered by TD-009/TD-010, which only tracked `session/page.tsx`,
`roster/page.tsx`, and `summary/[session_id]/page.tsx`.

**Remediation:**  
Add a `getLiveSessionData(supabase, sessionId, userId)` service function to
`lib/services/session.service.ts` (or a new `lib/services/live-session.service.ts`) that wraps
all 5 queries and returns a typed composite result. The page then calls only this single service.

---

## Summary Table

| ID | Priority | Category | File(s) |
|---|---|---|---|
| TD-018 | P1 | File size | `features/session/actions.ts` — 265 lines |
| TD-019 | P1 | File size | `features/spectator/components/SpectatorScoreboard.tsx` — 402 lines |
| TD-020 | P2 | File size | `features/live-session/components/Scoreboard.tsx` — 314 lines (still over) |
| TD-021 | P1 | Architecture | `features/spectator` imports from `app/view/` (wrong direction) |
| TD-022 | P1 | Architecture | Cross-feature import: `roster` → `session` |
| TD-023 | P2 | TypeScript | Residual `any` in `RosterPanel.tsx` and `stat-helpers.ts` |
| TD-024 | P2 | Architecture | Direct Supabase calls in `app/dashboard/live/[session_id]/page.tsx` |

---

## Suggested Resolution Order

1. **TD-021** — Fix `features/` → `app/` import (wrong-way dependency, violates layer contract)
2. **TD-022** — Fix `roster` → `session` cross-feature coupling
3. **TD-018** — Split `session/actions.ts` (god action file, P1 size violation)
4. **TD-019** — Decompose `SpectatorScoreboard.tsx` (god component, P1 size violation)
5. **TD-023** — Eliminate residual `any` types (targeted, low-risk)
6. **TD-024** — Move live page Supabase calls to `lib/services/`
7. **TD-020** — Extract `useScoreboard` hook to get `Scoreboard.tsx` under 300 lines
