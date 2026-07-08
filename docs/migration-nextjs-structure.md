# VolleyMatch – Next.js 15 Structure Migration Plan

> **Goal**: Migrate from the current ad-hoc layout to a highly scalable, feature-module-based
> Next.js 15 architecture while keeping the app fully functional at every step.

---

## 1. Current State Audit

### 1.1 Project Tree (as-is)

```
src/
├── __tests__/                        ⚠️  Integration tests mixed with unit tests; no co-location
│   ├── draft-performance.integration.test.ts
│   ├── simulation.tests.ts
│   └── test-helpers.ts
├── app/                              ✅  App Router — correct
│   ├── JoinSessionForm.tsx           ❌  Page-level component living at the app root
│   ├── globals.css                   ⚠️  Should live in a styles/ layer
│   ├── icon.png                      ⚠️  Image asset in app/ instead of public/ or assets/
│   ├── layout.tsx                    ✅
│   ├── manifest.ts                   ✅
│   ├── page.tsx                      ✅
│   ├── api/
│   │   ├── batch-insert/             ✅  Route handler
│   │   └── og/                       ✅  Route handler
│   ├── dashboard/
│   │   ├── page.tsx                  ❌  Page does data fetching + UI logic + stats computation (too many concerns)
│   │   ├── history/
│   │   │   ├── TimelineViewer.tsx    ❌  Feature component co-located in route folder (ok-ish, but inconsistent)
│   │   │   └── page.tsx
│   │   ├── leaderboard/
│   │   │   └── page.tsx
│   │   ├── live/[session_id]/
│   │   │   ├── Matchmaker.tsx        ❌  Feature component co-located only here
│   │   │   ├── Scoreboard.tsx        ❌  Feature component co-located only here (29 KB!)
│   │   │   ├── actions.ts            ⚠️  Server Actions without a services layer
│   │   │   └── page.tsx
│   │   ├── roster/
│   │   │   ├── actions.ts            ⚠️  Same as above
│   │   │   └── page.tsx
│   │   ├── session/
│   │   │   ├── AttendanceControls.tsx
│   │   │   ├── AttendanceToggle.tsx
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   └── summary/[session_id]/
│   │       └── all/
├── components/                       ❌  Flat — no ui/ vs features/ split
│   ├── ActiveSessionBanner.tsx
│   ├── LanguageSwitcher.tsx
│   ├── QrCodeModal.tsx
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
├── i18n/
│   └── request.ts                    ⚠️  Fine but could be under lib/i18n/
├── images/
│   └── icon.png                      ❌  Duplicate of app/icon.png; should be in public/
├── messages/                         ⚠️  Fine but should be at root level or src/locales/
│   ├── en.json
│   └── pt.json
└── utils/                            ❌  Mixed: domain logic + infrastructure helpers
    ├── matchmaking.ts                ❌  Domain logic (business rules)
    ├── matchmaking.test.ts           ⚠️  Test co-located with source (good!) but inside utils/
    ├── mmr.ts                        ❌  Domain logic
    ├── mmr.test.ts
    ├── simulation.test.ts
    ├── summaryStats.ts               ❌  Domain logic
    └── supabase/                     ✅  Infrastructure — correct concept, wrong parent folder
        ├── admin.ts
        ├── client.ts
        └── server.ts
```

### 1.2 Issues Summary

| # | Issue | Severity |
|---|-------|----------|
| 1 | `components/` is completely flat — no `ui/` / `features/` separation | 🔴 High |
| 2 | Feature components (`Scoreboard`, `Matchmaker`, etc.) live inside `app/` route folders | 🔴 High |
| 3 | `dashboard/page.tsx` mixes data fetching, stat computation and JSX (God component) | 🔴 High |
| 4 | Domain logic (`matchmaking.ts`, `mmr.ts`) is mixed with infra utilities in `utils/` | 🔴 High |
| 5 | No `lib/` or `services/` layer for reusable server-side logic | 🔴 High |
| 6 | No `hooks/` directory for custom React hooks | 🟡 Medium |
| 7 | No `types/` directory; TypeScript types are inlined everywhere | 🟡 Medium |
| 8 | `globals.css` inside `app/` (not catastrophic but inconsistent with a `styles/` convention) | 🟡 Medium |
| 9 | Tests are split: some co-located in `utils/`, others in `__tests__/` at `src/` root | 🟡 Medium |
| 10 | `images/` in `src/` duplicates `public/` assets | 🟢 Low |
| 11 | `i18n/request.ts` and `messages/` could be consolidated under `src/lib/i18n/` | 🟢 Low |
| 12 | No barrel exports (`index.ts`) for clean import paths | 🟢 Low |

