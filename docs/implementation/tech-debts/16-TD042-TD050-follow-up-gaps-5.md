# Follow-Up Tech Debts — Post-Implementation Audit #5

**Audited:** 2026-07-08  
**Against:** Current codebase state after TD-034 → TD-041 implementation passes, cross-checked against `docs/tech-debt.md` and all prior follow-up audits

> These items were **not present** in previous tech-debt documents but were discovered
> during a fresh cross-check of the codebase against `AGENTS.md`.

> **Status of original register (TD-001 → TD-017):** All resolved ✅  
> **Status of follow-up audits (TD-018 → TD-041):** All resolved ✅
> - TD-034: All `supabase.from()` calls now live exclusively in `lib/services/` ✅
> - TD-035: All three Supabase client factories use `create*Client<Database>` ✅
> - TD-036: `createPlayer` accepts `CreatePlayerInput`, not `any` ✅
> - TD-037: Dashboard, summary, spectator, and join UI strings routed through `next-intl` ✅
> - TD-038: `PlayerJoinForm` and `joinSessionAction` relocated to `features/public-join/` ✅
> - TD-039: Share and summary pages reduced below the 150-line hard limit ✅
> - TD-040: `ScoreboardModals.tsx` groups modal imports; orchestrators import ≤ 10 modules ✅
> - TD-041: `parsePlayerPosition` / `parsePlayerPositions` used at service boundary; no UI `as PlayerPosition` casts ✅

---

## TD-042 · SpectatorScoreboard Lacks Hook Extraction · P2

| | |
|---|---|
| **File** | `src/features/spectator/components/SpectatorScoreboard.tsx` |
| **Size** | 201 lines |
| **Rule** | AGENTS §4.2 — Extract stateful logic into hooks; mirror TD-020 pattern |

**What's wrong:**  
`Scoreboard.tsx` was reduced to a 164-line orchestrator by extracting `useScoreboard` into
`features/live-session/hooks.ts`. `SpectatorScoreboard.tsx` still inlines ~130 lines of stateful
logic — timer, accordion state, voting lifecycle, realtime vote aggregation, localStorage voter
token, and team-player resolution — directly in the component body.

**Remediation:**  
Extract a `useSpectatorScoreboard` hook in `features/spectator/hooks.ts`:

```
features/spectator/
├── hooks.ts                        # useSpectatorScoreboard (timer, voting, toast)
└── components/
    └── SpectatorScoreboard.tsx     # Orchestrator only (~80 lines)
```

Reuse shared helpers where possible (e.g., team-player resolution mirrors `useScoreboard`).

---

## TD-043 · Service Return Types Force Unsafe Casts at Consumers · P2

| | |
|---|---|
| **Rule** | AGENTS §4.5 — Do not use TypeScript `any`; avoid suppressing type errors with casts |
| **Files** | See table below |

**What's wrong:**  
TD-035 wired the `Database` generic, but several service functions still return shapes that do
not match what consumers expect, forcing unsafe casts at the page/component boundary.

| File | Line | Cast | Root cause |
|---|---|---|---|
| `app/dashboard/page.tsx` | 22 | `players as Player[]` | `getPlayers()` selects only `{ id, name, mmr }` but `computeDashboardStats` expects `Player[]` |
| `app/dashboard/history/page.tsx` | 91 | `(match.match_events ?? []) as MatchEvent[]` | `getCompletedMatchesWithEvents()` returns raw Supabase rows without mapping nested events |
| `features/live-session/hooks.ts` | 170–171 | `.filter(Boolean) as Player[]` | `players.find()` returns `(Player \| undefined)[]`; no type guard narrows |
| `features/spectator/components/SpectatorScoreboard.tsx` | 173–174 | `.filter(Boolean) as PlayerWithStatus[]` | Same pattern as above |

**Remediation:**  
1. Define narrow DTO types (e.g., `DashboardPlayer`, `MatchWithEvents`) in `src/types/`.
2. Update service return signatures to match (`getPlayers` → `DashboardPlayer[]`, or rename to
   `getDashboardPlayers`).
3. Map `match_events` through a typed mapper in `lib/services/mappers.ts` (similar to
   `mapMatchRow`).
