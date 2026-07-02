Build is failing with this error:

./src/app/dashboard/live/[session_id]/actions.ts:312:57
Type error: Parameter 'sp' implicitly has an 'any' type.
  310 | ...ion_id', sessionId)
  311 | ...
> 312 | ...onPlayersMap = new Map(sessionPlayers?.map(sp => [sp.player_id, sp.games_played]))
      |                                               ^
  313 | ...
  314 | ...p of presentPlayers) {
  315 | ...layed_today = sessionPlayersMap.get(p.id) ?? 0
Next.js build worker exited with code: 1 and signal: null
Error: Command "npm run build" exited with 1