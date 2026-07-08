<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# VolleyMatch — Agent Coding Guide

This file is the **authoritative reference** for any AI coding agent working on this codebase. Read it entirely before touching any file. Violating the rules here is grounds for rejection.

---

## 1. Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript 5) |
| Database / Auth | Supabase (PostgreSQL + RLS) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| i18n | `next-intl` v4 |
| Testing | Vitest (unit), `tests/` dir (e2e, integration) |
| PWA | `@ducanh2912/next-pwa` |
| Hosting | Vercel (planned) |

> **Do not add new dependencies without explicit user approval.**

---

## 2. Folder Structure

```
src/
├── app/                    # Next.js App Router — routing only, thin pages
│   ├── api/                # API route handlers (route.ts files)
│   ├── dashboard/          # Protected routes (require auth)
│   │   ├── live/           # Scoreboard / live session view
│   │   ├── roster/
│   │   ├── session/
│   │   ├── summary/
│   │   ├── history/
│   │   ├── leaderboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── join/               # Public player join flow
│   ├── login/
│   ├── share/
│   ├── view/
│   ├── layout.tsx          # Root layout
│   ├── globals.css
│   └── manifest.ts
│
├── components/             # Shared, reusable UI components (no business logic)
│   ├── ui/                 # shadcn/ui primitives (generated — do not hand-edit)
│   ├── layout/             # App-wide layout pieces (nav, banners, providers)
│   └── index.ts            # barrel re-export
│
├── features/               # Feature slices — all domain logic lives here
│   ├── live-session/       # Scoreboard + Matchmaker UI and server actions
│   ├── roster/             # Player roster management
│   ├── session/            # Session creation / attendance
│   ├── summary/            # Post-session summary
│   └── public-join/        # Public-facing player join
│
├── lib/                    # Pure, framework-agnostic business logic & utilities
│   ├── matchmaking/        # Snake-draft algorithm, setter compensation
│   ├── mmr/                # Elo-style MMR calculations
│   ├── stats/              # Dashboard stat computations
│   ├── services/           # Data-access layer (Supabase queries)
│   └── supabase/           # Supabase client factories (client, server, admin)
│
├── hooks/                  # Shared React hooks (empty — add only client-side hooks)
├── types/                  # Shared TypeScript types and interfaces
├── utils/                  # Stateless pure utility functions
└── locales/                # i18n translation files (en.json, pt.json)

supabase/
├── migrations/             # Ordered SQL migration files
└── schema.sql              # Canonical DB schema snapshot

tests/
├── e2e/                    # End-to-end tests
└── integration/            # Integration tests
```

---

## 3. Architecture Rules

### 3.1 `app/` — Routing Layer Only

- Pages in `app/` are **thin orchestrators**: fetch data, pass it to feature components, nothing more.
- Do **not** put business logic, UI markup, or Supabase queries directly in `page.tsx` files.
- Inline Server Actions (`'use server'` defined inside a `page.tsx`) are acceptable only for trivial, one-off mutations (e.g., `signOut`). Anything non-trivial **must** be extracted to a feature's `actions.ts`.
- Page files should stay under **150 lines**. If a page exceeds this, extract components into the relevant feature slice.

### 3.2 `features/` — Domain Logic

Each feature slice follows this internal structure:

```
features/<feature-name>/
├── components/             # Feature-specific React components
│   └── *.tsx
├── actions.ts              # 'use server' Server Actions for this feature
├── hooks.ts                # (optional) Client-side hooks scoped to this feature
└── index.ts                # Barrel export — the only public API of this feature
```

**Rules:**
- Import from a feature **only** via its `index.ts` barrel. Never deep-import (`features/live-session/components/Scoreboard`).
- Features do **not** import from other features. Shared logic must live in `lib/` or `components/`.
- `actions.ts` contains **only** `'use server'` functions. Keep each action focused on a single mutation or query.
- Components inside a feature are **private** — they are not intended for use outside that feature.

### 3.3 `lib/` — Pure Business Logic

- All code in `lib/` must be **pure and framework-agnostic** (no Next.js imports, no React, no `'use server'`).
- `lib/services/` is the **only** place that calls Supabase. Pages and actions receive a `supabase` client and pass it into service functions.
- `lib/matchmaking/` and `lib/mmr/` contain the core game algorithms — they must remain pure functions with full unit-test coverage.
- If you add a new sub-domain to `lib/`, create a corresponding `index.ts` barrel.

### 3.4 `components/` — Shared UI

- `components/ui/` contains **shadcn/ui generated files** — do not hand-edit them. Re-generate using the shadcn CLI.
- `components/layout/` holds app-wide structural components (banners, providers, nav).
- A component belongs here only if it is genuinely reused across **multiple** features. Otherwise, it belongs in the feature slice.

### 3.5 `types/` — Shared Types