4. Replace `filter(Boolean) as T[]` with a type guard: `.filter((p): p is Player => p !== undefined)`.

---

## TD-044 · Hardcoded English in Server Action Error Messages · P2

| | |
|---|---|
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |
| **Files** | `features/public-join/actions.ts`, potentially other action files |

**What's wrong:**  
Server Actions throw hardcoded English strings that may surface to the user via error boundaries
or client-side catch blocks:

```ts
// features/public-join/actions.ts
throw new Error('Invalid session.')
throw new Error('A player with this name already exists. Please choose a different name or select your profile.')
throw new Error('Failed to create your profile.')
```

**Remediation:**  
Return structured error codes from server actions (e.g., `{ error: 'duplicateName' }`) and
translate them on the client with `useTranslations('PublicJoin')`. Alternatively, use
`getTranslations` inside the server action (supported in `next-intl` v4 for Server Actions).

---

## TD-045 · Duplicated Domain Constants · P3

| | |
|---|---|
| **Rule** | AGENTS §5 — Single source of truth for domain values |
| **Files** | See table below |

**What's wrong:**  
Player position ordering and tier values are defined independently in multiple places, creating
drift risk when positions or tiers change.

| Constant | Defined in |
|---|---|
| Position sort order | `utils/sortPlayersByPos.ts` (`POSITION_ORDER`), `features/live-session/components/Matchmaker.tsx` (`sortOrder`) |
| Selectable positions | `app/dashboard/roster/page.tsx` (`availablePositions`), `features/public-join/components/PlayerJoinForm.tsx` (`ALL_POSITIONS`) |
| Tier → MMR mapping | `features/roster/actions.ts`, `features/public-join/actions.ts` (inline `'Beginner' \| 'Intermediate' \| 'Advanced'`) |

**Remediation:**  
Centralize in `src/types/player.ts`:

```ts
export const SELECTABLE_POSITIONS: PlayerPosition[] = [...]
export const POSITION_SORT_ORDER: PlayerPosition[] = [...]
export type PlayerTier = 'Beginner' | 'Intermediate' | 'Advanced'
export const TIER_MMR: Record<PlayerTier, number> = { Beginner: 800, Intermediate: 1000, Advanced: 1200 }
```

Import from the shared module everywhere; remove local duplicates.

---

## TD-046 · HighlightsGrid Approaching Component Hard Limit · P3

| | |
|---|---|
| **File** | `src/features/summary/components/HighlightsGrid.tsx` |
| **Size** | 253 lines (soft limit: 200, hard limit: 300) |
| **Rule** | AGENTS §4.1, §4.2 |

**What's wrong:**  
The component renders 4+ distinct visual sections — highlight cards, detail modal, share/copy
controls, and per-highlight content panels — in a single 253-line file. It is 53 lines over the
soft limit and approaching the 300-line hard limit.

**Remediation:**  
Extract sub-components within `features/summary/components/`:

```
HighlightCard.tsx          # Individual highlight card (MVP, comeback, blowout, top scorer)
HighlightDetailModal.tsx   # Full-screen detail overlay with share/copy
HighlightsGrid.tsx         # Orchestrator only (~100 lines)
```

Also remove unnecessary `fallback` params from `t()` calls (see TD-049).

---

## TD-047 · lib/services Files Approaching Soft Limit · P3

| | |
|---|---|
| **Rule** | AGENTS §4.1 — `lib/**/*.ts` soft limit is 250 lines |
| **Files** | `lib/services/match.service.ts` (223), `lib/services/session.service.ts` (212) |

**What's wrong:**  
Both service files aggregate many unrelated query/mutation clusters. `match.service.ts` alone
exports 15+ functions spanning reads, inserts, updates, and event/attribution writes.

**Remediation:**  
When next touched, split along read/write boundaries:

```
lib/services/
├── match-read.service.ts      # getCompletedMatches, getActiveMatchForSession, etc.
├── match-write.service.ts     # insertMatch, updateMatchScore, insertPointAttribution, etc.
├── session-read.service.ts    # getSessionByPin, getLiveSessionData, etc.
└── session-write.service.ts   # createSession, endSession, storeSummaryData, etc.
```

