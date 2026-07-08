# VolleyMatch — Tech Debt Register

**Last audited:** 2026-07-07  
**Audited against:** `AGENTS.md` architecture guide

> Items are grouped by rule category and scored **P1 (blocking/risky)**, **P2 (significant)**, or **P3 (minor/cosmetic)**.

---

## TD-001 · File Size — `Scoreboard.tsx` is a God Component · P1

| | |
|---|---|
| **File** | `src/features/live-session/components/Scoreboard.tsx` |
| **Size** | 602 lines (hard limit: 300) |
| **Rule** | AGENTS §4.1 — Feature component hard limit is 300 lines |

**What's wrong:**  
`Scoreboard.tsx` is a 602-line monolith that contains 7+ distinct visual sections — the scoreboard panels, the timer/top-bar overlay, Team A & B roster accordions, the Up-Next queue, the Admin footer controls, the Substitution modal, the Swap Position modal, and the Match Over modal — all in a single component.

**Remediation:**  
Split into focused sub-components within `features/live-session/components/`:

```
ScorePanel.tsx          # Team A / B tap-to-score areas (landscape view)
RosterPanel.tsx         # Portrait team roster accordion (reusable for both teams)
QueuePanel.tsx          # "Next Up" portrait queue section
AdminControls.tsx       # Bottom footer action buttons
SubstitutionModal.tsx   # Player substitution modal
SwapPositionModal.tsx   # Position swap modal
MatchOverModal.tsx      # End-of-game result + actions modal
```

Keep `Scoreboard.tsx` as the top-level orchestrator under ~150 lines.

---

## TD-002 · File Size — `live-session/actions.ts` is a God Action File · P1

| | |
|---|---|
| **File** | `src/features/live-session/actions.ts` |
| **Size** | 406 lines (hard limit: 200) |
| **Rule** | AGENTS §4.1 — `actions.ts` hard limit is 200 lines |

**What's wrong:**  
The file contains 7 distinct public actions + 2 private helpers (`computeMatchDraft`, `processBackgroundMatch`), the latter of which is a full background job runner spanning ~80 lines. `saveMatch` also calls `computeMatchDraft` implying it carries two responsibilities.

**Remediation:**  
Extract private helpers into a dedicated internal module:

```
features/live-session/
├── actions.ts          # Public server actions only (~150 lines)
└── _draft.ts           # computeMatchDraft + processBackgroundMatch (private, not exported via index.ts)
```

---

## TD-003 · File Size — `lib/stats/summaryStats.ts` is a God Library File · P1

| | |
|---|---|
| **File** | `src/lib/stats/summaryStats.ts` |
| **Size** | 473 lines (hard limit: 350) |
| **Rule** | AGENTS §4.1 — `lib/**/*.ts` hard limit is 350 lines |

**What's wrong:**  
The file contains two near-duplicate calculation pipelines (`getSessionSummaryData` and `computeDashboardStats`) plus many inline stat helper functions. There is no `index.ts` barrel for `lib/stats/`.

**Remediation:**
- Extract into sub-modules: `session-stats.ts`, `dashboard-stats.ts`, `stat-helpers.ts`
- Create `lib/stats/index.ts` as barrel export

---

## TD-004 · File Size — `lib/matchmaking/index.ts` is a God File · P1

| | |
|---|---|
| **File** | `src/lib/matchmaking/index.ts` |
| **Size** | 342 lines (soft limit: 250, approaching hard: 350) |
| **Rule** | AGENTS §4.1, §4.6 — Approaching hard limit; called out as a god file in AGENTS.md |

**What's wrong:**  
All matchmaking logic (type definitions, `isSetter`, `draftTeams`, `draftStrictTeams`, queue selection, setter compensation) lives in a single file.

**Remediation:**
```
lib/matchmaking/
├── types.ts                # Player type and related types
├── draft.ts                # draftTeams, draftStrictTeams
├── rotation.ts             # Winner-stays-on queue selection logic
├── setter-compensation.ts  # Setter bonus MMR logic
└── index.ts                # Barrel re-export
```

