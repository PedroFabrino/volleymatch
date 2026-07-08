# Follow-Up Tech Debts — Post-Implementation Audit #9

**Audited:** 2026-07-08  
**Against:** Current codebase cross-checked against `docs/tech-debt.md`, audit #8 (`19-TD073-TD076`), and `AGENTS.md`

> Audit #8 (`19-TD073-TD076-follow-up-gaps-8.md`) is now **fully resolved** in the working
> tree. This pass verifies those closures and records newly discovered residual violations.

> **Status of original register (TD-001 → TD-017):** All resolved ✅  
> **Status of follow-up audits (TD-018 → TD-059):** All resolved ✅  
> **Status of audit #7 (TD-060 → TD-072):** TD-060–066, TD-068–071 resolved ✅ · TD-067 deferred · TD-072 Won't Fix  
> **Status of audit #8 (TD-073 → TD-076):** All resolved ✅  
> **Status of audit #9 (TD-077 → TD-085):** 7 open · 1 deferred (TD-082) · TD-067/TD-072 carry forward

---

## Audit #8 Closure Verification (TD-073 → TD-076)

| ID | Verification |
|---|---|
| TD-073 | ✅ `Scoreboard`, `SpectatorScoreboard`, `AttendanceToggle`, `AttendanceControls` import via `@/features/<name>` barrels; hooks exported from `live-session/index.ts` and `spectator/index.ts` |
| TD-074 | ✅ `hooks.ts` decomposed — **76-line orchestrator** + `useScoreboardTimer`, `useScoreboardVotes`, `useScoreboardActions` |
| TD-075 | ✅ History **55 lines**, leaderboard **70 lines**, summary session **78 lines**; `HistoryMatchCard`, `LeaderboardTable`, `SummaryPageHeader` extracted |
| TD-076 | ✅ `Matchmaker` uses `getActionErrorMessage()` + local error state; `Matchmaker.generateFailed` in both locale files |

---

## TD-077 · Residual Intra-Feature `./actions` Deep Imports in Hook Modules · P3

| | |
|---|---|
| **Rule** | AGENTS §3.2 — Barrel is the public API |
| **Files** | See table below |

**What's wrong:**  
TD-073 closed deep imports in feature **components** ✅. Two hook modules still bypass their
feature barrels:

| File | Import | Barrel already exports? |
|---|---|---|
| `features/spectator/hooks.ts` | `./actions` | ✅ via `spectator/index.ts` |
| `features/live-session/useScoreboardActions.ts` | `./actions`, `./team-actions` | ✅ via `live-session/index.ts` |

**Remediation:**  
Update hook modules to import from `@/features/spectator` and `@/features/live-session`
respectively. No barrel changes required.

---

## TD-078 · Summary Share Failures Swallowed · P3

| | |
|---|---|
| **Rule** | AGENTS §6 — TD-065 / TD-076 residual |
| **Files** | `ShareButton.tsx` L40–42, `HighlightsGrid.tsx` L56–58 |

**What's wrong:**  
`Matchmaker` and `PlayerJoinForm` now surface action errors to users ✅. Summary share flows
still catch failures and only call `console.error`:

```tsx
} catch (error) {
  console.error('Error sharing image:', error)
}
```

Users get no feedback when OG fetch fails or native share is cancelled unexpectedly.

**Remediation:**  
Add local error/toast state. Reuse `Summary.shareFetchFailed` (ShareButton) or add a
`Summary.shareFailed` key. For HighlightsGrid clipboard fallback, the existing `copied` state
already covers the non-share path ✅.

---

## TD-079 · Login Surfaces Raw Supabase Error Messages · P2

| | |
|---|---|
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |
| **Files** | `app/login/actions.ts` L18, L36; `app/login/page.tsx` L27–29 |

**What's wrong:**  
Auth failures redirect with the raw Supabase message in the query string:

```ts
redirect('/login?error=' + error.message)
```

The login page renders `{searchParams.error}` directly — English Supabase internals may appear
in the UI (e.g. `"Invalid login credentials"`, `"Email not confirmed"`).

**Remediation:**  
Map known Supabase error codes/messages to structured keys (`invalidCredentials`,
`emailNotConfirmed`, etc.). Redirect with `?error=invalidCredentials`. Translate on the login
page with `useTranslations('Errors')` or `getTranslations('Login')`.

---

## TD-080 · Login Server Actions Remain in `app/` · P3

| | |
|---|---|
| **Rule** | AGENTS §3.1 — Non-trivial actions belong in feature `actions.ts` (cf. TD-016) |
| **File** | `src/app/login/actions.ts` — **42 lines** |

**What's wrong:**  
`login` and `signup` are `'use server'` functions colocated with the route. TD-016 moved
dashboard `signOut` into `features/dashboard/actions.ts`; auth mutations follow the same pattern.

**Remediation:**  
Create `features/auth/` (or `features/login/`) with `actions.ts` + `index.ts` barrel. Keep
`app/login/page.tsx` as a thin orchestrator importing from the feature barrel.

---

## TD-081 · View Page Bypasses `lib/services` Barrel · P3

| | |
|---|---|
| **Rule** | AGENTS §3.3 / TD-058 — Import services via barrel |
| **File** | `src/app/view/[pin]/page.tsx` L8 |

**What's wrong:**  
The spectator view page deep-imports a service submodule:

```ts
import { getSpectatorViewData } from '@/lib/services/spectator.service'
```

