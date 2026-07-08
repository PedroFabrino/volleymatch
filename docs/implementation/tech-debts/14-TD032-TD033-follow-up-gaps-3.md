# Follow-Up Tech Debts — Post-Implementation Audit #3

**Audited:** 2026-07-08  
**Against:** Current codebase state after TD-025 → TD-031 implementation passes

> These items were **not present** in previous tech-debt documents but were discovered
> during a final cross-check. Each represents a remaining violation of `AGENTS.md`.

> **Status of TD-025 → TD-031:** All resolved ✅
> - TD-025: `features/roster/actions.ts` split correctly ✅
> - TD-026: `types/database.ts` is fully generated and typed ✅
> - TD-027: `app/dashboard/page.tsx` now imports `signOut` from barrel ✅
> - TD-028: Internal roster component imports updated ✅
> - TD-029: i18n hooks properly pass translated strings ✅
> - TD-030: Evaluated OG Image (won't fix, documented Edge constraint) ✅
> - TD-031: `as any` cast removed from `app/dashboard/page.tsx` ✅

---

## TD-032 · Direct Supabase Calls in Pages and Routes · P2

| | |
|---|---|
| **Rule** | AGENTS §7 — `lib/services/` is the only place that calls Supabase |

**What's wrong:**  
Despite previous cleanup (TD-009, TD-010, TD-024) catching `session`, `roster`, and `live` pages, several other pages and route handlers continue to call `supabase.from()` directly, bypassing the service layer completely.

**Instances found:**
- `src/app/dashboard/history/page.tsx`
- `src/app/dashboard/leaderboard/page.tsx`
- `src/app/dashboard/session/page.tsx` (still retains one raw query)
- `src/app/dashboard/summary/[session_id]/page.tsx` (still retains one raw query)
- `src/app/join/[pin]/actions.ts`
- `src/app/join/[pin]/page.tsx`
- `src/app/share/hoster/[hoster_id]/[type]/page.tsx`
- `src/app/share/session/[session_id]/[type]/page.tsx`
- `src/app/view/[pin]/page.tsx`

**Remediation:**  
1. Expand `lib/services/` (e.g., `player.service.ts`, `session.service.ts`, `match.service.ts`) to encompass the queries performed in these files.
2. Refactor the pages and actions to delegate to these service functions.

---

## TD-033 · Residual `as any` Casts for Position Translations · P3

| | |
|---|---|
| **Rule** | AGENTS §4.5 — Do not use TypeScript `any` |

**What's wrong:**  
In multiple UI components, player positions (which are typed as `string`) are cast to `any` when passed to translation hooks (e.g., `tPos(pos as any)`). This defeats type safety and covers up the fact that there isn't a strict `PlayerPosition` type.

**Instances found:**
- `src/components/PlayerRosterRow.tsx`
- `src/features/live-session/components/Matchmaker.tsx`
- `src/features/live-session/components/SwapPositionModal.tsx`
- `src/features/roster/components/AttendanceToggle.tsx`
- `src/features/roster/components/PlayerForm.tsx`
- `src/features/roster/components/PlayerList.tsx`
- `src/features/spectator/components/SpectatorMatchmaker.tsx`
- `src/features/spectator/components/SpectatorQueuePanel.tsx`

**Remediation:**  
1. Introduce a strict type `type PlayerPosition = 'Setter' | 'Outside Hitter' | 'Middle Blocker' | 'Opposite Hitter' | 'Libero' | 'Any'` in `src/types/player.ts` or `types/database.ts`.
2. Update the translation functions (e.g., `tPos`) to accept `PlayerPosition` instead of `any`.
3. Update player definitions or cast safely without `any` where needed.

---

## Summary Table

| ID | Priority | Category | File(s) |
|---|---|---|---|
| TD-032 | P2 | Architecture | Multiple pages/actions still using `supabase.from()` directly |
| TD-033 | P3 | TypeScript | `as any` casts for position strings in `tPos()` / `t()` calls |

---

## Suggested Resolution Order

1. **TD-032** — Wrap remaining raw queries into `lib/services/` to fully secure the data access layer.
2. **TD-033** — Define `PlayerPosition` type and remove the residual `as any` casts.