---

## TD-005 · File Size — `app/dashboard/page.tsx` exceeds page limit · P2

| | |
|---|---|
| **File** | `src/app/dashboard/page.tsx` |
| **Size** | 211 lines (hard limit: 150) |
| **Rule** | AGENTS §4.1, §3.1 — Page hard limit is 150 lines; pages must be thin orchestrators |

**What's wrong:**  
The page contains 4 distinct visual sections rendered inline: header row, Quick Actions column, Player Rankings column, and Recent Matches column. `getPlayerName` helper and `signOut` action are also defined inline.

**Remediation:**  
Create a feature slice (or extend `features/`) with:
```
features/dashboard/
├── components/
│   ├── QuickActionsColumn.tsx
│   ├── PlayerRankingsColumn.tsx
│   └── RecentMatchesColumn.tsx
└── index.ts
```
Reduce `page.tsx` to data fetching + layout assembly.

---

## TD-006 · File Size — `app/dashboard/session/page.tsx` exceeds page limit · P2

| | |
|---|---|
| **File** | `src/app/dashboard/session/page.tsx` |
| **Size** | 238 lines (hard limit: 150) |
| **Rule** | AGENTS §3.1, §4.1 |

**What's wrong:**  
The page contains both the session queue display and the full house-rules form inline. Business logic (queue sorting, `queuedPlayers` construction with `sessionPlayersMap`) is performed inside the page function body.

**Remediation:**  
- Move queue-sorting logic to `features/session/` or `lib/`
- Extract `SessionHouseRulesForm` and `SessionQueuePanel` into `features/session/components/`

---

## TD-007 · File Size — `app/dashboard/roster/page.tsx` exceeds page limit · P2

| | |
|---|---|
| **File** | `src/app/dashboard/roster/page.tsx` |
| **Size** | 190 lines (hard limit: 150) |
| **Rule** | AGENTS §3.1, §4.1 |

**What's wrong:**  
The `availablePositions` constant and the entire add/edit player form are defined inline in the page. The player list with MMR display is also rendered directly in `page.tsx`.

**Remediation:**  
Move form and list rendering into `features/roster/components/`.

---

## TD-008 · `any` Type Violations — Multiple Files · P1

| | |
|---|---|
| **Rule** | AGENTS §4.5 — Do not use TypeScript `any` |

**Instances found:**

| File | Lines | `any` usage |
|---|---|---|
| `features/live-session/actions.ts` | 18, 256, 379, 385, 396 | `supabase: any`, `teamAPositions?: any`, `update: any` |
| `features/live-session/components/Matchmaker.tsx` | 11, 14 | `session: any`, `players: any[]`, `draft: any` |
| `features/live-session/components/Scoreboard.tsx` | 191, 285, 342 | `teamPlayers: any[]`, `p: any` in map callbacks |
| `features/roster/components/AttendanceToggle.tsx` | 30 | `player: any` |
| `features/summary/components/TimelineViewer.tsx` | 7 | `timeline: any[]` |
| `app/dashboard/session/page.tsx` | 31 | `queuedPlayers: any[]` |
| `app/dashboard/summary/[session_id]/HighlightsGrid.tsx` | 9–16, 50 | Multiple `any` in prop interface |
| `app/dashboard/summary/[session_id]/page.tsx` | 112 | `player: any` in `.map` |
| `app/join/[pin]/PlayerJoinForm.tsx` | 9 | `session: any`, `players: any[]` |
| `app/view/[pin]/SpectatorScoreboard.tsx` | 11, 173, 238, 265, 395 | Multiple `any` |
| `app/view/[pin]/SpectatorMatchmaker.tsx` | 8 | `session: any` |
| `lib/stats/summaryStats.ts` | 97, 101, 116, 331, 335, 350, 434 | Multiple `any` |
| `app/api/og/summary/route.tsx` | 27, 136 | Sort callback `any`, catch `any` |

