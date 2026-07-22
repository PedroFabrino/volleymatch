import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server } from 'http';
import next from 'next';
import supertest from 'supertest';
import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import {
  createTestUser,
  deleteTestUser,
  purgeStaleTestUsers,
} from './test-helpers';

// ---------------------------------------------------------------------------
// Hey, environment – loaded automatically by Next.js from .env.local
// You can also add `import 'dotenv/config'` if needed.
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ---------------------------------------------------------------------------
// Hey, test lifecycle variables
// ---------------------------------------------------------------------------
let app: ReturnType<typeof next>;
let handle: ReturnType<typeof app.getRequestHandler>;
let server: Server;
let request: ReturnType<typeof supertest>;

let testUser: Awaited<ReturnType<typeof createTestUser>>['user'];
let adminClient: Awaited<ReturnType<typeof createTestUser>>['adminClient'];
let accessToken: string;
let testSessionId: string;

// ---------------------------------------------------------------------------
// Hey, suite setup – start Next.js server, clean stale users, create a fresh user
// ---------------------------------------------------------------------------
beforeAll(async () => {
  // 1. Start the Next.js server (non‑dev mode for speed)
  // @ts-expect-error: assign to NODE_ENV for test purposes
  process.env.NODE_ENV = 'production';          // avoid dev‑mode overhead
  app = next({ dev: false, dir: process.cwd() });
  handle = app.getRequestHandler();
  await app.prepare();
  server = createServer(handle);
  request = supertest(server);

  // 2. Clean up any leftover test users from previous runs
  await purgeStaleTestUsers();

  // 3. Create a test user that will authenticate our API calls
  const created = await createTestUser();
  testUser = created.user;
  adminClient = created.adminClient;

  // 4. Sign in to get a valid JWT
  const anonClient = createClient(supabaseUrl, anonKey);
  const { data, error } = await anonClient.auth.signInWithPassword({
    email: testUser.email!,
    password: 'testPassword123!',
  });
  if (error || !data.session) {
    throw new Error(`Sign‑in failed: ${error?.message}`);
  }
  accessToken = data.session.access_token;

  // 5. Create a session (required to create a draft) via admin client
  const { data: sessionData, error: sessionError } = await adminClient
    .from('sessions')
    .insert({
      hoster_id: testUser.id,
      target_score: 21,
      is_active: true,
      matchmaking_mode: 'casual',
    })
    .select('id')
    .single();
  if (sessionError || !sessionData) {
    throw new Error(`Session creation failed: ${sessionError?.message}`);
  }
  testSessionId = sessionData.id;

  // 6. (Optional) Create a few players so the draft has something to work with
  const players = Array.from({ length: 12 }, (_, i) => ({
    id: crypto.randomUUID(),
    hoster_id: testUser.id,
    name: `Test Player ${i}`,
    positions: ['Setter', 'Outside Hitter', 'Middle Blocker'],
    is_present_today: true,
  }));
  await adminClient.from('players').insert(players);
  await adminClient.from('session_players').insert(
    players.map((p) => ({
      session_id: testSessionId,
      player_id: p.id,
      hoster_id: testUser.id,
    })),
  );
});

afterAll(async () => {
  // Clean up the test user (cascades to sessions, players, etc.)
  if (testUser) {
    await deleteTestUser(testUser.id, adminClient);
  }
  // Shut down the server
  if (server) {
    server.close();
  }
});

// ---------------------------------------------------------------------------
// Hey, performance budget (in milliseconds)
// ---------------------------------------------------------------------------
const DRAFT_CREATION_BUDGET_MS = 200;

// ---------------------------------------------------------------------------
// Hey, the actual integration / performance test
// ---------------------------------------------------------------------------
describe.skip('POST /api/draft/create (performance)', () => {
  it(
    `completes an end‑to‑end draft creation in under ${DRAFT_CREATION_BUDGET_MS}ms`,
    { timeout: 15000 },           // generous timeout for the whole test
    async () => {
      const start = performance.now();

      const response = await request
        .post('/api/draft/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sessionId: testSessionId })
        .expect(201);             // expect success status

      const elapsed = performance.now() - start;

      // Verify that the draft was actually created (the response contains
      // the draft id so subsequent requests can use it)
      expect(response.body).toHaveProperty('draftId');

      // The hard requirement: total HTTP round‑trip time < budget
      expect(elapsed).toBeLessThan(DRAFT_CREATION_BUDGET_MS);
    },
  );
});