- Type definitions that are used by more than one module go in `types/`.
- Domain types scoped to a single feature may live inside that feature's folder, but must be exported through `index.ts`.
- Prefer `type` over `interface` for data shapes; use `interface` only when extension/merging is intentional.

### 3.6 `supabase/` — Database

- All schema changes must be expressed as **numbered migration files** in `supabase/migrations/`.
- Keep `supabase/schema.sql` in sync with the latest migration state.
- Never alter a past migration file — always create a new one.

---

## 4. Anti-Vibe-Coding Rules

These are hard limits. Violating them will cause PR rejection.

### 4.1 File Size Limits

| File type | Soft limit | Hard limit |
|---|---|---|
| `page.tsx` | 100 lines | 150 lines |
| Feature component (`.tsx`) | 200 lines | 300 lines |
| `actions.ts` | 150 lines | 200 lines |
| `lib/**/*.ts` | 250 lines | 350 lines |
| Any other file | 200 lines | 300 lines |

> **When a file is approaching its limit, split it proactively. Do not ask the user — just split it and document the split in your response.**

### 4.2 Component Decomposition

- A component that renders more than **3 distinct visual sections** must be decomposed.
- Extract every logical sub-section into a named sub-component in the same feature folder.
- Prop drilling beyond **2 levels** is a signal to use a context or a dedicated hook.

### 4.3 Server Actions

- One Server Action = one responsibility. If an action is doing more than one thing, split it.
- Never call a Server Action from another Server Action — compose at the service layer instead.
- Always validate auth at the top of every action: `if (!user) throw new Error('Unauthorized')`.

### 4.4 No Inline Logic in JSX

- No business logic, data transformations, or conditional chains inside JSX. Extract to a variable or helper function above the `return` statement.
- `Array.map` callbacks inside JSX should be **3 lines or fewer**. Extract to a separate component otherwise.

### 4.5 No `any`

- Do not use TypeScript `any`. Use `unknown` and narrow, or define a proper type.
- Existing `any` usages are tech debt — do not add new ones.

### 4.6 No God Files

- No single file should import from more than **10 modules**. If it does, it is doing too much.
- The `lib/matchmaking/index.ts` file is a known god file candidate — refactor it into sub-modules (`draft.ts`, `rotation.ts`, `setter-compensation.ts`) whenever it is touched.

---

## 5. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| React components | PascalCase | `Scoreboard.tsx`, `MatchCard.tsx` |
| Server actions | camelCase verbs | `generateMatch`, `updateScore` |
| Lib functions | camelCase verbs | `draftTeams`, `calculateMmrChanges` |
| Types / interfaces | PascalCase | `SessionPlayer`, `MatchDraft` |
| Directories | kebab-case | `live-session`, `public-join` |
| DB columns | snake_case | `team_a_score`, `hoster_id` |

---

## 6. i18n

- **All user-facing strings** must use `next-intl`. No hardcoded English strings in JSX.
- Server components use `getTranslations('Namespace')`. Client components use `useTranslations('Namespace')`.
- Both `locales/en.json` and `locales/pt.json` must be updated **together**. Never add a key to one without the other.
- Keep namespace keys scoped to their feature (e.g., `LiveSession.scoreboardTitle`, not just `title`).

---

## 7. Data Access Pattern

```
page.tsx / actions.ts
  └── lib/services/*.ts  (receives supabase client as argument)
        └── supabase client methods
              └── returns typed data
```

- The client side must **never** import `lib/services` directly — only Server Actions and Server Components may do so.
- For realtime subscriptions (Supabase channels), create a dedicated client-side hook in `features/<name>/hooks.ts`.

---

## 8. Testing

- Unit tests for pure logic live **alongside their module** (e.g., `lib/matchmaking/matchmaking.test.ts`).
- Integration and e2e tests live in `tests/integration/` and `tests/e2e/` respectively.
- When adding a new pure function to `lib/`, add at least one unit test for it.
- Run `npm test` before declaring any task complete.

---

## 9. Pre-Coding Checklist

Before writing any code, verify the following:

1. **Read the Next.js docs** at `node_modules/next/dist/docs/` for the API you plan to use.
2. **Locate the correct layer** (routing → `app/`, domain UI → `features/`, algorithms → `lib/`).
3. **Import via barrel exports** — use `index.ts`, not deep paths.
4. **Check file sizes** — if the target file is near its limit, split it first.
5. **Update both locale files** — if you are adding any user-visible text, update `en.json` and `pt.json`.
6. **Write or update tests** — any new pure function in `lib/` needs a unit test.

---

## 10. Version Control

- **Atomic Commits (required)**: Every change MUST be committed atomically — one logical unit of work per commit. After each distinct step (e.g., a single TD item, a service extraction, an i18n namespace), create a separate commit with a descriptive message. Do not lump unrelated changes into a single massive commit, and do not leave completed work uncommitted.
- **Commit before moving on**: When implementing multiple tasks in sequence, commit each task before starting the next. A PR or session with one giant diff spanning unrelated concerns is grounds for rejection.