Re-export via `lib/services/index.ts` to avoid breaking consumers.

---

## TD-048 · Spectator Page Inline Business Logic · P3

| | |
|---|---|
| **File** | `src/app/view/[pin]/page.tsx` L50–79 |
| **Rule** | AGENTS §3.1 — Pages are thin orchestrators |

**What's wrong:**  
The spectator page performs non-trivial domain assembly inline:

- Merging `rawPlayers` with `sessionPlayers` to attach `games_played_today`
- Deriving `lastWinners` / `lastLosers` from active or last-completed match
- Sorting players by draft priority and calling `previewNextDraft`

The page is 88 lines (within the limit), but the logic belongs in `lib/` or `lib/services/`.

**Remediation:**  
Add a `getSpectatorViewData(supabase, pin)` service function that returns
`{ session, activeMatch, playersWithStatus }` as a typed composite. The page becomes fetch +
`<SpectatorScoreboard />` / `<SpectatorMatchmaker />` assembly.

---

## TD-049 · i18n Fallback Anti-Pattern in HighlightsGrid · P3

| | |
|---|---|
| **File** | `src/features/summary/components/HighlightsGrid.tsx` L132, 135, 177, 241, 246, 248 |
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |

**What's wrong:**  
Several `t()` calls pass hardcoded English `fallback` values even though the keys already exist
in both `locales/en.json` and `locales/pt.json`:

```tsx
{t('topScorer', { fallback: 'Top Scorer' })}
{t('offensiveMachine', { fallback: 'Offensive Machine' })}
{t('pointsScored', { fallback: 'Points Scored' })}
```

The fallbacks re-introduce hardcoded English and suggest the keys might be missing (they are not).

**Remediation:**  
Remove all `fallback` params. Use plain `t('topScorer')`, `t('offensiveMachine')`, etc.

---

## TD-050 · Root Layout Metadata Not i18n · P3

| | |
|---|---|
| **File** | `src/app/layout.tsx` L16–18 |
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |

**What's wrong:**
```ts
export const metadata: Metadata = {
  title: "VolleyMatch",
  description: "Volleyball matchmaking and scorekeeping app",
};
```

Page title and description are hardcoded English. These appear in browser tabs, bookmarks, and
search engine results for all locales.

**Remediation:**  
Use Next.js `generateMetadata` with `getTranslations('Metadata')` (or the equivalent API for
this Next.js version — check `node_modules/next/dist/docs/`). Add `Metadata.title` and
`Metadata.description` keys to both locale files.

---

## Summary Table

| ID | Priority | Category | File(s) |
|---|---|---|---|
| TD-042 | P2 | Structure | `SpectatorScoreboard.tsx` — inline state logic, no hook extraction |
| TD-043 | P2 | TypeScript | Unsafe casts at service consumer boundaries |
| TD-044 | P2 | i18n | Hardcoded English in server action error messages |
| TD-045 | P3 | Structure | Duplicated position/tier constants across 5+ files |
| TD-046 | P3 | File size | `HighlightsGrid.tsx` — 253 lines |
| TD-047 | P3 | File size | `match.service.ts`, `session.service.ts` approaching soft limit |
| TD-048 | P3 | Architecture | Business logic inline in `view/[pin]/page.tsx` |
| TD-049 | P3 | i18n | Unnecessary English `fallback` params in `HighlightsGrid.tsx` |
| TD-050 | P3 | i18n | Hardcoded metadata in `app/layout.tsx` |

---

## Suggested Resolution Order

1. **TD-043** — Fix service return types to eliminate unsafe casts (structural typing fix)
2. **TD-042** — Extract `useSpectatorScoreboard` hook (mirrors completed TD-020 work)
3. **TD-044** — Return error codes from server actions; translate on client
4. **TD-045** — Centralize position/tier constants in `types/player.ts`
5. **TD-046** — Decompose `HighlightsGrid.tsx` (also resolves TD-049 as a side-effect)
6. **TD-048** — Extract `getSpectatorViewData` service function
7. **TD-047** — Split service files when next touched for a feature
8. **TD-050** — Localize root layout metadata
