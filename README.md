# VolleyMatch

VolleyMatch is a court-side web app for managing recreational volleyball sessions. Hosts run live scoreboards, balance teams by skill (MMR) and position, rotate players fairly, and share session recaps — while spectators follow along on their phones.

## Features

- **Host dashboard** — roster, attendance, session setup, house rules (target score, tie-breakers)
- **Live scoreboard** — tap-to-score, substitutions, position swaps, swap sides, auto match completion
- **Matchmaking** — strict and casual draft modes with MMR balancing and setter compensation
- **Spectator view** (`/view/[pin]`) — live scores, team rosters, next-team preview, crowd voting on who scored
- **Public join** (`/join/[pin]`) — players self-register via session PIN / QR code
- **Session summary** — MVP, comebacks, MMR leaders, shareable recap image
- **i18n** — English and Portuguese (`next-intl`)

## Tech stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 16 (App Router, React 19, TypeScript 5) |
| Database / Auth | Supabase (PostgreSQL + RLS) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Testing | Vitest |
| PWA | `@ducanh2912/next-pwa` |

## Project structure

```
src/
├── app/           # Routes only — thin pages and API handlers
├── features/      # Domain slices (live-session, spectator, session, roster, summary, …)
├── lib/           # Pure logic (matchmaking, mmr, stats) and services (Supabase access)
├── components/    # Shared UI
├── types/         # Shared TypeScript types
└── locales/       # en.json, pt.json

supabase/          # Migrations and schema snapshot
tests/             # Integration tests
docs/              # Product specs, roadmap, architecture notes
```

See [`AGENTS.md`](./AGENTS.md) for architecture rules and [`docs/README.md`](./docs/README.md) for all documentation.

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project

### Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key is required for public player join (RLS bypass). Never expose it to the client.

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

Apply migrations to your Supabase project:

```bash
npx supabase db push
```

Or run the SQL files in `supabase/migrations/` manually.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build + typecheck |
| `npm run start` | Start production server |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | ESLint |

## Main routes

| Route | Who | Purpose |
|-------|-----|---------|
| `/dashboard` | Host | Overview, quick actions |
| `/dashboard/roster` | Host | Manage players |
| `/dashboard/session` | Host | Attendance & start session |
| `/dashboard/live/[session_id]` | Host | Matchmaker + live scoreboard |
| `/dashboard/summary/[session_id]` | Host | Post-session recap |
| `/view/[pin]` | Public | Spectator live view |
| `/join/[pin]` | Public | Player self-registration |

## Documentation

- [Product spec](./docs/project-spec.md)
- [Roadmap](./docs/roadmap.md)
- [Tech debt register](./docs/tech-debt.md)

## License

Private project.
