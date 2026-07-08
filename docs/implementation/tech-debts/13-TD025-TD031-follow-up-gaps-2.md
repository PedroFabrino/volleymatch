# Follow-Up Tech Debts — Post-Implementation Audit #2

**Audited:** 2026-07-08  
**Against:** Current codebase state after TD-018 → TD-024 implementation passes

> These items were **not present** in any previous tech-debt document but were discovered
> during a fresh pass over the codebase. Each one is a real, actionable violation of `AGENTS.md`.

> **Status of TD-018 → TD-024:** All resolved ✅
> - TD-018: `session/actions.ts` → 96 lines ✅
> - TD-019: `SpectatorScoreboard.tsx` → 232 lines (decomposed) ✅
> - TD-020: `Scoreboard.tsx` → 183 lines ✅
> - TD-021: `features/spectator` → `features/spectator/actions` (no more `app/` import) ✅
> - TD-022: `roster` no longer imports from `session` ✅
> - TD-023: `RosterPanel.tsx` uses `Player[]`; `stat-helpers.ts` uses `PointAttribution` ✅
> - TD-024: `session.service.ts` wraps all 5 live-session queries ✅

---

## TD-025 · File Size — `features/roster/actions.ts` is a God Action File · P1

| | |
|---|---|
| **File** | `src/features/roster/actions.ts` |
| **Size** | 264 lines (hard limit: 200) |
| **Rule** | AGENTS §4.1 — `actions.ts` hard limit is 200 lines |

**What's wrong:**  
`roster/actions.ts` holds 7 distinct exported actions (`addPlayer`, `updatePlayer`, `deletePlayer`,
`toggleAttendance`, `batchToggleAttendance`, `toggleActivePosition`, `setAllAttendance`).
The attendance group (lines 95–263) is a cohesive sub-domain that was previously in
`session/actions.ts` and relocated here when TD-022 was resolved — but the relocation brought
the file 64 lines over its hard limit.

**Remediation:**  
Split into two focused files:

```
features/roster/
├── actions.ts             # Player CRUD: addPlayer, updatePlayer, deletePlayer (~90 lines)
└── attendance-actions.ts  # Attendance management: toggleAttendance, batchToggleAttendance,
                           #   toggleActivePosition, setAllAttendance (~140 lines)
```

Both files re-export via `features/roster/index.ts`.

---

## TD-026 · `types/database.ts` is an `any` Stub · P1

| | |
|---|---|
| **File** | `src/types/database.ts` |
| **Rule** | AGENTS §4.5 — Do not use TypeScript `any` |

**What's wrong:**
```ts
// src/types/database.ts — line 1
export type Database = any;
```

This is a placeholder that was never replaced with the actual generated Supabase type definitions.
Every consumer of `Database` silently inherits an `any` type, defeating type safety across the
entire data access layer.

**Remediation:**  
Generate the real database types using the Supabase CLI:

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

Or, if the remote project is used:

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

Once generated, update `lib/supabase/` clients to wire the `Database` generic type into the
`createClient` factory so all queries become fully typed.

---

## TD-027 · Deep Import — `app/dashboard/page.tsx` Bypasses Barrel · P3

| | |
|---|---|
| **File** | `src/app/dashboard/page.tsx` L5 |
| **Rule** | AGENTS §3.2 — Features must be imported only via their `index.ts` barrel |

**What's wrong:**
```ts
// app/dashboard/page.tsx
import { signOut } from '@/features/dashboard/actions'
```

`signOut` is not exported from `features/dashboard/index.ts`. The page imports directly from the
internal `actions.ts` file, bypassing the barrel — a pattern explicitly prohibited by AGENTS §3.2.

**Remediation:**  
Add the missing re-export to `features/dashboard/index.ts`:

```ts
export { signOut } from './actions'
```

Then update the import in `app/dashboard/page.tsx` to:

```ts
import { DashboardHeader, QuickActionsColumn, PlayerRankingsColumn, RecentMatchesColumn, PastSessionsRow, signOut } from '@/features/dashboard'
```

---

## TD-028 · Intra-Feature Deep Imports — `roster/components/` · P3

| | |
|---|---|
| **Files** | `src/features/roster/components/PlayerForm.tsx` L3, `src/features/roster/components/PlayerList.tsx` L3 |
| **Rule** | AGENTS §3.2 — Import via barrel; never deep-import |

**What's wrong:**
```ts
// PlayerForm.tsx
import { addPlayer, updatePlayer } from '@/features/roster/actions'

// PlayerList.tsx
import { deletePlayer } from '@/features/roster/actions'
```

Components inside `features/roster/` import directly from the sibling `actions.ts` file rather
than going through their own feature's barrel export. While these are intra-feature (not
cross-feature), the deep-import convention still breaks the barrel contract: if `actions.ts`
is ever split (see TD-025), all these call sites must be hunted down manually.

**Remediation:**  
Switch to relative imports (preferred for intra-feature siblings):

```ts
// PlayerForm.tsx
import { addPlayer, updatePlayer } from '../actions'

// PlayerList.tsx
import { deletePlayer } from '../actions'
```

