# Follow-Up Tech Debts — Post-Implementation Audit #6

**Audited:** 2026-07-08  
**Against:** Current codebase state after TD-042 → TD-050 implementation passes, cross-checked against `docs/tech-debt.md` and all prior follow-up audits

> These items were **not present** in previous tech-debt documents but were discovered
> during a fresh cross-check of the codebase against `AGENTS.md`.

> **Status of original register (TD-001 → TD-017):** All resolved ✅  
> **Status of follow-up audits (TD-018 → TD-041):** All resolved ✅  
> **Status of audit #5 (TD-042 → TD-050):**
> - TD-042: `useSpectatorScoreboard` extracted; orchestrator **91 lines** ✅
> - TD-043: **Partial** — one unsafe cast remains (see below)
> - TD-044: **Partial** — `public-join` uses error codes; auth guards still throw English strings
> - TD-045: **Partial** — constants centralized in `types/player.ts`; Matchmaker still duplicates sort logic
> - TD-046: `HighlightsGrid` decomposed → **162 lines**; `HighlightCard` + `HighlightDetailModal` extracted ✅
> - TD-047: Services split read/write; barrels re-export via `match.service.ts` / `session.service.ts` ✅
> - TD-048: `getSpectatorViewData()` in `spectator.service.ts`; view page **58 lines** ✅
> - TD-049: Zero `fallback:` params in `t()` calls ✅
> - TD-050: `layout.tsx` uses `generateMetadata()` + `getTranslations('Metadata')` ✅

---

## TD-043 · Service Return Types — One Cast Remains · P2

| | |
|---|---|
| **Rule** | AGENTS §4.5 — Avoid suppressing type errors with casts |
| **File** | `src/app/dashboard/session/page.tsx` L29 |

**What's wrong:**  
Most TD-043 instances were fixed (`dashboard/page.tsx`, `history/page.tsx`, `resolveTeamPlayers`
type guard). One cast remains:

```ts
queuedPlayers = buildQueuedPlayerList(players as Player[], activeMatch, sessionPlayersMap)
```

`getPlayersByHoster()` already maps rows through `mapPlayerRow` with `parsePlayerPositions`, but
the function lacks an explicit `Promise<Player[]>` return type, so TypeScript does not infer
compatibility with `buildQueuedPlayerList`'s `Player[]` parameter.

**Remediation:**  
Add `: Promise<Player[]>` to `getPlayersByHoster()` in `lib/services/player.service.ts`. Remove
the cast in `session/page.tsx`.

---

## TD-044 · Hardcoded English in Server Action Error Messages · P2

| | |
|---|---|
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |
| **Files** | See table below |

**What's wrong:**  
`features/public-join/actions.ts` correctly returns structured error codes
(`invalidSession`, `duplicateName`, `createFailed`) ✅. However, auth guards and Supabase error
passthrough still throw hardcoded English strings that may surface to users:

| File | Pattern | Count |
|---|---|---|
| `features/live-session/actions.ts` | `'Unauthorized'`, `error.message` | 4 |
| `features/live-session/team-actions.ts` | `'Unauthorized'` | 2 |
| `features/session/actions.ts` | `'Unauthorized'` | 2 |
| `features/roster/actions.ts` | `'Unauthorized'` | 3 |
| `features/roster/attendance-actions.ts` | `'Unauthorized'` | 4 |

**Remediation:**  
1. Return `{ error: 'unauthorized' }` from actions (or throw a typed error class with a code).
2. Translate on the client with `useTranslations`, or use `getTranslations` inside Server Actions.
3. Replace `throw new Error(error.message)` in `saveMatch` with a structured error code so
   Supabase internals are not exposed to the UI.

---

## TD-045 · Duplicated Position Sort Logic in Matchmaker · P3

| | |
|---|---|
| **Rule** | AGENTS §5 — Single source of truth for domain values |
| **Files** | `src/features/live-session/components/Matchmaker.tsx` L44–54, `src/utils/sortPlayersByPos.ts` |

**What's wrong:**  
TD-045 centralized `SELECTABLE_POSITIONS`, `POSITION_SORT_ORDER`, and `TIER_MMR` in
`types/player.ts` ✅. However, `Matchmaker.tsx` defines a local `sortPlayersByPos` that
re-implements position-index sorting for team ID arrays, parallel to the shared utility in
`utils/sortPlayersByPos.ts` (which sorts player objects).

**Remediation:**  
Extract a shared helper for team-ID sorting:

```ts
// utils/sortPlayersByPos.ts
export function sortTeamIdsByPos(
  teamIds: string[],
  players: { id: string; positions?: string[] }[],
  positions?: Record<string, string>
): string[]
```

Import in `Matchmaker.tsx`; remove the local 11-line duplicate. Use `parsePlayerPosition` instead
of `as PlayerPosition` when indexing `POSITION_SORT_ORDER`.

---

## TD-051 · Hardcoded English in QrCodeModal · P2

