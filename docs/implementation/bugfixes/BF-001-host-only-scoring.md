# BF-001 · Host-Only Scoring — Score Freeze on Rapid Taps

**Filed:** 2026-07-22  
**Severity:** P1 — UI score display freezes / desynchronises after rapid increments  
**Area:** `features/live-session` · scoring path  

---

## Correction from initial analysis

The freeze **does not require multiple users**. It reproduces with a single host
tapping rapidly. The original diagnosis (CAS multi-host race) was partially
correct but missed the primary single-user path described below. The fix still
happens to be "host-only scoring" — removing any non-host scorer eliminates
one whole class of future regressions — but the core freeze mechanism is
different.

---

## Actual Root Cause (single-user rapid taps)

Every tap calls `handleScoreChange`, which does two things in sequence:

```
1. optimistic setState   →  scoreA / scoreB updated in React state
2. startTransition(async updateScore(..., expectedA, expectedB))
                         →  CAS RPC call with the expected values
                            captured at tap time via scoreARef.current
```

The critical problem: **`startTransition` with an async function does not
prevent concurrent transitions.** Each tap fires a new async transition
immediately, even while a previous one is still in flight.

Concretely, for three rapid taps at score (0, 0):

```
Tap 1:  optimistic 1→0  |  transition starts  RPC(expected=0,0) ──► DB writes (1,0)
Tap 2:  optimistic 2→0  |  transition starts  RPC(expected=1,0) ──► [waits for Tap 1]
Tap 3:  optimistic 3→0  |  transition starts  RPC(expected=2,0) ──► [waits for Tap 2]
                                                                            ↑
            ref is updated each render → expectedA reads from
            the most-recent optimistic value, NOT the DB value
```

When responses arrive:
- **Tap 1:** `applied=true`, no snap-back. ✅
- **Tap 2:** `applied=true` (DB was 1,0 as expected). ✅
- **Tap 3:** `applied=true` OR `applied=false` depending on ordering.

But simultaneously, `useLiveSessionSync` receives a `postgres_changes`
broadcast for each DB write and calls `setScoreA / setScoreB` directly.
These `setState` calls from the realtime channel are **not wrapped in
`startTransition`**, so React treats them as urgent updates and may apply
them in a different render batch than the snap-back `setState` inside the
transition callback.

The result is a **render-order tug-of-war** between:

| Source | Wraps in transition? | Priority |
|---|---|---|
| optimistic `setScoreA` in `handleScoreChange` | Yes (inside `startTransition`) | Low |
| snap-back `setScoreA` in transition callback | Yes (inside `startTransition`) | Low |
| realtime `setScoreA` in `useLiveSessionSync.onMatchScores` | **No** | **Urgent** |

React 19's concurrent scheduler can interleave these in a way that leaves
the displayed score stuck on an intermediate optimistic value — particularly
when the realtime event arrives between the optimistic setState and the
transition's snap-back setState. The UI appears frozen until the next
independent state change forces a clean reconciliation.

**Secondary aggravator:** `useEffect` in `useScoreboardActions` only syncs
scores when `match.id` changes (line 27-30), not when `match.team_a_score`
prop changes. If a `router.refresh()` happens (triggered by the `sessions`
realtime subscription in `useLiveSessionSync`) during pending transitions,
the fresh prop values are ignored by the effect, compounding the stale-state
window.

---

## Files to Change

### 1. `src/features/live-session/useScoreboardActions.ts`

**Why:** This is where the async `startTransition` fires and where the
snap-back logic lives. The entire optimistic + snap-back model needs
to be replaced with a simpler one that is safe under concurrent renders.

**Changes needed:**
- Replace the per-tap optimistic `setState` + CAS snap-back model with a
  **debounced or queued write strategy**: buffer rapid taps locally (no
  optimistic mid-sequence renders), then send a single RPC once tapping
  stops (100–200 ms idle threshold), OR switch to a ref-tracked local
  counter that only calls `setState` once after the batch.