`getSpectatorViewData` is already re-exported from `lib/services/index.ts` ✅.

**Remediation:**  
Change to `import { getSpectatorViewData } from '@/lib/services'`.

---

## TD-082 · session-read.service.ts Approaching Lib Soft Limit · P3

| | |
|---|---|
| **File** | `src/lib/services/session-read.service.ts` |
| **Size** | **230 lines** (soft limit: 250) |
| **Rule** | AGENTS §4.1 |
| **Status** | **Deferred** — split when next touched for session-read work |

**What's wrong:**  
The file hosts `getActiveSession`, `getSessionById`, `getLiveSessionViewData`, spectator PIN
lookup, and completed-match queries. At 230 lines it is 20 lines from the lib soft limit.

**Remediation (when touched):**  
Split into `session-read.service.ts` (core session queries) and
`session-view.service.ts` (page-assembly helpers like `getLiveSessionViewData`).

---

## TD-083 · Roster Duplicate-Name Redirect Uses English URL Token · P3

| | |
|---|---|
| **Rule** | AGENTS §6 — Structured error codes (cf. `public-join`) |
| **File** | `src/features/roster/actions.ts` L26, L63 |

**What's wrong:**  
Duplicate-name detection redirects with a human-readable English token:

```ts
redirect('/dashboard/roster?error=Duplicate+player+name')
```

`PlayerForm` treats any truthy `searchParams.error` as duplicate and shows `t('duplicateError')`
✅ — so the UI is localized, but the URL carries English prose instead of a stable code like
`duplicateName` (used in `public-join`).

**Remediation:**  
Redirect with `?error=duplicateName`. Update `roster/page.tsx` to check for the code explicitly.

---

## TD-084 · startSession Fails Silently · P3

| | |
|---|---|
| **Rule** | AGENTS §6 — TD-065 / TD-076 residual |
| **File** | `src/features/session/actions.ts` L39–41 |

**What's wrong:**  
When `createSession` fails, the action logs and returns without redirect or user feedback:

```ts
if (error || !session) {
  console.error('Error starting session:', error)
  return
}
```

The host sees no error after submitting house rules.

**Remediation:**  
Throw `ActionError('startSessionFailed')` or redirect with a structured error code.
Wire `SessionHouseRulesForm` (or session page) to display the translated message.

---

## TD-085 · Score/Event Mutations Swallow Insert Failures · P3

| | |
|---|---|
| **Rule** | AGENTS §3.4 — Silent partial failures |
| **Files** | `live-session/actions.ts` L75–77, `live-session/team-actions.ts` L64–66 |

**What's wrong:**  
`updateScore` and `substitutePlayer` call service helpers that may return `{ error }` from
parallel score + event writes. Failures are logged but not surfaced; the UI may show an updated
score without a corresponding timeline event.

**Remediation:**  
Propagate failures: throw `ActionError('scoreUpdateFailed')` / `ActionError('substitutionFailed')`
when `{ error }` is returned. Wire through `useScoreboardActions` with
`getActionErrorMessage()` (same pattern as TD-076).

---

## Summary Table

| ID | Priority | Category | File(s) | Status |
|---|---|---|---|---|
| TD-077 | P3 | Structure | Hook modules deep-import `./actions` | **Open** |
| TD-078 | P3 | i18n | `ShareButton`, `HighlightsGrid` share errors | **Open** |
| TD-079 | P2 | i18n | Login raw Supabase errors in URL/UI | **Open** |
| TD-080 | P3 | Architecture | `app/login/actions.ts` in routing layer | **Open** |
| TD-081 | P3 | Structure | View page deep-imports `spectator.service` | **Open** |
| TD-082 | P3 | File size | `session-read.service.ts` — 230 lines | **Deferred** |
| TD-083 | P3 | i18n | Roster English URL error token | **Open** |
| TD-084 | P3 | i18n | `startSession` silent failure | **Open** |
| TD-085 | P3 | Architecture | Score/substitution event insert failures swallowed | **Open** |
| TD-067 | P3 | File size | `lib/mmr/index.ts` — 239 lines | Deferred (carry forward) |
| TD-072 | P3 | Architecture | OG route | Won't Fix (carry forward) |

---

## Audit Statistics

| Metric | Count |
|---|---|
| TD items total (001–085) | **85** |
| Fully resolved (001–076, excluding deferred/won't fix) | **74** |
| Deferred (067, 082) | **2** |
| Won't Fix (072) | **1** |
| New open (077–081, 083–085) | **7** |
| Files over any hard limit | **0** (excluding generated `database.ts`) |
| `any` type instances | **0** |
| `supabase.from()` outside `lib/services/` + documented OG exception | **0** |
| Cross-feature imports | **0** |
| Files importing >10 modules | **0** |

---

## Suggested Resolution Order

1. **TD-079** — Map login errors to i18n keys (P2, user-visible English leak)
2. **TD-081** — One-line barrel import fix on view page (quick win)
3. **TD-077** — Route hook deep imports through feature barrels
4. **TD-078** — Surface summary share errors (completes TD-065 adoption)
5. **TD-083** — Replace roster URL token with structured error code
6. **TD-084 / TD-085** — Propagate session-start and score-mutation failures
7. **TD-080** — Extract login actions to a feature slice when touching auth flow
8. **TD-082** — Split `session-read.service.ts` when next modifying session reads
