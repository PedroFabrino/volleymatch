# Follow-Up Tech Debts — Post-Implementation Audit #8

**Audited:** 2026-07-08  
**Against:** Current codebase cross-checked against `docs/tech-debt.md`, audit #7 (`18-TD060-TD072`), and `AGENTS.md`

> Audit #7 (`18-TD060-TD072-follow-up-gaps-7.md`) is now **fully resolved** except for
> TD-067 (deferred) and TD-072 (won't fix). This pass confirms those closures in the working
> tree and records newly discovered residual violations.

> **Status of original register (TD-001 → TD-017):** All resolved ✅  
> **Status of follow-up audits (TD-018 → TD-059):** All resolved ✅  
> **Status of audit #7 (TD-060 → TD-072):** TD-060–066, TD-068–071 resolved ✅ · TD-067 deferred · TD-072 Won't Fix  
> **Status of audit #8 (TD-073 → TD-076):** 4 new open items

---

## Audit #7 Closure Verification (TD-060 → TD-072)

| ID | Verification |
|---|---|
| TD-060 | ✅ `app/page.tsx` uses `Home`, `Metadata`, and `Login` namespaces |
| TD-061 | ✅ `Login.back` + `Metadata.title` on login page |
| TD-062 | ✅ `Matchmaker.tsx` uses `{t('preparingDraft')}` |
| TD-063 | ✅ `ActiveSessionBanner` calls `getActiveSession()` from `lib/services/` |
| TD-064 | ✅ `assertAuthenticated(user)` on `updateScore`, `cancelMatch`, `substitutePlayer` |
| TD-065 | ✅ `getActionErrorMessage()` helper exists; wired in `PlayerJoinForm` |
| TD-066 | ✅ `HighlightDetailModal` decomposed — **157 lines** + 4 variant panels |
| TD-067 | ⏸ `lib/mmr/index.ts` — **239 lines** (under 250 soft limit; split when next touched) |
| TD-068 | ✅ Share pages + banner use `Metadata.title` |
| TD-069 | ✅ `LanguageSwitcher` + `ThemeToggle` use `Common.*` keys |
| TD-070 | ✅ `parsePositionRecord()` in `mappers.ts`; used in `team-actions.ts` and `_draft.ts` |
| TD-071 | ✅ Generated-type exception documented in `AGENTS.md` §4.1 |
| TD-072 | Won't Fix — OG route exception unchanged |

---

## TD-073 · Residual Intra-Feature Deep Imports · P3

| | |
|---|---|
| **Rule** | AGENTS §3.2 — Barrel is the public API |
| **Files** | See table below |

**What's wrong:**  
TD-059 closed all `../actions` deep imports ✅. Four components still bypass their feature
barrels via other relative paths:

| File | Import | Barrel already exports? |
|---|---|---|
| `features/live-session/components/Scoreboard.tsx` | `../hooks` | ❌ `hooks.ts` not in barrel |
| `features/spectator/components/SpectatorScoreboard.tsx` | `../hooks` | ❌ `hooks.ts` not in barrel |
| `features/roster/components/AttendanceToggle.tsx` | `../attendance-actions` | ✅ via `roster/index.ts` |
| `features/roster/components/AttendanceControls.tsx` | `../attendance-actions` | ✅ via `roster/index.ts` |

**Remediation:**  
1. Export hooks from `live-session/index.ts` and `spectator/index.ts` (or keep hooks private and
   co-locate imports — but then document the exception).  
2. Update roster components to import from `@/features/roster`.  
3. Update scoreboard components to import hooks via `@/features/<name>` once exported.

---

## TD-074 · live-session/hooks.ts Exceeds Soft Limit · P3

| | |
|---|---|
| **File** | `src/features/live-session/hooks.ts` |
| **Size** | **220 lines** (soft limit: 200) |
| **Rule** | AGENTS §4.1 |

**What's wrong:**  
`useScoreboard` combines timer state, optimistic score updates, realtime vote toasts, roster/queue
sorting, and six action handlers in a single 220-line hook — 20 lines over the generic-file soft
limit. Same decomposition signal as pre-split `Scoreboard.tsx` (TD-001).

**Remediation:**  
Extract focused hooks when next touched:

```
useScoreboardTimer.ts      # elapsed timer from match.created_at
useScoreboardVotes.ts      # realtime vote toast debouncing
useScoreboardActions.ts    # substitute/swap/cancel handlers
hooks.ts                   # orchestrator composing the above (~80 lines)
```

---

## TD-075 · Dashboard Pages Marginally Over Page Soft Limit · P3

| | |
|---|---|
| **Rule** | AGENTS §4.1 — `page.tsx` soft limit 100 lines |
| **Files** | See table below |

**What's wrong:**  
Three dashboard pages exceed the page soft limit by 1–7 lines:

| File | Lines | Over by |
|---|---|---|
| `app/dashboard/history/page.tsx` | 102 | 2 |
| `app/dashboard/leaderboard/page.tsx` | 107 | 7 |
| `app/dashboard/summary/[session_id]/page.tsx` | 101 | 1 |

All three are localized ✅ and delegate data fetching to `lib/services/` ✅. The violation is
purely structural — inline JSX for match rows / leaderboard table / summary header assembly.

**Remediation:**  
- **History:** Extract `HistoryMatchCard` into `features/summary/components/` (reuses
  `TimelineViewer`). Target page ~60 lines.  
- **Leaderboard:** Extract `LeaderboardTable` into `features/dashboard/components/`. Target page
  ~55 lines.  
- **Summary session:** Extract header row (`SummaryPageHeader`) into `features/summary/`.
  Target page ~85 lines.

---

## TD-076 · Matchmaker Swallows Action Errors · P3

| | |
|---|---|
| **File** | `src/features/live-session/components/Matchmaker.tsx` L27–28 |
| **Rule** | AGENTS §6 — TD-065 residual |

**What's wrong:**  
TD-065 added `getActionErrorMessage()` and wired it in `PlayerJoinForm` ✅. `Matchmaker` catches
errors from `generateMatch` / `saveMatch` (which throw `ActionError('saveMatchFailed')`) but only
calls `console.error(e)` — no user-facing feedback.

```tsx
} catch (e) {
  console.error(e)
}
```

**Remediation:**  
Add local error state + `useTranslations('Errors')`. Display
`getActionErrorMessage(e, tErrors, t('generateFailed'))` in the draft panel. Add
`Matchmaker.generateFailed` fallback key to both locale files if needed.

---

## Summary Table

| ID | Priority | Category | File(s) | Status |
|---|---|---|---|---|
| TD-073 | P3 | Structure | Residual `../hooks` and `../attendance-actions` imports | **Open** |
| TD-074 | P3 | File size | `live-session/hooks.ts` — 220 lines | **Open** |
| TD-075 | P3 | File size | History, leaderboard, summary session pages — 101–107 lines | **Open** |
| TD-076 | P3 | i18n | Matchmaker swallows ActionError without user feedback | **Open** |

---

## Audit Statistics

| Metric | Count |
|---|---|
| TD items total (001–076) | 76 |
| Fully resolved (001–066, 068–071) | **69** |
| Deferred (067) | **1** |
| Won't Fix (072) | **1** |
| New open (073–076) | **4** |
| Files over any hard limit | **0** (excluding generated `database.ts`) |
| `any` type instances | **0** |
| `supabase.from()` outside `lib/services/` + documented OG exception | **0** |
| Cross-feature imports | **0** |
| Files importing >10 modules | **0** |

---

## Suggested Resolution Order

1. **TD-076** — Surface Matchmaker errors to the user (quick win, completes TD-065 adoption)
2. **TD-073** — Route roster attendance imports through barrel; export hooks from feature barrels
3. **TD-075** — Extract page sub-components when next touching history/leaderboard/summary routes
4. **TD-074** — Split `useScoreboard` when next touching live-session scoreboard work
