# Follow-Up Tech Debts — Post-Implementation Audit #7

**Audited:** 2026-07-08  
**Against:** Current codebase cross-checked against `docs/tech-debt.md`, all prior follow-up audits (`01`–`17`), and `AGENTS.md`

> These items were discovered during a fresh audit after the TD-043 → TD-059 pass.
> Audit #6 (`17-TD043-TD059-follow-up-gaps-6.md`) is now **fully resolved** — see status
> table below.

> **Status of original register (TD-001 → TD-017):** All resolved ✅  
> **Status of follow-up audits (TD-018 → TD-041):** All resolved ✅  
> **Status of audit #5 (TD-042 → TD-050):** All resolved ✅  
> **Status of audit #6 (TD-043 → TD-059):** All resolved ✅

---

## Audit #6 Closure (TD-043 → TD-059)

| ID | Was (audit #6) | Now |
|---|---|---|
| TD-043 | `players as Player[]` cast in session page | ✅ `getPlayersByHoster(): Promise<Player[]>`; no cast |
| TD-044 | `'Unauthorized'` strings in action files | ✅ `ActionError` + `assertAuthenticated()` |
| TD-045 | Matchmaker duplicates position sort | ✅ `sortTeamIdsByPos` in `utils/sortPlayersByPos.ts`; `DraftTeamPanel` extracted |
| TD-051 | QrCodeModal hardcoded English | ✅ `useTranslations('QrCode')` |
| TD-052 | Live page `"Room PIN:"` hardcoded | ✅ `LiveSessionPinBar` uses `PublicJoin.roomPin` |
| TD-053 | Inline domain assembly on live page | ✅ `getLiveSessionViewData()` in `lib/services/`; page **37 lines** |
| TD-054 | Global summary duplicates leaderboard | ✅ Reuses `SummaryLeaderboard`; page **86 lines** |
| TD-055 | ShareButton hardcoded error fallback | ✅ Uses `t('shareFetchFailed')` |
| TD-056 | Matchmaker approaching soft limit | ✅ **131 lines** after `DraftTeamPanel` extraction |
| TD-057 | `as PlayerPosition` casts in Matchmaker | ✅ Removed; only cast remains in `parsePlayerPosition` guard |
| TD-058 | Dashboard dynamic imports | ✅ Static imports from `@/lib/services` and `@/lib/stats` |
| TD-059 | Intra-feature `../actions` deep imports | ✅ Components import via `@/features/<name>` barrels |

---

## TD-060 · Hardcoded English on Landing Page · P2

| | |
|---|---|
| **File** | `src/app/page.tsx` L25–47 |
| **Rule** | AGENTS §6 — All user-facing strings must use `next-intl` |

**What's wrong:**  
The public landing page has no i18n. Four user-facing strings are hardcoded:

```tsx
<h1>VolleyMatch</h1>
<p>Join a live session to view the scoreboard and queue, or login to host your own.</p>
<div>or</div>
<Link>Login as Host</Link>
```

`JoinSessionForm` (from `features/public-join`) is already localized; the page wrapper is not.

**Remediation:**  
Add a `Home` namespace to both locale files. Use `getTranslations('Home')` in the server page.
Reuse `Metadata.title` or add `Home.brandName` for the product name. Reuse `Login.or` for the
divider if appropriate.

---

## TD-061 · Residual Hardcoded English on Login Page · P3

| | |
|---|---|
| **File** | `src/app/login/page.tsx` L14, 22 |
| **Rule** | AGENTS §6 |

**What's wrong:**  
Most of the login form uses `getTranslations('Login')`, but two strings remain hardcoded:

- `"Back"` on the return link (L14)
- `"VolleyMatch"` in the heading (L22) — `Metadata.title` key already exists in both locales

**Remediation:**  
Add `Login.back` (or reuse a shared `Common.back` key). Replace the heading with
`getTranslations('Metadata')` → `t('title')`.

---

## TD-062 · Matchmaker Ignores Existing i18n Key · P3

| | |
|---|---|
| **File** | `src/features/live-session/components/Matchmaker.tsx` L57 |
| **Rule** | AGENTS §6 |

**What's wrong:**  
The loading state renders hardcoded English:

```tsx
<p className="text-gray-400 text-sm">Calculating next match...</p>
```

The locale key `Matchmaker.preparingDraft` (`"Preparing draft..."` / `"Preparando draft..."`)
already exists in both `en.json` and `pt.json` but is unused.

**Remediation:**  
Replace with `{t('preparingDraft')}`. No new locale keys required.

---

## TD-063 · Direct Supabase Query in Layout Component · P2

| | |
|---|---|
| **File** | `src/components/layout/ActiveSessionBanner.tsx` L16–21 |
| **Rule** | AGENTS §7 — `lib/services/` is the only place that calls Supabase |

**What's wrong:**  
The dashboard banner queries Supabase directly:

```ts
const { data: activeSession } = await supabase
  .from('sessions')
  .select('id, pin')
  .eq('hoster_id', user.id)
  .eq('is_active', true)
  .maybeSingle()
```

This bypasses the service layer. TD-034 closed all feature-action violations, but this layout
component was not in scope.

**Remediation:**  
Reuse `getActiveSession(supabase, user.id)` from `lib/services/session-read.service.ts` (already
used by the dashboard page). Pass `user.id` from the parent layout or fetch inside the banner via
the existing service function.

---

## TD-064 · Missing Auth Guards on Mutating Server Actions · P2

| | |
|---|---|
| **Rule** | AGENTS §4.3 — Always validate auth at the top of every action |
| **Files** | See table below |

**What's wrong:**  
TD-044 introduced `assertAuthenticated()` for most actions, but three mutating actions still
perform database writes without an auth check:

| File | Function | Auth check |
|---|---|---|
| `features/live-session/actions.ts` | `updateScore` | ❌ None |
| `features/live-session/actions.ts` | `cancelMatch` | ❌ None |
| `features/live-session/team-actions.ts` | `substitutePlayer` | ❌ None |

`swapPositions` and `swapTeams` in the same `team-actions.ts` file **do** call
`assertAuthenticated(user)` — the omission in `substitutePlayer` is inconsistent.

**Remediation:**  
Add `getUser()` + `assertAuthenticated(user)` at the top of each function, matching the pattern
in `saveMatch` and `swapTeams`.

---

## TD-065 · ActionError Codes Not Translated on Client · P3

| | |
|---|---|
| **Files** | `src/types/action-error.ts`, `src/locales/en.json` (`Errors` namespace) |
| **Rule** | AGENTS §6 — User-facing error strings must use `next-intl` |

**What's wrong:**  
TD-044 replaced `'Unauthorized'` throws with `ActionError('unauthorized')` ✅. The `Errors`
namespace exists in both locale files (`unauthorized`, `saveMatchFailed`) ✅. However, no client
component or error boundary translates `ActionError.code` via `useTranslations('Errors')`. Thrown
codes surface as raw strings if caught and displayed.

**Remediation:**  
Add a small client helper (e.g., `getActionErrorMessage(error, t)`) that maps `ActionErrorCode`
to `t('unauthorized')` / `t('saveMatchFailed')`. Use it in any `catch` block that surfaces errors
to the user.

---

## TD-066 · HighlightDetailModal Exceeds Component Soft Limit · P3

| | |
|---|---|
| **File** | `src/features/summary/components/HighlightDetailModal.tsx` |
| **Size** | **212 lines** (soft limit: 200, hard limit: 300) |
| **Rule** | AGENTS §4.1 |

**What's wrong:**  
TD-046 decomposed `HighlightsGrid` (now **162 lines** ✅) and extracted `HighlightCard`, but the
detail modal still renders four highlight variants (MVP, comeback, blowout, top scorer) with
share/copy controls in a single 212-line file — 12 lines over the soft limit.

**Remediation:**  
Extract per-variant content panels:

```
HighlightMvpPanel.tsx
HighlightComebackPanel.tsx
HighlightBlowoutPanel.tsx
HighlightTopScorerPanel.tsx
HighlightDetailModal.tsx   # Shell + share/copy controls (~80 lines)
```

---

## TD-067 · lib/mmr/index.ts Approaching Soft Limit · P3

| | |
|---|---|
| **File** | `src/lib/mmr/index.ts` |
| **Size** | **210 lines** (soft limit: 250 for `lib/**/*.ts`) |
| **Rule** | AGENTS §4.1, §4.6 |

**What's wrong:**  
MMR calculation logic (Elo-style updates, setter compensation, history aggregation) lives in a
single file with 40 lines of headroom before the soft limit. Same pattern as pre-split
`lib/matchmaking/index.ts` (TD-004).

**Remediation:**  
When next touched, split along concerns:

```
lib/mmr/
├── types.ts           # MmrChange, history record types
├── calculation.ts     # Core Elo delta functions
├── setter-bonus.ts    # Setter compensation logic
└── index.ts           # Barrel re-export
```

---

## TD-068 · Hardcoded Product Branding on Public Pages · P3

| | |
|---|---|
| **Rule** | AGENTS §6 |
| **Files** | See table below |

**What's wrong:**  
`Metadata.title` is localized via `generateMetadata()` ✅, but several pages still hardcode
`"VolleyMatch"` in JSX:

| File | Line | Context |
|---|---|---|
| `app/page.tsx` | 25 | Landing heading |
| `app/login/page.tsx` | 22 | Login heading |
| `app/share/session/[session_id]/[type]/page.tsx` | 35 | Share page header |
| `app/share/hoster/[hoster_id]/[type]/page.tsx` | 32 | Share page header |
| `components/layout/ActiveSessionBanner.tsx` | 32 | Fallback when no active session |

**Remediation:**  
Use `getTranslations('Metadata')` → `t('title')` on server pages. For client-only contexts,
pass the brand name as a prop or use `useTranslations('Metadata')`.

---

## TD-069 · LanguageSwitcher Hardcoded Labels · P3

| | |
|---|---|
| **File** | `src/components/layout/LanguageSwitcher.tsx` L22, 33, 39 |
| **Rule** | AGENTS §6 |

**What's wrong:**  
Three user-facing strings are hardcoded:

- `aria-label="Change language"`
- Menu option `"English"`
- Menu option `"Português"`

`Common.theme` exists for the theme toggle label, but no equivalent keys exist for language
switching.

**Remediation:**  
Add `Common.changeLanguage`, `Common.english`, and `Common.portuguese` to both locale files.
Convert to `useTranslations('Common')`. Reuse the same pattern for `ThemeToggle` L23
(`aria-label="Toggle theme"` → `t('theme')`, key already exists).

---

## TD-070 · Position Record Casts in team-actions.ts · P3

| | |
|---|---|
| **File** | `src/features/live-session/team-actions.ts` L25–26, 73–74, 111–112 |
| **Rule** | AGENTS §4.5 — TD-041 residual at action layer |

**What's wrong:**  
TD-041 added `parsePlayerPosition` at the service boundary and removed UI casts ✅. Server actions
still cast JSON position columns:

```ts
(match.team_a_positions as Record<string, string>) || {}
```

Supabase returns `Json` for these columns; the cast suppresses the mismatch rather than mapping
through the existing `mapMatchRow` / position parser in `lib/services/mappers.ts`.

**Remediation:**  
Add a `parsePositionRecord(value: Json): Record<string, PlayerPosition>` helper in
`lib/services/mappers.ts` (or reuse an existing mapper). Use it in `team-actions.ts` and
`_draft.ts` instead of inline casts.

---

## TD-071 · Generated database.ts Exceeds File Size Limit · P3

| | |
|---|---|
| **File** | `src/types/database.ts` |
| **Size** | **519 lines** (hard limit for generic files: 300) |
| **Rule** | AGENTS §4.1 |

**What's wrong:**  
TD-026 replaced the `Database = any` stub with a fully generated Supabase schema type file ✅.
The generated artifact exceeds the AGENTS §4.1 hard limit. Manual splitting would be overwritten
on the next `supabase gen types` run.

**Remediation:**  
Document a project exception in `AGENTS.md` or a `types/README` note: generated Supabase types
are exempt from file-size limits. Do **not** hand-split this file.

---

## TD-072 · OG Image Route — Documented Exception (No Action) · P3

| | |
|---|---|
| **File** | `src/app/api/og/summary/route.tsx` |
| **Rule** | AGENTS §7 (direct Supabase), §6 (hardcoded English) |
| **Status** | **Won't Fix** — documented as TD-030 |

**What's wrong:**  
The OG image route still calls `supabase.from('sessions')` directly and renders hardcoded English
(`"VolleyMatch"`, `"Host Stats Summary"`). Both violate AGENTS §6 and §7.

**Remediation:**  
No code change required. TD-030 already documents the Edge-runtime / i18n constraint. Keep the
inline comment in the route file. Re-evaluate only if `next-intl` adds Edge-compatible OG support.

---

## Summary Table

| ID | Priority | Category | File(s) | Status |
|---|---|---|---|---|
| TD-060 | P2 | i18n | `app/page.tsx` — landing page strings | **New** |
| TD-061 | P3 | i18n | `app/login/page.tsx` — "Back", brand name | **New** |
| TD-062 | P3 | i18n | `Matchmaker.tsx` — ignores `preparingDraft` key | **New** |
| TD-063 | P2 | Architecture | `ActiveSessionBanner.tsx` — direct Supabase query | **New** |
| TD-064 | P2 | Security | Missing auth on 3 mutating actions | **New** |
| TD-065 | P3 | i18n | ActionError codes not translated on client | **New** |
| TD-066 | P3 | File size | `HighlightDetailModal.tsx` — 212 lines | **New** |
| TD-067 | P3 | File size | `lib/mmr/index.ts` — 210 lines | **New** |
| TD-068 | P3 | i18n | Hardcoded `"VolleyMatch"` on 5 pages/components | **New** |
| TD-069 | P3 | i18n | `LanguageSwitcher.tsx` + `ThemeToggle` aria-labels | **New** |
| TD-070 | P3 | TypeScript | `team-actions.ts` position record casts | **New** |
| TD-071 | P3 | Structure | `types/database.ts` — 519 lines (generated) | **New** |
| TD-072 | P3 | Architecture | OG route exception (TD-030 carry-forward) | Won't Fix |

---

## Audit Statistics

| Metric | Count |
|---|---|
| TD items total (001–072) | 72 |
| Fully resolved (001–059) | **59** |
| Won't Fix (072, inherits TD-030) | **1** |
| New open items (060–071) | **12** |
| Files over any hard limit | **0** (excluding generated `database.ts`) |
| `any` type instances | **0** |
| `supabase.from()` outside `lib/services/` + documented OG exception | **1** (`ActiveSessionBanner`) |
| Cross-feature imports | **0** |
| Files importing >10 modules | **0** |

---

## Suggested Resolution Order

1. **TD-064** — Add missing auth guards (security, quick fix)
2. **TD-063** — Route ActiveSessionBanner through `getActiveSession()` service
3. **TD-062** — Wire existing `preparingDraft` key (one-line fix)
4. **TD-060 / TD-061 / TD-068** — Localize landing, login, and share-page branding
5. **TD-069** — Localize language switcher and theme toggle aria-labels
6. **TD-065** — Client-side ActionError translation helper
7. **TD-070** — Position record parser at action/mapper layer
8. **TD-066** — Decompose HighlightDetailModal when next touched for summary work
9. **TD-067** — Split `lib/mmr/` when next touched for MMR features
10. **TD-071** — Document generated-type file-size exception in AGENTS.md