---

## 2. Target Architecture

```
src/
├── app/                              # App Router only — no UI components here
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── manifest.ts
│   ├── api/
│   │   ├── batch-insert/route.ts
│   │   └── og/route.ts
│   ├── (auth)/                       # Route group — no layout impact
│   │   └── login/
│   │       └── page.tsx
│   ├── (public)/                     # Route group for public/guest pages
│   │   ├── join/page.tsx
│   │   ├── share/
│   │   │   ├── hoster/
│   │   │   └── session/
│   │   └── view/[pin]/page.tsx
│   └── dashboard/                    # Protected area
│       ├── layout.tsx                # Auth guard here
│       ├── page.tsx                  # Thin orchestrator only
│       ├── history/page.tsx
│       ├── leaderboard/page.tsx
│       ├── live/[session_id]/page.tsx
│       ├── roster/page.tsx
│       ├── session/page.tsx
│       └── summary/
│           ├── [session_id]/page.tsx
│           └── all/page.tsx
│
├── components/                       # Shared, reusable UI
│   ├── ui/                           # Atomic/generic components
│   │   ├── Button/
│   │   │   ├── index.tsx
│   │   │   └── Button.module.css     # (if needed)
│   │   ├── Card/
│   │   ├── Modal/
│   │   └── index.ts                  # Barrel export
│   └── layout/                       # Layout-level components
│       ├── ActiveSessionBanner.tsx
│       ├── ThemeProvider.tsx
│       └── ThemeToggle.tsx
│
├── features/                         # Feature-scoped modules (the main addition)
│   ├── auth/
│   │   └── components/
│   │       └── LoginForm.tsx
│   ├── dashboard/
│   │   └── components/
│   │       ├── StatsCard.tsx
│   │       └── SessionList.tsx
│   ├── live-session/
│   │   ├── components/
│   │   │   ├── Matchmaker.tsx        # Moved from app/dashboard/live/[session_id]/
│   │   │   └── Scoreboard.tsx        # Moved from app/dashboard/live/[session_id]/
│   │   └── actions.ts                # Server Actions for live sessions
│   ├── roster/
│   │   ├── components/
│   │   │   ├── AttendanceControls.tsx
│   │   │   └── AttendanceToggle.tsx
│   │   └── actions.ts
│   ├── session/
│   │   └── actions.ts
│   ├── summary/
│   │   └── components/
│   │       └── TimelineViewer.tsx
│   └── public-join/
│       └── components/
│           └── JoinSessionForm.tsx   # Moved from app/
│
├── lib/                              # Pure, framework-agnostic utilities
│   ├── matchmaking/
│   │   ├── index.ts                  # Moved from utils/matchmaking.ts
│   │   └── matchmaking.test.ts
│   ├── mmr/
│   │   ├── index.ts                  # Moved from utils/mmr.ts
│   │   └── mmr.test.ts
│   ├── stats/
│   │   └── summaryStats.ts           # Moved from utils/summaryStats.ts
│   ├── supabase/                     # Infrastructure clients
│   │   ├── admin.ts
│   │   ├── client.ts
│   │   └── server.ts
│   └── i18n/
│       └── request.ts                # Moved from src/i18n/
│
├── hooks/                            # Custom React hooks
│   └── (empty for now — add as needed)
│
├── types/                            # Shared TypeScript types & interfaces
│   ├── database.ts                   # Supabase DB types
│   ├── session.ts
│   └── player.ts
│
└── locales/                          # i18n message files (renamed from messages/)
    ├── en.json
    └── pt.json

public/                               # Root-level — static assets only
├── icon.png                          # Moved from src/images/ and src/app/
└── ...

supabase/                             # Unchanged — Supabase CLI artifacts
├── migrations/
└── schema.sql

docs/                                 # Project documentation
tests/                                # Integration / e2e tests (outside src/)
├── integration/
│   ├── draft-performance.integration.test.ts
│   └── test-helpers.ts
└── e2e/                              # (future Playwright tests)
```

