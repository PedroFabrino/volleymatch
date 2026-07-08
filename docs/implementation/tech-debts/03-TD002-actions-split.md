# 03 · TD-002 — Split `live-session/actions.ts` (406 lines → 2 files)

**Priority:** P1  
**Effort:** Small–Medium (1–2h)  
**Touches:** `features/live-session/`

---

## Problem

`actions.ts` is 406 lines, more than 2× the 200-line hard limit. It contains:
- 7 public server actions (`generateMatch`, `saveMatch`, `updateScore`, `finishMatch`, `cancelMatch`, `substitutePlayer`, `swapPositions`, `swapTeams`)
- 2 private helpers (`computeMatchDraft`, `processBackgroundMatch`) that together span ~150 lines

The `saveMatch` action calls `computeMatchDraft`, giving it two responsibilities.

---

## Solution

Extract the two private helpers into a co-located internal module `_draft.ts`. The leading underscore signals it is **not** a public API and must not be added to `index.ts`.

```
features/live-session/
├── actions.ts      # Public 'use server' functions only (~150 lines)
├── _draft.ts       # computeMatchDraft + processBackgroundMatch (private)
└── index.ts        # Barrel — exports only from actions.ts and components/
```

---

## Step-by-Step

### Step 1 — Create `_draft.ts`

**File:** `src/features/live-session/_draft.ts`

Move the following from `actions.ts`:
- `computeMatchDraft` (lines ~254–322)
- `processBackgroundMatch` (lines ~326–405)

The file does **not** use `'use server'` — these are regular async functions called by the server actions.

```ts
// src/features/live-session/_draft.ts
// PRIVATE — do not export from index.ts

import { createClient } from '@/lib/supabase/server'
import { draftTeams, draftStrictTeams } from '@/lib/matchmaking'
import { calculateMmrChanges } from '@/lib/mmr'

export async function computeMatchDraft(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
) {
  // ... moved verbatim
}

export async function processBackgroundMatch(
  matchId: string,
  sessionId: string,
  userId: string
) {
  // ... moved verbatim
}
```

> **Note on `supabase` type:** Replace `supabase: any` with the proper `SupabaseClient` type from `@supabase/supabase-js`. This also resolves part of TD-008.

### Step 2 — Update `actions.ts`

Remove `computeMatchDraft` and `processBackgroundMatch` definitions and replace with an import:

```diff
+ import { computeMatchDraft, processBackgroundMatch } from './_draft'
- async function computeMatchDraft(...) { ... }
- async function processBackgroundMatch(...) { ... }
```

The public actions remain in `actions.ts`. Final size should be ~150 lines.

### Step 3 — Verify `index.ts` is unchanged

`_draft.ts` must **not** be re-exported from the barrel.

```ts
// src/features/live-session/index.ts — no changes
export { default as Matchmaker } from './components/Matchmaker'
export { default as Scoreboard } from './components/Scoreboard'
export * from './actions'
```

### Step 4 — Verify

```bash
npm run build
npm test
```

---

## Files Created

| File | Purpose |
|---|---|
| `features/live-session/_draft.ts` | Private draft computation and background job helpers |

## Files Modified

| File | Change |
|---|---|
| `features/live-session/actions.ts` | Remove private helpers, add import from `_draft.ts`; now ≤ 200 lines |

## Acceptance Criteria

- [ ] `actions.ts` is ≤ 200 lines
- [ ] `_draft.ts` is not exported from `features/live-session/index.ts`
- [ ] `computeMatchDraft` and `processBackgroundMatch` are typed with `SupabaseClient` instead of `any`
- [ ] `npm run build` and `npm test` pass
- [ ] Match generation and background MMR processing still work end-to-end
