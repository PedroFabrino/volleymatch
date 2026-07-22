# BF-001-E2E · Playwright Test Plan — Scoreboard Score Freeze

**Companion to:** `BF-001-host-only-scoring.md`  
**Filed:** 2026-07-22  
**Status:** Plan only — no code written yet

---

## Goal

Write Playwright E2E tests that:

1. **Reproduce the freeze today** — tests must fail on the current codebase.
2. **Pass after the fix** is applied — serve as regression sentinels forever.
3. **Document correct baseline behaviour** — control group must pass both before and after.

---

## How these tests work

Playwright drives a **real browser against the running dev server**. The app
handles everything it normally handles: auth cookies, the Supabase realtime
WebSocket, Server Action fetches. We interact with it exactly as a user would.

The only thing outside the browser is **DB seeding** — done once in
`beforeAll` via the Supabase Admin API (same pattern as
`tests/integration/test-helpers.ts`).

---

## Prerequisites & Setup Work

### P1 — Install Playwright

```
npm install --save-dev @playwright/test
npx playwright install chromium
```

### P2 — `playwright.config.ts` (repo root)

Single config file. The `webServer` block is conditional on an env var so
the same config serves both local and CI use:

```ts
webServer: process.env.E2E_START_SERVER ? {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: false,
} : undefined,
```

Two scripts in `package.json`:
```json
"test:e2e":    "playwright test",
"test:e2e:ci": "E2E_START_SERVER=true playwright test"
```

- **Local:** `npm run test:e2e` — assumes `npm run dev` is already running.
- **CI / pipeline:** `npm run test:e2e:ci` — Playwright boots and owns the server.

Other config: `baseURL: 'http://localhost:3000'`, `testDir: './tests/e2e'`.

### P3 — Add `data-testid` attributes to scoring elements

No `data-testid` attributes exist anywhere today. These must be added as part
of the coding task — no logic changes, just test hooks.

| Element | `data-testid` value | File |
|---|---|---|
| Team A score panel `<div>` | `score-panel-a` | `ScorePanel.tsx` |
| Team B score panel `<div>` | `score-panel-b` | `ScorePanel.tsx` |
| Team A score number | `score-value-a` | `ScorePanel.tsx` |
| Team B score number | `score-value-b` | `ScorePanel.tsx` |
| Team A decrement `<button>` | `decrement-a` | `ScorePanel.tsx` |
| Team B decrement `<button>` | `decrement-b` | `ScorePanel.tsx` |
| Team A roster decrement | `roster-decrement-a` | `RosterPanel.tsx` |
| Team B roster decrement | `roster-decrement-b` | `RosterPanel.tsx` |
| Match-over modal root | `match-over-modal` | `MatchOverModal.tsx` |
| Match-over undo button | `undo-point-btn` | `MatchOverModal.tsx` |

---

## Test File

**Path:** `tests/e2e/scoreboard-score-freeze.spec.ts`

### Structure

Everything lives in the single spec file — no separate helper files or
temp JSON files.

```
describe('Scoreboard score freeze')

  beforeAll
    → purge stale e2e-test-* users (Admin API)
    → create test user, session, 12 players, active match (0–0)
    → store ids in module-level variables
    → page.goto('/login'), fill credentials, submit
    → page.context().storageState({ path: '.pw-auth.json' })
      (saves auth cookie so beforeEach reuses it without re-logging in)

  beforeEach
    → load storageState from .pw-auth.json
    → page.goto('/dashboard/live/{sessionId}')

  afterAll
    → delete test user via Admin API (cascades everything)
    → delete .pw-auth.json
```

---

## Test Cases

---

### CONTROL GROUP — Must pass before AND after the fix

---

#### `[CONTROL-01]` Scoreboard renders with seeded score 0–0

**Steps:**
1. Assert `[data-testid="score-value-a"]` is visible and contains `"0"`.
2. Assert `[data-testid="score-value-b"]` is visible and contains `"0"`.

**Before fix:** ✅ **After fix:** ✅

---

#### `[CONTROL-02]` Single deliberate click increments score to 1

**Steps:**
1. Click `[data-testid="score-panel-a"]`.
2. Wait 2 000 ms.
3. Assert `[data-testid="score-value-a"]` contains `"1"`.
4. Assert `[data-testid="score-value-b"]` contains `"0"`.

**Before fix:** ✅ **After fix:** ✅

---

#### `[CONTROL-03]` Decrement button brings score back to 0

