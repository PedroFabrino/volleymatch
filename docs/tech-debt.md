# VolleyMatch — Tech Debt Register

**Last audited:** 2026-07-08  
**Audited against:** `AGENTS.md` architecture guide  
**Current phase:** Phase 3 complete — TD-067 deferred (split `lib/mmr/` when next touched)

> Items are scored **P1 (blocking/risky)**, **P2 (significant)**, or **P3 (minor/cosmetic)**.  
> Detailed implementation notes live in [`docs/implementation/tech-debts/`](implementation/tech-debts/).

---

## Current Status Snapshot

| Metric | Value |
|---|---|
| Total TD items tracked | **72** (TD-001 → TD-072) |
| Fully resolved | **69** |
| Deferred | **1** (TD-067) |
| Won't Fix (documented exception) | **1** (TD-072, inherits TD-030) |
| Open | **0** |
| Files over any hard limit | **0** (excluding generated `database.ts`) |
| `any` type instances | **0** |
| `supabase.from()` outside `lib/services/` | **0** (+ OG route documented exception) |
| Cross-feature imports | **0** |
| Files importing >10 modules | **0** |

---

## How This Register Evolved

The tech-debt program runs in three phases. Each phase ends with a fresh codebase audit against
`AGENTS.md`; newly discovered violations receive sequential TD IDs and a follow-up document in
`docs/implementation/tech-debts/`.

```mermaid
flowchart LR
  P1["Phase 1\nInitial Register\nTD-001 → TD-017"]
  P2["Phase 2\nFollow-Up Audits\nTD-018 → TD-059"]
  P3["Phase 3\nCurrent Gaps\nTD-060 → TD-072"]
  P1 -->|"All resolved ✅"| P2
  P2 -->|"All resolved ✅"| P3
  P3 -->|"10 resolved, 1 deferred, 1 won't fix"| Next["Next audit when\nnew violations found"]
```

### Phase 1 — Initial Register (2026-07-07)

**Scope:** First full audit of the Next.js migration codebase.  
**Items:** TD-001 → TD-017  
**Status:** All resolved ✅

The original register captured the highest-impact violations found at migration time: god
components (`Scoreboard.tsx` at 602 lines), god action files, `any` types across 13 files, raw
Supabase calls in pages, spectator/summary UI in `app/`, cross-feature imports, and missing
barrels.

| ID | Priority | Category | Original issue | Resolution |
|---|---|---|---|---|
| TD-001 | P1 | File size | `Scoreboard.tsx` — 602 lines | Decomposed → 177-line orchestrator + 8 sub-components |
| TD-002 | P1 | File size | `live-session/actions.ts` — 406 lines | Split → `actions.ts` (93 lines) + `_draft.ts` (126 lines) |
| TD-003 | P1 | File size | `lib/stats/summaryStats.ts` — 473 lines | Split → `session-stats`, `dashboard-stats`, `stat-helpers`, barrel |
| TD-004 | P1 | File size | `lib/matchmaking/index.ts` — 342 lines | Split → `types`, `draft`, `strict-draft`, `rotation`, barrel |
| TD-005 | P2 | File size | `app/dashboard/page.tsx` — 211 lines | Extracted `features/dashboard/` → page 48 lines |
| TD-006 | P2 | File size | `app/dashboard/session/page.tsx` — 238 lines | Extracted session components → page 91 lines |
| TD-007 | P2 | File size | `app/dashboard/roster/page.tsx` — 190 lines | Extracted roster components → page 54 lines |
| TD-008 | P1 | TypeScript | `any` in 13 files | Zero `any` repo-wide |
| TD-009 | P2 | Architecture | Raw Supabase in summary page | `storeSummaryData()` in `lib/services/` |
| TD-010 | P2 | Architecture | Raw Supabase in session/roster pages | All pages delegate to `lib/services/` |
| TD-011 | P2 | Architecture | Spectator components in `app/view/` | Moved to `features/spectator/` slice |
| TD-012 | P2 | Architecture | `HighlightsGrid.tsx` in `app/` | Moved to `features/summary/` |
| TD-013 | P3 | Structure | `lib/stats/` missing barrel | `lib/stats/index.ts` created |
| TD-014 | P2 | i18n | Hardcoded `"Swap Sides"` | `t('swapSides')` in `AdminControls` |
| TD-015 | P1 | Architecture | Cross-feature `live-session` → `session` | `onEndSession` callback prop |
| TD-016 | P3 | Architecture | Inline `signOut` in dashboard page | Extracted to `features/dashboard/actions.ts` |
| TD-017 | P3 | Structure | Incomplete `session/index.ts` barrel | Exports actions + 3 components |

**Implementation docs:** [`01`](implementation/tech-debts/01-TD015-cross-feature-import.md) – [`11`](implementation/tech-debts/11-TD014-TD016-polish.md)

---

### Phase 2 — Follow-Up Audits (2026-07-08)

