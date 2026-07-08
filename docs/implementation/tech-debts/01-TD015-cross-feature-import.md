# 01 · TD-015 — Fix Cross-Feature Import (`live-session` → `session`)

**Priority:** P1  
**Effort:** Small (< 1h)  
**Touches:** `features/live-session/components/Matchmaker.tsx`, `features/session/actions.ts`

---

## Problem

`Matchmaker.tsx` imports `endSession` directly from `@/features/session`, violating the rule that features must not depend on each other.

```ts
// src/features/live-session/components/Matchmaker.tsx
import { endSession } from '@/features/session'  // ❌ cross-feature coupling
```

If the `session` feature is ever renamed, moved, or its barrel changes, `live-session` silently breaks. It also creates a circular dependency risk.

---

## Solution: Invert the Dependency via Props

The cleanest fix is to remove the import entirely and pass `endSession` as a callback prop from the parent `page.tsx`, which is allowed to import from both features.

---

## Step-by-Step

### Step 1 — Update `Matchmaker.tsx` props

**File:** `src/features/live-session/components/Matchmaker.tsx`

Remove the cross-feature import and add an `onEndSession` prop:

```diff
- import { endSession } from '@/features/session'
```

Update the component signature:

```ts
// Before
export default function Matchmaker({ session, players, isFirstMatch }: {
  session: any, players: any[], isFirstMatch: boolean
})

// After
export default function Matchmaker({ session, players, isFirstMatch, onEndSession }: {
  session: any,
  players: any[],
  isFirstMatch: boolean,
  onEndSession: (sessionId: string) => Promise<void>
})
```

Replace all call sites of `endSession(session.id)` inside the component with `onEndSession(session.id)`.

### Step 2 — Update the barrel export

**File:** `src/features/live-session/index.ts`

No change needed — `Matchmaker` is already exported. The prop signature change is transparent to the barrel.

### Step 3 — Thread `endSession` from the page

**File:** `src/app/dashboard/live/[session_id]/page.tsx`

```ts
import { endSession } from '@/features/session'
import { Matchmaker } from '@/features/live-session'

// In JSX:
<Matchmaker
  session={session}
  players={players}
  isFirstMatch={isFirstMatch}
  onEndSession={endSession}   // ← pass action as prop
/>
```

### Step 4 — Verify

```bash
npm run build  # confirm no TypeScript errors
```

---

## Files Changed

| File | Change |
|---|---|
| `features/live-session/components/Matchmaker.tsx` | Remove import, add `onEndSession` prop |
| `app/dashboard/live/[session_id]/page.tsx` | Import `endSession` from `features/session`, pass as prop |

## Acceptance Criteria

- [ ] `Matchmaker.tsx` has zero imports from `@/features/session`
- [ ] `npm run build` passes with no TypeScript errors
- [ ] End session flow still works end-to-end