- **Alternatively (simpler):** Accept `isHost: boolean`; guard
  `handleScoreChange`, `handleTouchStart`, `handleTouchEnd` so that only
  the primary host can score. Add an early return in `handleScoreChange`
  if `!isHost`. This does not fix the rapid-tap race alone but removes the
  multi-user dimension for a future iteration.

> **For the E2E test, the simplest observable fix to validate is:**
> wrap the `setScoreA / setScoreB` call inside `onMatchScores` in
> `useLiveSessionSync` with `startTransition` so all score state
> updates share the same priority queue.

---

### 2. `src/features/live-session/useLiveSessionSync.ts`

**Why:** The `onMatchScores` callback calls `setScoreA / setScoreB` as
urgent updates outside of any transition, which is the trigger for the
render-priority conflict.

**Changes needed:**
- Wrap the `onScoresRef.current?.({...})` call inside a `startTransition`
  so realtime score updates are deferred to the same priority lane as the
  optimistic updates and snap-backs.

---

### 3. `src/features/live-session/components/ScorePanel.tsx`

**Why:** Host-only scoring (the broader change from the original spec).

**Changes needed:**
- Add `isHost: boolean` prop.
- When `isHost=false`: remove `onClick`, `onTouchStart`, `onTouchEnd`,
  and the decrement button. Remove active/cursor styles.

---

### 4. `src/features/live-session/components/RosterPanel.tsx`

**Why:** The portrait-mode decrement button in the roster header must
also be host-only.

**Changes needed:**
- Add `isHost: boolean` prop.
- Conditionally hide (not `disabled`) the `<Minus>` decrement button.

---

### 5. `src/features/live-session/components/Scoreboard.tsx`

**Why:** Needs to thread `isHost` down to `ScorePanel`, `RosterPanel`,
and guard the `MatchOverModal` undo callback.

**Changes needed:**
- Add `isHost: boolean` to props.
- Pass to both `<ScorePanel>`, both `<RosterPanel>`, and wrap
  `onUndoPoint` with an `isHost` guard.

---

### 6. `src/features/live-session/hooks.ts`

**Why:** Orchestrates the hook layer consumed by `Scoreboard`.

**Changes needed:**
- Accept and pass `isHost` into `useScoreboardActions`.
- Re-export `isHost` in the return object.

---

### 7. `src/app/dashboard/live/[sessionId]/page.tsx`

**Why:** `isHost` must be derived server-side and passed as a prop.

**Changes needed:**
- Compute `isHost = session.hoster_id === user.id` (or equivalent
  from the `requireHostPermission` context already in scope).
- Pass `isHost` to `<Scoreboard>`.

---

## Files That Do NOT Need to Change

| File | Reason |
|---|---|
| `actions.ts` → `updateScore` | Server already guards with `requireHostPermission`. Safe. |
| `applyMatchScoreDelta` SQL RPC | CAS logic is correct; keep it as a safety net. |
| `useScoreboardVotes.ts` | Toast display only. Unaffected. |
| `useSpectatorVoting.ts` | Never writes scores. Unaffected. |
| `useScoreboardTimer.ts` | Unrelated. |
| `useCoachPresence.ts` | Unrelated. |
| Locale files | No new strings needed. |
| DB migrations | No schema change. |

---

## E2E Test Plan — `tests/e2e/scoreboard-score-freeze.e2e.ts`

### Testing approach

The project has **no Playwright or Cypress**. The existing e2e/integration
pattern uses **Vitest + Supertest + real Supabase** (matches
`draft-performance.integration.test.ts`). The score freeze is a **client-side
React render bug** — it cannot be reproduced through HTTP alone.

Therefore two complementary test layers are appropriate:

---

### Test Layer 1 — Integration: `apply_match_score_delta` RPC under rapid fire

**File:** `tests/e2e/scoreboard-score-freeze.e2e.ts`  
**Runner:** Vitest + real Supabase (same pattern as existing integration tests)

**What it proves:**  
The RPC itself correctly serialises rapid calls and returns consistent scores.
This rules out a pure DB-level race and pins the bug definitively in the
client render path.

