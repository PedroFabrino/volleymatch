# VolleyMatch - Project Specifications

## 1. Project Overview
VolleyMatch is a live, court-side web application designed to manage volleyball sessions. It handles dynamic late arrivals, balances teams based on player skill (MMR) and court positions, and enforces fair playtime rotations using a hybrid "Winner Stays On" mechanic. It features a live scoreboard that automates the transition between games.

## 2. Tech Stack
*   **Frontend & API:** Next.js (App Router)
*   **Database & Auth:** Supabase (PostgreSQL)
*   **Styling:** Tailwind CSS + shadcn/ui
*   **Hosting:** Vercel (planned)

## 3. Core Architecture (Multi-Tenant SaaS)
*   **Hoster Accounts:** The app uses a multi-tenant structure. Users can sign up via Supabase Auth to become a "Hoster".
*   **Siloed Data:** Row Level Security (RLS) ensures that a logged-in Hoster can only view and manage their own player roster and session data.
*   **Frictionless Players:** The actual volleyball players do not need to create accounts or provide emails. They exist as records managed entirely by their Hoster.

## 4. Key Features & Logic

### 4.1. Global Roster & Players
*   The Hoster maintains a global list of friends/players.
*   **Initial MMR:** When adding a player, the Hoster assigns a starting MMR tier (e.g., Beginner=800, Intermediate=1000, Advanced=1200).
*   **Positions:** Players have a soft-constraint tag for their positions (Setter, Outside Hitter, Center, Libero, etc.). A player can have multiple. The matchmaking algorithm attempts to balance positions (e.g., ensuring at least 1 Setter per team) by applying MMR penalties to poor compositions during team generation.

### 4.2. Session & Attendance
*   Before games begin, the Hoster creates a "Session".
*   The Hoster is presented with the Global Roster and simply toggles "Present" for the players who physically showed up.
*   **Session-Specific Position Override:** When a player is marked present, their preferred positions appear as clickable chips. The Hoster can tap these chips to toggle them off for today's session (e.g., if a Setter only wants to hit today). This override applies only to the active session.

### 4.3. Matchmaking & Rotation Flow
The app uses a hybrid "Winner Stays On" state machine:
*   **Selecting the Next 12 Players:**
    1.  Take all 6 players from the winning team of the previous match.
    2.  Add all players currently waiting in the Queue.
    3.  Fill the remaining slots (up to 12) from the losing team, prioritizing those with the *least* amount of games played today. (Ties are broken by MMR balance).
*   **The Rebalance (Setter Compensation Algorithm):** 
    *   The selected 12 players are pooled together and snake-drafted into two teams based on their active MMR.
    *   The algorithm attempts to place at least one active Setter on both teams.
    *   *Compensation Logic:* If the pool only has 1 or 0 Setters, one or both teams will be forced to play without a Setter. To compensate for this severe disadvantage, the Matchmaker automatically grants the Setter-less team a **+10% MMR allowance boost** during the draft, effectively stacking them with stronger hitters to balance the game.
*   **Callout UI:** When the new teams are presented, players who were waiting in the queue (the new additions to the court) are visually highlighted so the Hoster can easily call them out.

### 4.4. Live Scoreboard & Automation
*   **House Rules:** Configurable settings available on the main dashboard (and easily switchable between games).
    *   *Target Score:* e.g., 10, 12, 15, 25.
    *   *Tie-Breaker Rule:* "Win by 2" OR "Flat +3 Extension" (e.g., if target is 12 and score hits 11-11, target instantly shifts to 14, becoming first to 14).
*   **Mobile-First UX (Landscape Mode):** The app is designed for portrait mode during matchmaking. When a game starts, the user flips their phone horizontally. The app enters fullscreen landscape mode to act as a physical courtside scoreboard.
*   **Gesture Controls:** 
    *   *Tap:* Touching a team's score increases it by +1.
    *   *Swipe Down:* Sliding down on a team's score decreases it by -1 (to quickly fix misclicks).
*   **Automation:** When the target score/win condition is met:
    1.  The game automatically concludes.
    2.  MMR changes are processed (Modified Team Elo based on MMR differential).
    3.  The Rotation Flow triggers automatically.
    4.  The new rosters for Game N+1 are displayed.
    5.  The scoreboard resets to 0-0.