| | |
|---|---|
| **File** | `src/components/ui/QrCodeModal/index.tsx` L25, 38, 40, 64 |
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |

**What's wrong:**  
The shared QR modal component has five hardcoded English strings and no `useTranslations`:

```tsx
QR Code
Join Session
Scan this QR code to self-register and join the queue.
Room PIN
```

Used on the live session page (`app/dashboard/live/[session_id]/page.tsx`).

**Remediation:**  
Add a `QrCode` (or extend `PublicJoin`) namespace in both locale files. Convert the component to
a client component with `useTranslations('QrCode')`.

---

## TD-052 · Hardcoded "Room PIN:" on Live Session Page · P2

| | |
|---|---|
| **File** | `src/app/dashboard/live/[session_id]/page.tsx` L52 |
| **Rule** | AGENTS §6 |

**What's wrong:**
```tsx
<span>Room PIN: <span className="...">{session.pin || '0000'}</span></span>
```

The locale key `PublicJoin.roomPin` (`"Room PIN"` / `"PIN da Sala"`) already exists in both
locale files but is not used here.

**Remediation:**  
Convert the PIN bar to a small client component, or extract a server-rendered
`LiveSessionPinBar` that calls `getTranslations('PublicJoin')` and passes the label down.

---

## TD-053 · Live Session Page Inline Business Logic · P3

| | |
|---|---|
| **File** | `src/app/dashboard/live/[session_id]/page.tsx` L24–46 |
| **Rule** | AGENTS §3.1 — Pages are thin orchestrators |

**What's wrong:**  
TD-048 extracted spectator assembly into `getSpectatorViewData()`. The live session page still
performs the same domain assembly inline:

- Merging `players` with `sessionPlayersData` to attach `games_played_today`
- Deriving `lastWinners` / `lastLosers` from the active match
- Sorting by draft priority and calling `previewNextDraft`

The page is **54 lines** (within limits), but the logic belongs in `lib/services/`.

**Remediation:**  
Add `getLiveSessionViewData(supabase, sessionId, userId)` to `lib/services/` (or extend
`session-read.service.ts`) returning `{ session, activeMatch, playersWithGames, playersWithStatus }`.
Mirror the `getSpectatorViewData` pattern from TD-048.

---

## TD-054 · Global Summary Page Duplicates SummaryLeaderboard · P3

| | |
|---|---|
| **File** | `src/app/dashboard/summary/all/page.tsx` — **136 lines** (soft limit: 100) |
| **Rule** | AGENTS §4.1, §4.2 |

**What's wrong:**  
TD-039 extracted `SummaryLeaderboard` for the per-session summary page, but the global summary
page (`summary/all/page.tsx`) inlines an identical 65-line leaderboard table (L77–139) instead
of reusing the component. This keeps the page 36 lines over the soft limit.

**Remediation:**  
Replace the inline table with `<SummaryLeaderboard ... />` from `@/features/summary`, passing
the same props already destructured from `getGlobalSummaryData`. Target: ~75 lines.

---

## TD-055 · Hardcoded Error String in ShareButton · P3

| | |
|---|---|
| **File** | `src/features/summary/components/ShareButton.tsx` L17 |
| **Rule** | AGENTS §6 |

**What's wrong:**
```ts
throw new Error(errorText || 'Failed to fetch image')
```

The fallback `'Failed to fetch image'` is hardcoded English. The error is caught and logged, but
could surface if error handling is extended.

**Remediation:**  
Add `Summary.shareFetchFailed` to both locale files. Use `t('shareFetchFailed')` as the fallback
string (component already has `useTranslations('Summary')`).

---

## TD-056 · Matchmaker Approaching Component Soft Limit · P3

| | |
|---|---|
| **File** | `src/features/live-session/components/Matchmaker.tsx` |
| **Size** | **175 lines** (soft limit: 200 — 25 lines remaining) |
| **Rule** | AGENTS §4.1 |

**What's wrong:**  
After TD-045 sort extraction and TD-057 position parsing, the component should shrink. If new
features are added without decomposition, it will exceed the 200-line soft limit quickly. The
component renders 4+ sections: draft preview (both teams), action buttons, undo/skip controls,
and end-session footer.

**Remediation:**  
When next touched, extract `DraftTeamPanel.tsx` (reusable for Team A / B preview columns) to keep
the orchestrator under 150 lines.

---

## TD-057 · Residual `as PlayerPosition` Casts in Matchmaker · P3

| | |
|---|---|
| **File** | `src/features/live-session/components/Matchmaker.tsx` L51–52 |
| **Rule** | AGENTS §4.5 — TD-041 residual |

**What's wrong:**  
TD-041 added `parsePlayerPosition` at the service boundary ✅. UI components no longer cast
position strings — except Matchmaker:

```ts
const indexA = sortOrder.indexOf(posA as PlayerPosition);
const indexB = sortOrder.indexOf(posB as PlayerPosition);
```