---

## 3. Migration Phases

### Phase 1 — Scaffold the New Directories

> **Risk**: 🟢 Zero — only creates folders and moves leaf-level utilities.
> **Breakage**: None (no imports changed yet).

**Steps:**

1. Create the new top-level directories:
   ```
   src/features/
   src/lib/
   src/hooks/
   src/types/
   src/locales/
   tests/integration/
   tests/e2e/
   ```

2. Rename `src/messages/` → `src/locales/` and update `next-intl` config:
   - In `next.config.ts` update the `messages` path.
   - In `src/i18n/request.ts` update the import path to `../../locales`.

3. Move `src/i18n/request.ts` → `src/lib/i18n/request.ts` and update `next.config.ts`:
   ```ts
   // next.config.ts — update i18n plugin config
   i18n: { locales: [...], defaultLocale: 'en', requestConfig: './src/lib/i18n/request' }
   ```

4. Move domain files from `utils/` → `lib/`:

   | From | To |
   |------|----|
   | `src/utils/matchmaking.ts` | `src/lib/matchmaking/index.ts` |
   | `src/utils/matchmaking.test.ts` | `src/lib/matchmaking/matchmaking.test.ts` |
   | `src/utils/mmr.ts` | `src/lib/mmr/index.ts` |
   | `src/utils/mmr.test.ts` | `src/lib/mmr/mmr.test.ts` |
   | `src/utils/summaryStats.ts` | `src/lib/stats/summaryStats.ts` |
   | `src/utils/supabase/` | `src/lib/supabase/` |

5. Move integration tests out of `src/`:

   | From | To |
   |----------|----------|
   | `src/__tests__/draft-performance.integration.test.ts` | `tests/integration/draft-performance.integration.test.ts` |
   | `src/__tests__/test-helpers.ts` | `tests/integration/test-helpers.ts` |
   | `src/__tests__/simulation.tests.ts` | `tests/integration/simulation.tests.ts` |

6. Remove `src/images/icon.png` (duplicate — `app/icon.png` serves as the Next.js app icon).