**Scenario A — Sequential rapid-fire (single caller):**
1. Create test user, session, 12 players, 1 match (scores 0-0).
2. Call `apply_match_score_delta` 5 times in rapid sequence (each awaited),
   team A, +1 each, passing the score from the previous response as
   `expectedA`.
3. **Assert:** every call returns `applied=true`.
4. **Assert:** final DB score for team A is 5.

**Scenario B — Concurrent calls with stale expected values (simulates the bug):**
1. Same setup.
2. Fire 3 calls **concurrently** (via `Promise.all`), all with `expectedA=0`.
3. **Assert:** exactly 1 returns `applied=true`; the other 2 return
   `applied=false` with the corrected score.
4. **Assert:** final DB score for team A is 1 (not 3).

> Scenario B is the "proof" that optimistic concurrent taps diverge. It
> documents the exact failure mode that the client hook must handle.

**Scenario C — `applied=false` snap-back correctness:**
1. Same setup.
2. Manually set match score to (3, 2) via admin client.
3. Call RPC with stale `expectedA=0, expectedB=0` and `delta=1`.
4. **Assert:** returns `applied=false`, `teamAScore=3`, `teamBScore=2`.

---

### Test Layer 2 — Hook unit test: `useScoreboardActions` under concurrent transitions

**File:** `tests/e2e/scoreboard-score-freeze.e2e.ts` (same file, separate
`describe` block) **or** a vitest unit test alongside the hook.  
**Runner:** Vitest with mocked `updateScore` server action.

**What it proves:**  
After the fix (realtime updates wrapped in `startTransition`), the final
displayed score matches the DB after N rapid taps, with no intermediate
freeze.

**Scenario D — Rapid tap sequence, all applied:**
1. Render `useScoreboardActions` with `match.team_a_score=0`.
2. Mock `updateScore` to resolve `{ applied: true, teamAScore: n, teamBScore: 0 }`
   with a 50 ms delay.
3. Simulate 5 rapid calls to `handleScoreChange('a', 1)` within 100 ms.
4. Wait for all transitions to settle.
5. **Assert:** `optScoreA === 5` (no freeze at any intermediate value).

**Scenario E — Snap-back on `applied=false`:**
1. Same setup.
2. Mock `updateScore` to return `{ applied: false, teamAScore: 2, teamBScore: 0 }`.
3. Call `handleScoreChange('a', 1)` once (optimistic → scoreA=1).
4. Wait for transition.
5. **Assert:** `optScoreA === 2` (snapped back to DB truth, not stuck at 1).

**Scenario F — Realtime broadcast overrides optimistic without freeze:**
1. Render `useScoreboardActions` with initial score (0, 0).
2. Call `handleScoreChange('a', 1)` → optimistic score = 1.
3. While transition is pending, simulate the `onMatchScores` callback firing
   with `{ teamAScore: 1, teamBScore: 0 }` (realtime arrives).
4. Transition resolves.
5. **Assert:** `optScoreA === 1` (settled, no extra re-render bounces).

---

### Acceptance criteria for the tests themselves

- [ ] Scenario A passes before and after the fix (RPC is already correct).
- [ ] Scenario B passes before and after the fix (documents the DB behaviour).
- [ ] Scenario C passes before and after the fix (snap-back data is correct).
- [ ] Scenarios D, E, F **fail on the current code** and **pass after the fix**.
  These are the regression sentinels.
- [ ] All scenarios run under `npm test` without a live browser.
- [ ] Cleanup (delete test match, session, players, user) runs in `afterAll`.

---

## Change Summary (ordered by execution)

1. Write the E2E / integration tests (Scenarios A–F) — they should fail first.
2. Fix `useLiveSessionSync.ts` — wrap realtime score callback in `startTransition`.
3. Fix `useScoreboardActions.ts` — add `isHost` guard.
4. Fix `hooks.ts` — thread `isHost`.
5. Fix `ScorePanel.tsx` — conditional interactivity.
6. Fix `RosterPanel.tsx` — conditional decrement.
7. Fix `Scoreboard.tsx` — thread `isHost` down.
8. Fix `page.tsx` — derive and pass `isHost` server-side.
9. Confirm Scenarios D, E, F now pass.
