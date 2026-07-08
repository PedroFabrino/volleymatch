# Background Persistence & Optimistic UI Architecture

## Core Philosophy

VolleyMatch is designed to feel **instantaneous** to the host. During a live session, the user is likely on a mobile device, tapping buttons between fast-paced volleyball rallies. 

**Rule of Thumb:** The UI must *never* block waiting for a database round-trip unless absolutely necessary for data integrity across multiple devices.

To achieve this, we employ a **"Memory-First, Background-Save"** architecture for all core match actions.

## 1. Optimistic UI Updates

React's `useOptimistic` (or simple local state updates) is the primary mechanism for instant feedback. 

When a user performs an action (e.g., scores a point, substitutes a player, swaps positions):
1. The client immediately updates the local UI state.
2. The client fires a Server Action inside a `startTransition`.
3. The Server Action initiates the database update.

### Examples in Codebase
* **Scoreboard (`Scoreboard.tsx`):**
  Uses `useOptimistic` for `team_a_score` and `team_b_score`. Tapping to score instantly increments the local counter, while `updateScore` runs on the server.
* **Substitutions / Swaps:**
  Currently lacking `useOptimistic` in some places, but local state can temporarily reflect the change while the server action runs. (This is an area for improvement during the UI decomposition).

## 2. Server Actions: Fire and Forget

Server Actions must be designed to return as quickly as possible.

### Concurrent Database Writes
When an action requires multiple database inserts/updates, they must be fired concurrently using `Promise.all` rather than sequentially `await`ing each one.

*Example from `updateScore`:*
```typescript
// Good: Concurrent writes
const scoreUpdate = supabase.from('matches').update({...})
const eventInsert = supabase.from('match_events').insert({...})
await Promise.all([scoreUpdate, eventInsert])
```

### The `after()` Function for Heavy Lifting
For complex operations that are not strictly necessary for the immediate UI response, Next.js 15's `after()` function is used to offload work to the background, preventing the request from hanging and avoiding dev server deadlocks.

*Example from `finishMatch`:*
```typescript
// Fast path: mark match done
await supabase.from('matches').update({ is_completed: true }).eq('id', matchId)

// Fire background MMR processing without holding the request
after(() => {
  processBackgroundMatch(matchId, sessionId, user.id).catch(console.error)
});

// Immediately redirect the user to the next screen
redirect(`/dashboard/session`)
```

## 3. The Exception: Real-time Spectator Sync

The only constraint on "instant" memory-only updates is the need to synchronize data with Spectators via WebSockets (Supabase Realtime).

For Spectators to see live updates (score changes, substitutions):
1. The Host's device must send the update to the Supabase database.
2. Supabase broadcasts the change over the Realtime channel.
3. The Spectator's device receives the payload and updates its UI.

**Architecture Implication:**
Because the WebSocket relies on database changes, the Host's Server Actions *must* write to the database (we cannot rely *solely* on local memory on the Host device). However, the Host's UI does **not** wait for the WebSocket round-trip. The Host's UI updates optimistically, the database is updated in the background, and the Spectator receives the update slightly later (usually within ~100-200ms).

## Implementation Checklist for New Features

Whenever building a new feature in the live match flow, verify:
- [ ] **Instant UI Feedback:** Is the UI updating immediately using local state or `useOptimistic`?
- [ ] **No Awaiting DB for UI:** Does the user have to wait for a database `await` before seeing the result of their action? (They shouldn't).
- [ ] **Concurrent Writes:** Are multiple DB queries in the Server Action executed in parallel via `Promise.all`?
- [ ] **Background Processing:** Is heavy computation (like MMR calculations or complex drafting) pushed to `after()` if it's not needed for the immediate next screen?
