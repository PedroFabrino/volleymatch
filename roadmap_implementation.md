# VolleyMatch — Roadmap Implementation Progress

This document tracks the progress of implementing the features defined in `ROADMAP.md`.

## 1. Strict Mode Algorithm Correction
**Status:** ✅ Complete
- [x] `draftStrictTeams()` — three group priority, remove `Math.random()` pre-shuffle
- [x] `matchmaking.test.ts` — update assertions

## 2. Spectator Queue Redesign
**Status:** ✅ Complete
- [x] `previewNextDraft()` utility function
- [x] `view/[pin]/page.tsx` — add last-match query, run preview
- [x] `SpectatorMatchmaker.tsx` — two-section layout + dot indicators
- [x] `SpectatorScoreboard.tsx` — status-coloured queue strip

## 3. QR Self-Registration
**Status:** ✅ Complete
- [x] Host Dashboard QR Code generation linking to `/join/[pin]`
- [x] Autocomplete for returning players avoiding duplicates
- [x] Late-joiner queue sorting (FIFO) using `MAX(games_played)`
- [x] Admin client bypass for RLS using `SUPABASE_SERVICE_ROLE_KEY`
## 4. MMR History Table
**Status:** ⏳ Not Started

## 5. Session Summary Card
**Status:** ⏳ Not Started

## 6. Player Account Reclaim
**Status:** ⏳ Not Started

## 7. AppSumo Launch
**Status:** ⏳ Not Started
