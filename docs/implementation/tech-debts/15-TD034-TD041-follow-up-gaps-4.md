# Follow-Up Tech Debts — Post-Implementation Audit #4

**Audited:** 2026-07-08  
**Against:** Current codebase state after TD-032 → TD-033 implementation passes

> These items were **not present** in previous tech-debt documents but were discovered
> during a fresh cross-check of the codebase against `docs/tech-debt.md` and all prior
> follow-up audits. Each represents a remaining violation of `AGENTS.md`.

> **Status of TD-032 → TD-033:** All resolved ✅
> - TD-032: No `supabase.from()` calls remain in `app/` pages or route handlers; all audited pages delegate to `lib/services/` ✅
> - TD-033: `PlayerPosition` type exists in `src/types/player.ts`; all `as any` position casts replaced with `as PlayerPosition` ✅

---

## TD-034 · Direct Supabase Calls in Feature Server Actions · P1

| | |
|---|---|
| **Rule** | AGENTS §7 — `lib/services/` is the **only** place that calls Supabase |
| **Files** | See table below |

**What's wrong:**  
Previous cleanup passes (TD-009, TD-010, TD-024, TD-032) focused on `app/` pages. However,
`AGENTS.md` §7 applies globally — not just to the routing layer. Feature Server Actions and
private helpers still call `supabase.from()` directly, bypassing the service layer entirely.

| File | Lines | `supabase.from()` calls |
|---|---|---|
| `features/live-session/actions.ts` | 124 | 9 |
| `features/live-session/team-actions.ts` | 135 | 8 |
| `features/live-session/_draft.ts` | 161 | 10 |
| `features/roster/attendance-actions.ts` | 175 | 8 |
| `features/roster/actions.ts` | 93 | 3 |
| `features/session/actions.ts` | 96 | 3 |
| `features/spectator/actions.ts` | 52 | 1 |

**Total:** 42 raw Supabase calls across 7 feature-layer files.

**Remediation:**  
1. Expand `lib/services/` with focused functions for each query cluster (match mutations,
   attendance batch updates, MMR history inserts, point attributions, etc.).
2. Refactor feature actions to receive a `supabase` client, call service functions, and handle
   only auth validation + `revalidatePath` orchestration.
3. Move `_draft.ts` background-job queries into a dedicated
   `lib/services/match-processing.service.ts` (or similar) so the private module contains no
   direct Supabase calls either.

---

## TD-035 · Supabase Clients Not Typed with `Database` Generic · P2

| | |
|---|---|
| **Rule** | AGENTS §4.5 — Do not use TypeScript `any`; TD-026 generated real types but did not wire them |
| **Files** | `src/lib/supabase/server.ts`, `client.ts`, `admin.ts`; all of `src/lib/services/` |

**What's wrong:**  
TD-026 replaced the `Database = any` stub with a fully generated `src/types/database.ts`
(529 lines). However, none of the Supabase client factories pass the `Database` generic:

```ts
// lib/supabase/server.ts — untyped client
return createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { ... } }
)
```

All service functions accept `SupabaseClient` (unparameterized) instead of
`SupabaseClient<Database>`. Query results therefore remain loosely typed, forcing downstream
casts like `players as Player[]` in pages and `pos as PlayerPosition` in components.

**Remediation:**  
1. Update all three client factories to use `createServerClient<Database>` /
   `createBrowserClient<Database>` / `createClient<Database>`.
2. Change all `lib/services/*.ts` function signatures to accept `SupabaseClient<Database>`.
3. Remove redundant casts in pages once query return types are inferred from the schema.

---

## TD-036 · Residual `any` in `player.service.ts` · P2

| | |
|---|---|
| **File** | `src/lib/services/player.service.ts` L39 |
| **Rule** | AGENTS §4.5 |

**What's wrong:**
```ts
export async function createPlayer(
  supabase: SupabaseClient,
  playerData: any   // ❌
)
```