> Note: This is lower priority than TD-025. Resolving TD-025 first will naturally surface
> the files that need updating (the split will require touching these imports anyway).

---

## TD-029 · Hardcoded English Strings — `hooks.ts` and `SpectatorScoreboard.tsx` · P2

| | |
|---|---|
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |

**Instances found:**

| File | Line | Hardcoded string |
|---|---|---|
| `features/live-session/hooks.ts` | 82 | `` `🗳️ Spectators: ${winnerPlayer.name} scored` `` |
| `features/spectator/components/SpectatorScoreboard.tsx` | 151 | `` `Voted for ${playerName} ✓` `` |
| `features/live-session/components/Matchmaker.tsx` | 79 | `title="Back to Dashboard"` (HTML attribute) |

**Remediation:**

- **`hooks.ts` L82**: This string is rendered in a toast. The hook is a pure client-side
  hook (not a component), so it cannot call `useTranslations` directly. Pass the translated
  string template as a parameter to the hook, or accept a `t` translation function as an
  argument. Add key `Scoreboard.spectatorVotedToast` to both `en.json` and `pt.json`.

- **`SpectatorScoreboard.tsx` L151**: Add key `Scoreboard.votedFor` to both locale files
  and use `t('votedFor', { name: playerName })`.

- **`Matchmaker.tsx` L79**: `title` attributes are i18n-sensitive when they appear as
  accessible labels. Add key `Matchmaker.backToDashboard` to both locale files and use
  `title={t('backToDashboard')}`.

---

## TD-030 · Hardcoded English Strings in OG Image Route · P3

| | |
|---|---|
| **File** | `src/app/api/og/summary/route.tsx` |
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |

**What's wrong:**  
The Open Graph image route renders several hardcoded English strings directly into the image:

| Line | String |
|---|---|
| 69 | `"Game Day Recap"` |
| 83 | `` `${mvp.games_played} Games` `` |
| 91 | `"Biggest Gainer"` |
| 101 | `"Generated by VolleyMatch"` |
| 129 | `"Host Stats Summary"` |

**Remediation:**  
OG image routes run on the Edge runtime and cannot use `next-intl` in the traditional way.
Options:

1. **Accept as limitation**: OG images are always in English (acceptable for SEO — these are
   machine-consumed images). Document this as a known exception in `AGENTS.md`.
2. **Locale query param**: Accept `?locale=pt` and manually load locale JSON to look up strings.

> If English-only OG images are acceptable, mark this TD as **Won't Fix** and document the
> decision inline in the route file with a comment.

---

## TD-031 · Residual `as any` Cast in `app/dashboard/page.tsx` · P2

| | |
|---|---|
| **File** | `src/app/dashboard/page.tsx` L38 |
| **Rule** | AGENTS §4.5 — Do not use TypeScript `any` |

**What's wrong:**
```tsx
<PastSessionsRow pastSessions={pastSessions as any} />
```

The `getPastSessions` service returns an untyped result (or a type that doesn't match
`PastSessionsRow`'s expected prop type), and the cast to `any` suppresses the type error
rather than fixing its root cause.

**Remediation:**  
1. Ensure `lib/services/` types the return of `getPastSessions` properly (e.g.,
   `Promise<Session[]>` or a dedicated `PastSession` shape from `src/types/`).
2. Update `PastSessionsRow`'s `Props` type to accept the correct type.
3. Remove the `as any` cast.

This is directly related to TD-026 — once `types/database.ts` is properly generated, many
implicit `any` returns from Supabase queries will be automatically narrowed.

---

## Summary Table

| ID | Priority | Category | File(s) |
|---|---|---|---|
| TD-025 | P1 | File size | `features/roster/actions.ts` — 264 lines |
| TD-026 | P1 | TypeScript | `types/database.ts` exports `Database = any` (stub) |
| TD-027 | P3 | Structure | `app/dashboard/page.tsx` deep-imports `features/dashboard/actions` |
| TD-028 | P3 | Structure | `roster/components/` deep-import `roster/actions` directly |
| TD-029 | P2 | i18n | Hardcoded strings in `hooks.ts`, `SpectatorScoreboard.tsx`, `Matchmaker.tsx` |
| TD-030 | P3 | i18n | Hardcoded English strings in OG image route (Edge runtime) |
| TD-031 | P2 | TypeScript | `as any` cast on `pastSessions` in `app/dashboard/page.tsx` |

---

## Suggested Resolution Order

1. **TD-026** — Generate real Supabase types (structural fix; unblocks many other `any` removals including TD-031)
2. **TD-025** — Split `roster/actions.ts` (P1 size violation; naturally resolves TD-028 as a side-effect)
3. **TD-031** — Remove `as any` cast once TD-026 provides proper types
4. **TD-029** — Fix hardcoded i18n strings in scoreboard hooks and spectator view
5. **TD-027** — Add missing `signOut` re-export to `features/dashboard/index.ts` (trivial, one-liner)
6. **TD-028** — Update internal roster component imports after TD-025 split (follow-on from TD-025)
7. **TD-030** — Decide on OG image i18n strategy; if Won't Fix, document the exception in route file