7. Update `tsconfig.json` path aliases to reflect new locations:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"],
         "@/lib/*": ["./src/lib/*"],
         "@/features/*": ["./src/features/*"],
         "@/types/*": ["./src/types/*"],
         "@/hooks/*": ["./src/hooks/*"]
       }
     }
   }
   ```

8. Update `vitest.config.ts` to include the new `tests/` directory.

**Verify**: Run `npm test` — all unit tests must pass. Run `npm run build` — no errors.

---

### Phase 2 — Establish the `features/` Module Layer

> **Risk**: 🟡 Medium — moves components and actions, requires import updates.
> **Breakage**: Pages will break temporarily as imports are updated.

**Steps:**

1. Create feature directories and move components:

   ```
   src/features/live-session/components/Matchmaker.tsx
   src/features/live-session/components/Scoreboard.tsx
   src/features/live-session/actions.ts
   ```
   - Source: `src/app/dashboard/live/[session_id]/`

   ```
   src/features/roster/components/AttendanceControls.tsx
   src/features/roster/components/AttendanceToggle.tsx
   src/features/roster/actions.ts
   ```
   - Source: `src/app/dashboard/session/` and `src/app/dashboard/roster/`

   ```
   src/features/summary/components/TimelineViewer.tsx
   ```
   - Source: `src/app/dashboard/history/TimelineViewer.tsx`

   ```
   src/features/public-join/components/JoinSessionForm.tsx
   ```
   - Source: `src/app/JoinSessionForm.tsx`

2. Update all import paths in the corresponding `page.tsx` files to use the new `@/features/` paths.

3. Move `actions.ts` files from `app/` subdirectories into their feature module:

   | Old path | New path |
   |----------|----------|
   | `app/dashboard/session/actions.ts` | `features/session/actions.ts` |
   | `app/dashboard/roster/actions.ts` | `features/roster/actions.ts` |
   | `app/dashboard/live/[session_id]/actions.ts` | `features/live-session/actions.ts` |

4. Add barrel `index.ts` files for clean imports:
   ```ts
   // src/features/live-session/index.ts
   export { Matchmaker } from './components/Matchmaker';
   export { Scoreboard } from './components/Scoreboard';
   export * from './actions';
   ```

**Verify**: Run `npm run build` and fix any broken imports. Run `npm test`.

---

### Phase 3 — Refactor the `components/` Layer

> **Risk**: 🟡 Medium — reorganises existing components.
> **Breakage**: Import paths in layout and pages need updating.

**Steps:**

1. Create `src/components/ui/` and `src/components/layout/`:

   ```
   components/
   ├── layout/
   │   ├── ActiveSessionBanner.tsx     (moved from components/)
   │   ├── ThemeProvider.tsx           (moved from components/)
   │   └── ThemeToggle.tsx             (moved from components/)
   └── ui/
       ├── QrCodeModal/
       │   └── index.tsx               (moved from components/QrCodeModal.tsx)
       └── index.ts                    (barrel export)
   ```

2. Move `LanguageSwitcher.tsx` into `features/i18n/components/` or `components/layout/`.

3. Update all imports in `app/layout.tsx`, `app/dashboard/page.tsx`, and any other consumer.

4. Add `components/index.ts` barrel:
   ```ts
   export * from './layout/ActiveSessionBanner';
   export * from './layout/ThemeProvider';
   export * from './layout/ThemeToggle';
   ```

**Verify**: `npm run build` and `npm run lint`.

---

### Phase 4 — Extract a `types/` Layer

> **Risk**: 🟢 Low — additive only.

**Steps:**

1. Create `src/types/database.ts` — run `supabase gen types typescript` and save output here.

2. Create `src/types/session.ts`, `src/types/player.ts`, `src/types/match.ts` with shared interfaces currently inlined in page components.

3. Replace inline type definitions across `dashboard/page.tsx`, `live/[session_id]/Scoreboard.tsx`, and `summaryStats.ts` with imports from `@/types/`.

4. Add a `src/types/index.ts` barrel export.

---

### Phase 5 — Introduce a `services/` or Thin Data Layer (Optional but Recommended)

> **Risk**: 🟡 Medium — architectural change to how data fetching is done.
> **Breakage**: Requires rewriting data-fetching sections of page components.

**Context**: Currently `dashboard/page.tsx` contains ~250 lines mixing 4 Supabase queries, stat computation, and JSX rendering. This violates the Single Responsibility Principle and makes testing hard.

**Steps:**

1. Create `src/lib/services/` with server-side data access functions:
   ```ts
   // src/lib/services/session.service.ts
   export async function getActiveSession(userId: string) { ... }
   export async function getPastSessions(userId: string, limit = 5) { ... }

   // src/lib/services/player.service.ts
   export async function getPlayers(hosterId: string) { ... }

   // src/lib/services/match.service.ts
   export async function getCompletedMatches(hosterId: string) { ... }
   ```

2. Extract stat computation from `dashboard/page.tsx` into `src/lib/stats/summaryStats.ts` (already moving there in Phase 1).

3. Refactor `dashboard/page.tsx` to delegate all data fetching to services:
   ```ts
   // Before: inline supabase queries (~250 lines)
   // After:
   const [activeSession, players, matches, pastSessions] = await Promise.all([
     getActiveSession(user.id),
     getPlayers(user.id),
     getCompletedMatches(user.id),
     getPastSessions(user.id),
   ]);
   ```

4. Add a dashboard layout `src/app/dashboard/layout.tsx` to centralise:
   - Auth redirect guard (moved from individual `page.tsx` files)
   - Common providers or shell UI (e.g., `ActiveSessionBanner`)

---

## 4. File-by-File Import Change Reference

After all phases, update these `tsconfig.json` aliases and all source files importing from old paths:

| Old import | New import |
|------------|------------|
| `@/utils/supabase/server` | `@/lib/supabase/server` |
| `@/utils/supabase/client` | `@/lib/supabase/client` |
| `@/utils/matchmaking` | `@/lib/matchmaking` |
| `@/utils/mmr` | `@/lib/mmr` |
| `@/utils/summaryStats` | `@/lib/stats/summaryStats` |
| `@/components/ActiveSessionBanner` | `@/components/layout/ActiveSessionBanner` |
| `@/components/ThemeProvider` | `@/components/layout/ThemeProvider` |
| `@/components/ThemeToggle` | `@/components/layout/ThemeToggle` |
| `@/components/QrCodeModal` | `@/components/ui/QrCodeModal` |
| `./Scoreboard` (from live page) | `@/features/live-session/components/Scoreboard` |
| `./Matchmaker` (from live page) | `@/features/live-session/components/Matchmaker` |
| `./actions` (from live page) | `@/features/live-session/actions` |
| `./TimelineViewer` (from history page) | `@/features/summary/components/TimelineViewer` |
| `../JoinSessionForm` (from join page) | `@/features/public-join/components/JoinSessionForm` |

---

## 5. Checklist

```
### Phase 1 — Scaffold & move utils
- [x] Create src/features/, src/lib/, src/hooks/, src/types/, src/locales/, tests/
- [x] Rename src/messages/ → src/locales/, update next.config.ts
- [x] Move src/i18n/ → src/lib/i18n/, update config
- [x] Move src/utils/matchmaking.ts → src/lib/matchmaking/index.ts
- [x] Move src/utils/mmr.ts → src/lib/mmr/index.ts
- [x] Move src/utils/summaryStats.ts → src/lib/stats/summaryStats.ts
- [x] Move src/utils/supabase/ → src/lib/supabase/
- [x] Move src/__tests__/ → tests/integration/
- [x] Delete src/images/ (duplicate)
- [x] Update tsconfig.json paths
- [x] Update vitest.config.ts
- [x] ✅ npm test && npm run build