**Remediation:**  
- Use types from `src/types/` (`Session`, `Match`, `Player`) which already exist but aren't consumed everywhere
- Replace `any` in lib files with exported types from `lib/mmr` and `lib/matchmaking`
- Type the Supabase client with the `SupabaseClient` import from `@supabase/supabase-js` (already done in `summaryStats.ts` — apply the same pattern)

---

## TD-009 · Cross-Layer Supabase Call in `summary/[session_id]/page.tsx` · P2

| | |
|---|---|
| **File** | `src/app/dashboard/summary/[session_id]/page.tsx` L35 |
| **Rule** | AGENTS §7 — Pages must never call `supabase.from()` directly |

**What's wrong:**
```ts
// In page.tsx — violates the data access pattern
await supabase.from('sessions').update({ summary_data: summaryData }).eq('id', sessionId);
```

**Remediation:**  
Add a `storeSummaryData(supabase, sessionId, data)` method to `lib/services/session.service.ts` and call it from the page (or move this to a server action).

---

## TD-010 · Direct Supabase Queries in `app/` Pages · P2

| | |
|---|---|
| **Rule** | AGENTS §7 — `lib/services/` is the only place that calls Supabase |

**Pages with raw `supabase.from()` calls:**

| File | Tables accessed |
|---|---|
| `app/dashboard/session/page.tsx` | `players`, `sessions`, `matches`, `session_players` |
| `app/dashboard/roster/page.tsx` | `players` |

Both should delegate to `lib/services/` functions.

---

## TD-011 · Spectator Components in `app/` Instead of `features/` · P2

| | |
|---|---|
| **Files** | `src/app/view/[pin]/SpectatorScoreboard.tsx` (480 lines), `SpectatorMatchmaker.tsx`, `RealtimeSubscriber.tsx` |
| **Rule** | AGENTS §3.1 — Pages are thin orchestrators; feature UI lives in `features/` |

**What's wrong:**  
`SpectatorScoreboard.tsx` is a 480-line component placed inside the `app/` routing layer. Additionally, the `sortPlayersByPos` helper and player-row rendering are duplicated from `Scoreboard.tsx` — a clear code duplication smell.

**Remediation:**  
- Move to `features/live-session/components/` or a dedicated `features/spectator/` slice
- Extract shared `sortPlayersByPos` logic into `lib/` and a shared `PlayerRosterRow.tsx` component

---

## TD-012 · Summary `HighlightsGrid.tsx` in `app/` Instead of `features/` · P2

| | |
|---|---|
| **File** | `src/app/dashboard/summary/[session_id]/HighlightsGrid.tsx` (~340 lines) |
| **Rule** | AGENTS §3.1, §3.4 — Feature-specific UI belongs in `features/` |

**Remediation:**  
Move to `features/summary/components/HighlightsGrid.tsx` and export via `features/summary/index.ts`.

---

## TD-013 · `lib/stats/` Missing `index.ts` Barrel · P3

| | |
|---|---|
| **File** | `src/lib/stats/` |
| **Rule** | AGENTS §3.3 — Each `lib/` sub-domain must have an `index.ts` barrel |

**What's wrong:**  
`lib/stats/` has no `index.ts`. Consumers deep-import `@/lib/stats/summaryStats` directly, violating the barrel convention.

**Remediation:**  
Create `src/lib/stats/index.ts`:
```ts
export { getSessionSummaryData, computeDashboardStats } from './summaryStats'
```

---

## TD-014 · Hardcoded English String in `Scoreboard.tsx` · P2

| | |
|---|---|
| **File** | `src/features/live-session/components/Scoreboard.tsx` L445 |
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |

**What's wrong:**
```tsx
<ArrowLeftRight className="w-4 h-4" /> Swap Sides
```
`"Swap Sides"` is hardcoded and not routed through `next-intl`.

**Remediation:**  
Add `"swapSides"` key to both `locales/en.json` and `locales/pt.json` and replace with `{t('swapSides')}`.

---