Position strings from draft records or player profiles may not match `PlayerPosition` at runtime.

**Remediation:**  
Use `parsePlayerPosition(posA) ?? 'Any'` before indexing `POSITION_SORT_ORDER`. Remove both casts.

---

## TD-058 · Dashboard Page Uses Dynamic Imports · P3

| | |
|---|---|
| **File** | `src/app/dashboard/page.tsx` L13–20 |
| **Rule** | AGENTS §3.3 — Conventional import patterns; TD-027 residual |

**What's wrong:**  
The dashboard page uses five dynamic `import('@/lib/services')` and one `import('@/lib/stats')`
call instead of static top-level imports:

```ts
import('@/lib/services').then(s => s.getActiveSession(supabase, user.id))
```

This is unconventional, harder to tree-shake, and obscures the dependency graph. It does not
bypass barrels (imports from `@/lib/services` and `@/lib/stats` correctly), but static imports
are the project convention everywhere else.

**Remediation:**  
Replace with static imports:

```ts
import { getActiveSession, getPlayers, getCompletedMatches, getPastSessions } from '@/lib/services'
import { computeDashboardStats } from '@/lib/stats'
```

---

## TD-059 · Intra-Feature Deep Imports of `../actions` · P3

| | |
|---|---|
| **Rule** | AGENTS §3.2 — Barrel is the public API; TD-028 residual |
| **Files** | See table below |

**What's wrong:**  
Six feature components import Server Actions via relative `../actions` paths instead of the
feature barrel. This is intra-feature (not cross-feature), so it is lower priority than TD-015,
but it bypasses the barrel convention documented in AGENTS.md.

| File | Import |
|---|---|
| `features/roster/components/PlayerForm.tsx` | `../actions` |
| `features/roster/components/PlayerList.tsx` | `../actions` |
| `features/live-session/components/Scoreboard.tsx` | `../actions` |
| `features/live-session/components/Matchmaker.tsx` | `../actions` |
| `features/session/components/SessionHouseRulesForm.tsx` | `../actions` |
| `features/session/components/ActiveSessionCard.tsx` | `../actions` |
| `features/public-join/components/PlayerJoinForm.tsx` | `../actions` |

**Remediation:**  
Ensure each feature's `index.ts` re-exports its actions, then update components to import from
`@/features/<name>`. For split action files (`attendance-actions.ts`), export through the barrel.

---

## Summary Table

| ID | Priority | Category | File(s) | Status |
|---|---|---|---|---|
| TD-043 | P2 | TypeScript | `session/page.tsx` — `players as Player[]` cast | Partial (1 remaining) |
| TD-044 | P2 | i18n | `'Unauthorized'` in 6 action files | Partial |
| TD-045 | P3 | Structure | Matchmaker duplicates sort logic | Partial |
| TD-051 | P2 | i18n | `QrCodeModal/index.tsx` — 5 hardcoded strings | **New** |
| TD-052 | P2 | i18n | Live page `"Room PIN:"` — key exists, unused | **New** |
| TD-053 | P3 | Architecture | Inline domain assembly in live page | **New** |
| TD-054 | P3 | File size | `summary/all/page.tsx` — 136 lines, duplicates leaderboard | **New** |
| TD-055 | P3 | i18n | `ShareButton.tsx` — `'Failed to fetch image'` | **New** |
| TD-056 | P3 | File size | `Matchmaker.tsx` — 175 lines | **New** |
| TD-057 | P3 | TypeScript | Matchmaker `as PlayerPosition` casts | **New** |
| TD-058 | P3 | Structure | Dashboard dynamic imports | **New** |
| TD-059 | P3 | Structure | Intra-feature `../actions` deep imports | **New** |

---

## Audit Statistics

| Metric | Count |
|---|---|
| TD items total (001–050) | 50 |
| Fully resolved | **47** |
| Partially open | **3** (TD-043, TD-044, TD-045) |
| New items (051–059) | **9** |
| Files over any hard limit | **0** |
| `any` type instances | **0** |
| `supabase.from()` outside `lib/services/` | **0** |
| Cross-feature imports | **0** |
| Files importing >10 modules | **0** |

---

## Suggested Resolution Order

1. **TD-043** — Add explicit `Player[]` return type to `getPlayersByHoster`; remove cast
2. **TD-051 / TD-052** — i18n for QrCodeModal and live page PIN label (quick wins)
3. **TD-054** — Reuse `SummaryLeaderboard` on global summary page (also drops page below soft limit)
4. **TD-045 / TD-057** — Extract shared team-ID sort helper; use `parsePlayerPosition`
5. **TD-044** — Structured error codes for auth guards across action files
6. **TD-053** — Extract `getLiveSessionViewData()` service function
7. **TD-055** — Localize ShareButton error fallback
8. **TD-058 / TD-059** — Static imports on dashboard; barrel imports in feature components
9. **TD-056** — Decompose Matchmaker when next touched for a feature