The `createPlayer` service accepts an untyped insert payload. Callers (e.g.,
`app/join/[pin]/actions.ts`) pass inline objects with no compile-time validation against the
`players` table schema.

**Remediation:**  
Once TD-035 wires the `Database` generic, replace `playerData: any` with
`Database['public']['Tables']['players']['Insert']`. Alternatively, define a
`CreatePlayerInput` type in `src/types/player.ts` and use that at the service boundary.

---

## TD-037 · Hardcoded English Strings — Dashboard & Summary UI · P2

| | |
|---|---|
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |

**Instances found:**

| File | Line(s) | Hardcoded string |
|---|---|---|
| `features/dashboard/components/RecentMatchesColumn.tsx` | 21, 48, 54 | `'Unknown'`, `"Red Team"`, `"Blue Team"` |
| `features/summary/components/ShareButton.tsx` | 25–26, 54 | `'VolleyMatch Recap'`, `'Check out our Game Day Recap!'`, `'Share Recap'` fallback |
| `features/live-session/components/Matchmaker.tsx` | 41 | `'Unknown'` in `getPlayerName` fallback |
| `app/dashboard/history/page.tsx` | 26 | `'Unknown'` in `getPlayerName` fallback |
| `app/view/[pin]/page.tsx` | 86–87 | `"VolleyMatch Live"`, `"PIN:"` header text |
| `app/join/[pin]/page.tsx` | 25–26 | `"VolleyMatch"`, `"Join Session"` header text |
| `features/public-join/components/JoinSessionForm.tsx` | 26–27 | `"Room PIN"` label |

**Remediation:**  
Add keys to both `locales/en.json` and `locales/pt.json` under the relevant namespaces
(`Dashboard.redTeam`, `Dashboard.blueTeam`, `Common.unknownPlayer`, `Summary.shareTitle`,
`Summary.shareText`, `PublicJoin.*`, `Spectator.*`, etc.) and replace all hardcoded strings
with `t(...)` calls.

---

## TD-038 · Join Flow UI & Actions Still in `app/join/` · P2

| | |
|---|---|
| **Files** | `src/app/join/[pin]/PlayerJoinForm.tsx` (161 lines), `src/app/join/[pin]/actions.ts` |
| **Rule** | AGENTS §3.1 — Pages are thin orchestrators; feature UI lives in `features/` |

**What's wrong:**  
`AGENTS.md` folder structure specifies a `features/public-join/` slice for the public-facing
player join flow. A `JoinSessionForm` exists in that feature, but it is a different component
(PIN entry on the landing page). The actual session join form (`PlayerJoinForm`) and its
Server Action (`joinSessionAction`) remain in the routing layer.

`PlayerJoinForm.tsx` also contains **20+ hardcoded English strings** with no `next-intl` usage
whatsoever (e.g., `"Who are you?"`, `"Your Name"`, `"JOIN GAME"`, `"Joining..."`, tier labels,
validation error messages).

**Remediation:**  
1. Move `PlayerJoinForm.tsx` → `features/public-join/components/PlayerJoinForm.tsx`.
2. Move `joinSessionAction` → `features/public-join/actions.ts` and export via barrel.
3. Reduce `app/join/[pin]/page.tsx` to data fetching + `<PlayerJoinForm />` assembly.
4. Add a `PublicJoin` i18n namespace and wire all user-facing strings through `next-intl`.

---

## TD-039 · Page Size — Share & Summary Pages Exceed Hard Limit · P2

| | |
|---|---|
| **Rule** | AGENTS §4.1 — `page.tsx` hard limit is 150 lines |

**Instances found:**

| File | Lines | Over by |
|---|---|---|
| `app/share/hoster/[hoster_id]/[type]/page.tsx` | 170 | 20 |
| `app/share/session/[session_id]/[type]/page.tsx` | 170 | 20 |
| `app/dashboard/summary/[session_id]/page.tsx` | 158 | 8 |