**Steps:**
1. Click `[data-testid="score-panel-a"]` and wait 2 000 ms.
2. Click `[data-testid="decrement-a"]`.
3. Wait 2 000 ms.
4. Assert `[data-testid="score-value-a"]` contains `"0"`.

**Before fix:** ✅ **After fix:** ✅

---

### REGRESSION GROUP — Must FAIL before the fix, PASS after

---

#### `[REGRESSION-01]` Five rapid clicks settle on score 5

**What it tests:** The core freeze. Five clicks in rapid succession
(~40 ms apart) must always land on 5, not freeze on an intermediate value.

**Steps:**
1. Click `[data-testid="score-panel-a"]` 5 times with `{ delay: 0 }`.
2. Wait 4 000 ms.
3. Assert `[data-testid="score-value-a"]` contains `"5"`.
4. Assert `[data-testid="score-value-b"]` contains `"0"`.

**Why it catches the bug:** Concurrent `startTransition` calls racing against
the urgent realtime `setState` leave React reconciled on an intermediate value
(e.g. 2, 3, or 4). The DOM freezes there until the next unrelated state
change.

**Before fix:** ❌ (score stuck below 5) **After fix:** ✅

---

#### `[REGRESSION-02]` Alternating rapid clicks on both teams settle correctly

**What it tests:** Interleaved A/B taps — worst case for the
`scoreARef` / `scoreBRef` stale-reference problem, since both refs can be
stale simultaneously.

**Steps:**
1. Click A, B, A, B, A in quick succession (~50 ms apart, 3 on A, 2 on B).
2. Wait 4 000 ms.
3. Assert `[data-testid="score-value-a"]` contains `"3"`.
4. Assert `[data-testid="score-value-b"]` contains `"2"`.

**Before fix:** ❌ **After fix:** ✅

---

#### `[REGRESSION-03]` Three rapid taps on mobile viewport settle correctly

**What it tests:** The mobile touch path — `onTouchStart` / `onTouchEnd` on
`ScorePanel` is a distinct code branch from the `onClick` desktop path.

**Steps:**
1. Set viewport to iPhone 13 preset (`{ width: 390, height: 844 }`).
2. `page.touchscreen.tap()` on `[data-testid="score-panel-a"]` 3 times
   within 200 ms.
3. Wait 4 000 ms.
4. Assert `[data-testid="score-value-a"]` contains `"3"`.

**Before fix:** ❌ **After fix:** ✅

---

#### `[REGRESSION-04]` Match-over modal "Undo Point" works after reaching
game point

**What it tests:** After tapping to match-over threshold, the undo button
must correctly decrement and dismiss the modal without freezing.

**Setup (in this test's `beforeEach` override):**
- Use Admin API: `UPDATE matches SET team_a_score=24, team_b_score=23`.
- `page.reload()` so the page fetches the updated scores.

**Steps:**
1. Assert `[data-testid="score-value-a"]` shows `"24"`.
2. Click `[data-testid="score-panel-a"]` — match-over modal must appear.
3. Assert `[data-testid="match-over-modal"]` is visible.
4. Click `[data-testid="undo-point-btn"]`.
5. Wait 2 000 ms.
6. Assert `[data-testid="match-over-modal"]` is **not** visible.
7. Assert `[data-testid="score-value-a"]` contains `"24"`.

**Before fix:** ❌ **After fix:** ✅

---

## Test Matrix Summary

| ID | Description | Before fix | After fix |
|---|---|---|---|
| CONTROL-01 | Initial render 0–0 | ✅ | ✅ |
| CONTROL-02 | Single click → score 1 | ✅ | ✅ |
| CONTROL-03 | Decrement → score 0 | ✅ | ✅ |
| REGRESSION-01 | 5 rapid clicks → score 5 | ❌ | ✅ |
| REGRESSION-02 | Alternating A/B rapid clicks | ❌ | ✅ |
| REGRESSION-03 | 3 rapid taps, mobile viewport | ❌ | ✅ |
| REGRESSION-04 | Match-over undo after game point | ❌ | ✅ |

---

## Execution Order (coding task)

1. Install `@playwright/test` + `chromium`.
2. Write `playwright.config.ts`.
3. Add `data-testid` attributes to `ScorePanel.tsx`, `RosterPanel.tsx`,
   `MatchOverModal.tsx`.
4. Write `tests/e2e/scoreboard-score-freeze.spec.ts` (all 7 cases + lifecycle).
5. Run `npm run test:e2e` — confirm CONTROL passes, REGRESSION fails.
6. Implement the fix from `BF-001-host-only-scoring.md`.
7. Re-run — all 7 must pass.