### Phase 2 — Feature modules
- [x] Move Matchmaker.tsx, Scoreboard.tsx, actions.ts → features/live-session/
- [x] Move AttendanceControls, AttendanceToggle, actions.ts → features/roster/
- [x] Move TimelineViewer.tsx → features/summary/
- [x] Move JoinSessionForm.tsx → features/public-join/
- [x] Move session/actions.ts → features/session/
- [x] Update all page imports
- [x] Add barrel index.ts per feature
- [x] ✅ npm run build && npm test

### Phase 3 — Reorganise components/
- [x] Create components/ui/ and components/layout/
- [x] Move layout-level components (ActiveSessionBanner, ThemeProvider, ThemeToggle)
- [x] Move QrCodeModal → components/ui/QrCodeModal/
- [x] Decide: LanguageSwitcher → components/layout/ or features/i18n/
- [x] Update imports in layout.tsx and consumers
- [x] ✅ npm run build && npm run lint

### Phase 4 — `types/`
- [x] Generate Supabase types → `src/types/database.ts`
- [x] Extract inline interfaces → `src/types/{session,player,match}.ts`
- [x] Replace inline types with `@/types` imports
- [x] ✅ `npm run build`

### Phase 5 — Services layer (optional)
- [x] Create `src/lib/services/session.service.ts`
- [x] Create `src/lib/services/player.service.ts`
- [x] Create `src/lib/services/match.service.ts`
- [x] Add `dashboard/layout.tsx` (auth guard + shell)
- [x] Refactor `dashboard/page.tsx` to use services
- [x] ✅ `npm run build && npm test`
```

---

## 6. Principles to Maintain Going Forward

1. **App Router files are thin orchestrators** — `page.tsx` should import from `features/` and `lib/`; it should not contain business logic.
2. **Feature modules own their own components, hooks, and actions** — never import across feature boundaries (except through `components/ui/`).
3. **`lib/` is framework-agnostic** — files in `lib/` must not import from `next/*` or React; they are pure TypeScript.
4. **Tests live next to source** — unit tests go alongside the file they test; integration tests go in `tests/integration/`.
5. **Barrel exports** — every directory in `features/` and `components/` exports through `index.ts` to keep consumer import paths stable when internals change.