## TD-015 · Cross-Feature Import: `live-session` → `session` · P1

| | |
|---|---|
| **File** | `src/features/live-session/components/Matchmaker.tsx` L5 |
| **Rule** | AGENTS §3.2 — Features must not import from other features |

**What's wrong:**
```ts
import { endSession } from '@/features/session'
```
`live-session` directly depends on `session`, creating a cross-feature coupling that violates isolation boundaries.

**Remediation:**  
Pass `endSession` as a prop/callback to `Matchmaker`, or move `endSession` to `lib/` so both features can call it independently.

---

## TD-016 · Inline `signOut` in `dashboard/page.tsx` · P3

| | |
|---|---|
| **File** | `src/app/dashboard/page.tsx` L27–33 |
| **Rule** | AGENTS §3.1 — Inline trivial actions are acceptable |

This is within the letter of the rule (trivial one-off mutation). Low priority — tracked only because it compounds the page line count (TD-005). Acceptable as-is.

---

## TD-017 · `features/session/index.ts` Barrel May Be Incomplete · P3

| | |
|---|---|
| **File** | `src/features/session/index.ts` |
| **Rule** | AGENTS §3.2 — The barrel is the only public API of a feature |

**What's wrong:**  
The file is only 27 bytes. If it doesn't re-export all public actions, consumers will resort to deep imports in the future.

**Remediation:**  
Ensure the barrel exports everything public:
```ts
export * from './actions'
```

---

## Summary Table

| ID | Priority | Category | File(s) |
|---|---|---|---|
| TD-001 | P1 | File size | `Scoreboard.tsx` — 602 lines |
| TD-002 | P1 | File size | `live-session/actions.ts` — 406 lines |
| TD-003 | P1 | File size | `lib/stats/summaryStats.ts` — 473 lines |
| TD-004 | P1 | File size | `lib/matchmaking/index.ts` — 342 lines |
| TD-005 | P2 | File size | `app/dashboard/page.tsx` — 211 lines |
| TD-006 | P2 | File size | `app/dashboard/session/page.tsx` — 238 lines |
| TD-007 | P2 | File size | `app/dashboard/roster/page.tsx` — 190 lines |
| TD-008 | P1 | TypeScript | `any` in 13 files |
| TD-009 | P2 | Architecture | Raw `supabase.from()` in `summary/page.tsx` |
| TD-010 | P2 | Architecture | Raw `supabase.from()` in `session/page.tsx`, `roster/page.tsx` |
| TD-011 | P2 | Architecture | Spectator components in `app/view/` |
| TD-012 | P2 | Architecture | `HighlightsGrid.tsx` in `app/` |
| TD-013 | P3 | Structure | `lib/stats/` missing `index.ts` |
| TD-014 | P2 | i18n | Hardcoded `"Swap Sides"` in `Scoreboard.tsx` |
| TD-015 | P1 | Architecture | Cross-feature import `live-session` → `session` |
| TD-016 | P3 | Architecture | Inline `signOut` in `dashboard/page.tsx` (acceptable) |
| TD-017 | P3 | Structure | `features/session/index.ts` may be incomplete |

---

## Suggested Resolution Order

1. **TD-015** — Fix cross-feature import first (hardest architectural constraint to enforce later)
2. **TD-001** — Decompose `Scoreboard.tsx` (biggest blast radius; blocks all future live-session work)
3. **TD-002** — Split `live-session/actions.ts`
4. **TD-008** — Eliminate `any` types (broad safety improvement, can be done incrementally per file)
5. **TD-003 / TD-004** — Split god lib files (prioritise when those files are touched for features)
6. **TD-010 / TD-009** — Move raw Supabase queries into `lib/services/`
7. **TD-011 / TD-012** — Relocate spectator and summary components into `features/`
8. **TD-005 / TD-006 / TD-007** — Reduce page sizes by extracting to feature slices
9. **TD-013 / TD-017** — Barrel housekeeping
10. **TD-014 / TD-016** — Minor polish