**Scope:** Seven post-implementation audits; each pass fixed the prior batch then re-scanned the
codebase for violations missed or introduced by remediation work.  
**Items:** TD-018 → TD-059  
**Status:** All resolved ✅

| Audit | Doc | TD range | Theme | Items |
|---|---|---|---|---|
| #1 | [`12-TD018-TD024`](implementation/tech-debts/12-TD018-TD024-follow-up-gaps.md) | 018–024 | Residual god files, cross-layer imports, page Supabase | 7 |
| #2 | [`13-TD025-TD031`](implementation/tech-debts/13-TD025-TD031-follow-up-gaps-2.md) | 025–031 | Roster action split, Database types stub, deep imports, OG i18n | 7 |
| #3 | [`14-TD032-TD033`](implementation/tech-debts/14-TD032-TD033-follow-up-gaps-3.md) | 032–033 | Remaining page/route Supabase, position `as any` casts | 2 |
| #4 | [`15-TD034-TD041`](implementation/tech-debts/15-TD034-TD041-follow-up-gaps-4.md) | 034–041 | Feature-action Supabase, typed clients, join flow relocation, page sizes | 8 |
| #5 | [`16-TD042-TD050`](implementation/tech-debts/16-TD042-TD050-follow-up-gaps-5.md) | 042–050 | Spectator hook, service return types, HighlightsGrid, metadata i18n | 9 |
| #6 | [`17-TD043-TD059`](implementation/tech-debts/17-TD043-TD059-follow-up-gaps-6.md) | 043–059 | Residual casts, ActionError, QrCodeModal, live page assembly, barrels | 17 |
| — | [`01`–`11` impl docs](implementation/tech-debts/) | (Phase 1) | Targeted implementation guides for TD-001–017 | — |

**Key outcomes from Phase 2:**

- **`lib/services/`** is the sole Supabase access layer (feature actions, pages, and routes cleaned up; TD-034)
- **`Database` generic** wired through all client factories and services (TD-035)
- **`features/public-join/`**, **`features/spectator/`**, **`features/dashboard/`** slices fully established
- **`ActionError` + `assertAuthenticated()`** replace hardcoded auth throws (TD-044)
- **`parsePlayerPosition`** at service boundary; UI `as PlayerPosition` casts removed (TD-041)
- **`getSpectatorViewData()` / `getLiveSessionViewData()`** extract page assembly logic (TD-048, TD-053)
- **Root layout metadata** localized via `generateMetadata()` (TD-050)

**Won't Fix carried forward:** TD-030 (OG image route Edge/i18n constraint) → TD-072

---

### Phase 3 — Current Open Items (2026-07-08)

**Scope:** Audit #7 — fresh cross-check after TD-043 → TD-059 closed.  
**Items:** TD-060 → TD-072  
**Status:** 11 open, 1 won't fix  
**Full detail:** [`18-TD060-TD072-follow-up-gaps-7.md`](implementation/tech-debts/18-TD060-TD072-follow-up-gaps-7.md)

---

## Open Items

### TD-060 · Hardcoded English on Landing Page · P2

| | |
|---|---|
| **File** | `src/app/page.tsx` L25–47 |
| **Rule** | AGENTS §6 |

Four user-facing strings are hardcoded (`"VolleyMatch"`, landing description, `"or"`, `"Login as Host"`).
`JoinSessionForm` is already localized; the page wrapper is not.

**Remediation:** Add a `Home` namespace to both locale files; use `getTranslations('Home')`.

---

### TD-061 · Residual Hardcoded English on Login Page · P3

| | |
|---|---|
| **File** | `src/app/login/page.tsx` L14, 22 |
| **Rule** | AGENTS §6 |

`"Back"` and `"VolleyMatch"` remain hardcoded. `Metadata.title` key already exists.

**Remediation:** Add `Login.back`; use `getTranslations('Metadata')` for the brand name.

---

### TD-062 · Matchmaker Ignores Existing i18n Key · P3

| | |
|---|---|
| **File** | `src/features/live-session/components/Matchmaker.tsx` L57 |
| **Rule** | AGENTS §6 |

Hardcoded `"Calculating next match..."` while `Matchmaker.preparingDraft` already exists in both locales.

**Remediation:** Replace with `{t('preparingDraft')}` — no new keys required.

---

### TD-063 · Direct Supabase Query in Layout Component · P2

| | |
|---|---|
| **File** | `src/components/layout/ActiveSessionBanner.tsx` L16–21 |
| **Rule** | AGENTS §7 |

Banner queries `sessions` directly instead of using `getActiveSession()` from `lib/services/`.

**Remediation:** Replace inline query with `getActiveSession(supabase, user.id)`.

---

### TD-064 · Missing Auth Guards on Mutating Server Actions · P2

| | |
|---|---|
| **Rule** | AGENTS §4.3 |
| **Files** | `features/live-session/actions.ts`, `features/live-session/team-actions.ts` |

Three mutating actions perform writes without `assertAuthenticated(user)`:

| Function | File |
|---|---|
| `updateScore` | `actions.ts` |
| `cancelMatch` | `actions.ts` |
| `substitutePlayer` | `team-actions.ts` |

**Remediation:** Add `getUser()` + `assertAuthenticated(user)` at the top of each, matching `saveMatch`.

---

### TD-065 · ActionError Codes Not Translated on Client · P3

| | |
|---|---|
| **Files** | `src/types/action-error.ts`, `Errors` namespace in locales |
| **Rule** | AGENTS §6 |

`ActionError('unauthorized')` throws machine codes; `Errors` namespace exists but no client helper
maps codes to `t('unauthorized')` when errors surface in the UI.

**Remediation:** Add `getActionErrorMessage(error, t)` helper; use in client catch blocks.

---

### TD-066 · HighlightDetailModal Exceeds Component Soft Limit · P3

| | |
|---|---|
| **File** | `src/features/summary/components/HighlightDetailModal.tsx` |
| **Size** | 212 lines (soft limit: 200) |
| **Rule** | AGENTS §4.1 |

**Remediation:** Extract per-variant panels (`HighlightMvpPanel`, etc.); keep modal shell ~80 lines.

---

### TD-067 · lib/mmr/index.ts Approaching Soft Limit · P3

| | |
|---|---|
| **File** | `src/lib/mmr/index.ts` |
| **Size** | 210 lines (soft limit: 250) |
| **Rule** | AGENTS §4.1, §4.6 |

**Remediation:** When next touched, split into `calculation.ts`, `setter-bonus.ts`, `types.ts`, barrel.

---

### TD-068 · Hardcoded Product Branding on Public Pages · P3

| | |
|---|---|
| **Rule** | AGENTS §6 |
| **Files** | `app/page.tsx`, `app/login/page.tsx`, share pages, `ActiveSessionBanner.tsx` |

`"VolleyMatch"` hardcoded in JSX on 5 pages/components despite localized `Metadata.title`.

**Remediation:** Use `getTranslations('Metadata')` → `t('title')` on server pages.

---

### TD-069 · LanguageSwitcher Hardcoded Labels · P3

| | |
|---|---|
| **File** | `src/components/layout/LanguageSwitcher.tsx`, `ThemeToggle.tsx` |
| **Rule** | AGENTS §6 |

Hardcoded aria-labels and menu options (`"Change language"`, `"English"`, `"Português"`, `"Toggle theme"`).
`Common.theme` key already exists for the theme toggle.

**Remediation:** Add `Common.changeLanguage`, `Common.english`, `Common.portuguese`; use `useTranslations`.

---

### TD-070 · Position Record Casts in team-actions.ts · P3

| | |
|---|---|
| **File** | `src/features/live-session/team-actions.ts` |
| **Rule** | AGENTS §4.5 — TD-041 residual at action layer |

JSON position columns cast as `Record<string, string>` instead of mapped through `mappers.ts`.

**Remediation:** Add `parsePositionRecord(value: Json)` in `lib/services/mappers.ts`.

---

### TD-071 · Generated database.ts Exceeds File Size Limit · P3

| | |
|---|---|
| **File** | `src/types/database.ts` |
| **Size** | 519 lines (hard limit: 300) |
| **Rule** | AGENTS §4.1 |

Supabase-generated types; splitting would be overwritten on next `supabase gen types`.

**Remediation:** Document a project exception in `AGENTS.md` — generated types exempt from file-size limits.

---

### TD-072 · OG Image Route — Won't Fix · P3

| | |
|---|---|
| **File** | `src/app/api/og/summary/route.tsx` |
| **Status** | **Won't Fix** (inherits TD-030) |

Direct Supabase call and hardcoded English accepted due to Edge-runtime / i18n constraints.
Inline comment in route file documents the exception.

---

## Open Items Summary

| ID | Priority | Category | File(s) | Status |
|---|---|---|---|---|
| TD-067 | P3 | File size | `lib/mmr/index.ts` | Deferred — split when next touched |
| TD-072 | P3 | Architecture | OG route | Won't Fix |

All other items (TD-001 → TD-066, TD-068 → TD-071) are resolved ✅

---

## Suggested Next Step

Split `lib/mmr/index.ts` along concern boundaries when the next MMR feature touches that module (see audit #7 TD-067).

---

## Document Index

All implementation and audit documents live in [`docs/implementation/tech-debts/`](implementation/tech-debts/):

| Doc | Covers |
|---|---|
| `01`–`11` | Phase 1 implementation guides (TD-001–017) |
| `12` | Audit #1 — TD-018–024 |
| `13` | Audit #2 — TD-025–031 |
| `14` | Audit #3 — TD-032–033 |
| `15` | Audit #4 — TD-034–041 |
| `16` | Audit #5 — TD-042–050 |
| `17` | Audit #6 — TD-043–059 |
| `18` | Audit #7 — TD-060–072 **(current)** |