**What's wrong:**  
All three pages render highlight-card markup inline (nearly identical layout between the two
share pages). The summary page also inlines the full leaderboard table with badge logic.

**Remediation:**  
- Extract a shared `ShareHighlightCard` component into `features/summary/components/`.
- Extract the leaderboard table from the summary page into
  `features/summary/components/SummaryLeaderboard.tsx`.
- Reduce each page to auth/data-fetch + component assembly.

---

## TD-040 · God File Import Count — Scoreboard Orchestrators · P3

| | |
|---|---|
| **Rule** | AGENTS §4.6 — No file should import from more than 10 modules |
| **Files** | `features/live-session/components/Scoreboard.tsx`, `features/spectator/components/SpectatorScoreboard.tsx` |

**What's wrong:**  
Both orchestrator components import from **13 modules** each — 3 over the hard limit. This
indicates the orchestrators still carry too many direct sub-component dependencies.

**Remediation:**  
Group related sub-components behind a single barrel or intermediate wrapper (e.g.,
`ScoreboardModals.tsx` re-exporting Substitution/Swap/MatchOver modals) to reduce the import
count in the top-level orchestrator below 10.

---

## TD-041 · Unsafe `as PlayerPosition` Casts at UI Boundary · P3

| | |
|---|---|
| **Rule** | AGENTS §4.5 — Type safety; partial fix from TD-033 |
| **Files** | 8 components (see TD-033 original list) |

**What's wrong:**  
TD-033 replaced `as any` with `as PlayerPosition`, but the underlying data still arrives as
untyped `string` from Supabase JSON columns (`positions`, `active_positions`,
`team_a_positions`). The cast suppresses the mismatch rather than validating at the boundary.

**Instances:**  
`PlayerRosterRow.tsx`, `Matchmaker.tsx`, `SwapPositionModal.tsx`, `AttendanceToggle.tsx`,
`PlayerForm.tsx`, `PlayerList.tsx`, `SpectatorMatchmaker.tsx`, `SpectatorQueuePanel.tsx`.

**Remediation:**  
1. Resolve TD-035 first so Supabase returns typed column data.
2. Add a `parsePlayerPosition(value: string): PlayerPosition | null` guard in
   `src/types/player.ts` (or `src/utils/`) and use it at the service layer when mapping DB rows
   to domain types.
3. Remove all `as PlayerPosition` casts from UI components once props are correctly typed.

---

## Summary Table

| ID | Priority | Category | File(s) |
|---|---|---|---|
| TD-034 | P1 | Architecture | 42 direct `supabase.from()` calls in 7 feature action files |
| TD-035 | P2 | TypeScript | Supabase clients and services not wired with `Database` generic |
| TD-036 | P2 | TypeScript | `playerData: any` in `player.service.ts` |
| TD-037 | P2 | i18n | Hardcoded strings in dashboard, summary, and history components |
| TD-038 | P2 | Architecture + i18n | Join form and action still in `app/join/`; no i18n |
| TD-039 | P2 | File size | 3 pages exceed 150-line hard limit |
| TD-040 | P3 | Structure | Scoreboard orchestrators import 13 modules (>10 limit) |
| TD-041 | P3 | TypeScript | Residual `as PlayerPosition` casts on untyped DB strings |

---

## Suggested Resolution Order

1. **TD-034** — Move feature-layer Supabase calls into `lib/services/` (closes the last major data-access gap)
2. **TD-035** — Wire `Database` generic into client factories and service signatures (structural typing fix)
3. **TD-036** — Replace `playerData: any` once TD-035 provides table Insert types
4. **TD-038** — Relocate join flow to `features/public-join/` and add i18n (self-contained slice)
5. **TD-037** — Fix remaining hardcoded strings in dashboard/summary/history components
6. **TD-039** — Extract share highlight and summary leaderboard components to reduce page sizes
7. **TD-041** — Add position parsing at service boundary; remove UI casts (depends on TD-035)
8. **TD-040** — Group sub-component imports to bring orchestrators under 10 modules
