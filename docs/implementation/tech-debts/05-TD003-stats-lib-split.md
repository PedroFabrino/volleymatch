# 05 · TD-003 — Split `lib/stats/summaryStats.ts` (473 lines → 3 modules)

**Priority:** P1  
**Effort:** Medium (1–2h)  
**Touches:** `src/lib/stats/`

---

## Problem

`summaryStats.ts` is 473 lines — 35% over the 350-line hard limit. It contains:
- `getSessionSummaryData` — Supabase-fetching pipeline that computes full session stats (also a data access function, not pure)
- `computeDashboardStats` — pure computation for the dashboard
- Multiple stat helper functions duplicated between the two pipelines

There is also no `index.ts` barrel for `lib/stats/` (TD-013), which is fixed here as part of the split.

---

## Target Structure

```
src/lib/stats/
├── session-stats.ts        # getSessionSummaryData (fetches + computes)
├── dashboard-stats.ts      # computeDashboardStats (pure)
├── stat-helpers.ts         # Shared pure helper functions
└── index.ts                # Barrel export (fixes TD-013)
```

---

## Step-by-Step

### Step 1 — Identify shared helpers

Scan `summaryStats.ts` for functions called by both `getSessionSummaryData` and `computeDashboardStats`. Common candidates:
- Comeback detection logic
- Score-diff calculation
- Partner pairing functions

Extract these into `stat-helpers.ts`.

### Step 2 — Create `stat-helpers.ts`

**File:** `src/lib/stats/stat-helpers.ts`

```ts
// Pure, framework-agnostic helper functions shared across stat modules

export function detectBiggestComeback(matches: Match[]): { match: Match; swing: number } | null {
  // ...
}

export function detectBiggestDiff(matches: Match[]): { match: Match; diff: number } | null {
  // ...
}

// ... other shared pure helpers
```

All functions must be pure — no Supabase imports.

### Step 3 — Create `session-stats.ts`

**File:** `src/lib/stats/session-stats.ts`

Move `getSessionSummaryData` here, replacing inline helper implementations with imports from `stat-helpers.ts`.

```ts
import { SupabaseClient } from '@supabase/supabase-js'
import { detectBiggestComeback, detectBiggestDiff } from './stat-helpers'

export async function getSessionSummaryData(supabase: SupabaseClient, sessionId: string) {
  // ... Supabase queries + stat computation using shared helpers
}
```

Target size: ≤ 200 lines.

### Step 4 — Create `dashboard-stats.ts`

**File:** `src/lib/stats/dashboard-stats.ts`

Move `computeDashboardStats` here, importing shared helpers.

```ts
import { Player, Match } from '@/types'
import { detectBiggestDiff } from './stat-helpers'

export function computeDashboardStats(players: Player[], completedMatches: Match[]) {
  // ...
}
```

Target size: ≤ 150 lines.

### Step 5 — Create `index.ts` barrel (also fixes TD-013)

**File:** `src/lib/stats/index.ts`

```ts
export { getSessionSummaryData } from './session-stats'
export { computeDashboardStats } from './dashboard-stats'
// Do NOT re-export internal helpers — they are implementation details
```

### Step 6 — Update all import sites

Find all files that currently import from `@/lib/stats/summaryStats`:

```bash
# Run in project root
grep -r "lib/stats/summaryStats" src --include="*.ts" --include="*.tsx" -l
```

Update each to import from the barrel:

```diff
- import { getSessionSummaryData } from '@/lib/stats/summaryStats'
+ import { getSessionSummaryData } from '@/lib/stats'

- import { computeDashboardStats } from '@/lib/stats/summaryStats'
+ import { computeDashboardStats } from '@/lib/stats'
```

### Step 7 — Delete `summaryStats.ts`

Once all imports are updated and tests pass, delete the original file:

```bash
Remove-Item src/lib/stats/summaryStats.ts
```

### Step 8 — Verify

```bash
npx tsc --noEmit
npm test
```

---

## Files Created

| File | Purpose |
|---|---|
| `lib/stats/session-stats.ts` | `getSessionSummaryData` |
| `lib/stats/dashboard-stats.ts` | `computeDashboardStats` |
| `lib/stats/stat-helpers.ts` | Shared pure stat helpers |
| `lib/stats/index.ts` | Barrel (also fixes TD-013) |

## Files Deleted

| File | Reason |
|---|---|
| `lib/stats/summaryStats.ts` | Replaced by three focused modules |

## Acceptance Criteria

- [ ] `summaryStats.ts` is deleted
- [ ] Each new file is ≤ 250 lines
- [ ] `lib/stats/index.ts` exists and exports all public functions
- [ ] All consumers import from `@/lib/stats` (not deep paths)
- [ ] `npx tsc --noEmit` and `npm test` pass
