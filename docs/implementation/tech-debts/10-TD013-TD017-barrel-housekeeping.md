# 10 · TD-013 & TD-017 — Barrel Housekeeping

**Priority:** P3  
**Effort:** Tiny (< 30 min)  
**Touches:** `src/lib/stats/`, `src/features/session/`

---

## Problem

Two barrels are either missing or incomplete, which means future agents or developers may resort to deep imports.

| ID | Issue |
|---|---|
| TD-013 | `src/lib/stats/` has no `index.ts` — consumers deep-import `@/lib/stats/summaryStats` |
| TD-017 | `src/features/session/index.ts` is only 27 bytes and likely does not export all public actions |

> **Note:** TD-013 is fully resolved by implementing Plan 05 (TD-003). This plan only applies if that split has **not** been done yet. If it has, skip Step 1.

---

## Step-by-Step

### Step 1 — Create `lib/stats/index.ts` (TD-013)

> **Skip if Plan 05 (TD-003) is already complete.**

**File:** `src/lib/stats/index.ts`

```ts
export { getSessionSummaryData, computeDashboardStats } from './summaryStats'
```

Then update all deep imports to use the barrel:

```bash
grep -r "lib/stats/summaryStats" src --include="*.ts" --include="*.tsx" -l
```

For each file found:
```diff
- import { getSessionSummaryData } from '@/lib/stats/summaryStats'
+ import { getSessionSummaryData } from '@/lib/stats'
```

---

### Step 2 — Fix `features/session/index.ts` (TD-017)

**File:** `src/features/session/index.ts`

View the current contents:

```bash
Get-Content src/features/session/index.ts
```

It should export all public-facing actions. Ensure it contains:

```ts
export * from './actions'
```

If there are feature-specific components (added in Plan 09 — TD-006), also export them:

```ts
export { default as SessionHouseRulesForm } from './components/SessionHouseRulesForm'
export { default as ActiveSessionCard } from './components/ActiveSessionCard'
export { default as SessionQueuePanel } from './components/SessionQueuePanel'
```

---

### Step 3 — Verify no deep imports remain

```bash
# Check for any remaining deep imports into stats
grep -r "lib/stats/summaryStats" src --include="*.ts" --include="*.tsx"

# Check for any deep imports into session feature
grep -r "features/session/actions" src --include="*.ts" --include="*.tsx"
```

Both commands should return no results.

---

### Step 4 — Verify

```bash
npx tsc --noEmit
npm run build
```

---

## Files Created / Modified

| File | Change |
|---|---|
| `lib/stats/index.ts` | Created (if not done in Plan 05) |
| `features/session/index.ts` | Updated to export all public actions and components |

## Acceptance Criteria

- [ ] `lib/stats/index.ts` exists and exports all public functions
- [ ] `features/session/index.ts` exports all public actions and components
- [ ] Zero deep imports from `@/lib/stats/summaryStats` remain in the codebase
- [ ] Zero deep imports from `@/features/session/actions` remain in the codebase
- [ ] `npx tsc --noEmit` passes
