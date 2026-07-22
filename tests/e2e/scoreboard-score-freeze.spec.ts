import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { createAdminClient } from '../../src/lib/supabase/admin';

async function createTestUser(email?: string) {
  const adminClient = createAdminClient();
  const testEmail = email ?? `e2e-test-${Date.now()}@example.com`;
  const { data: { user }, error } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: 'testPassword123!',
    email_confirm: true,
  });
  if (error || !user) throw new Error(`Failed to create test user: ${error?.message}`);
  return { user, adminClient };
}

async function deleteTestUser(userId: string, client: any) {
  await client.auth.admin.deleteUser(userId);
}

async function purgeStaleTestUsers() {
  const client = createAdminClient();
  const { data: { users }, error } = await client.auth.admin.listUsers();
  if (error) return;
  const stale = users.filter((u) => u.email?.startsWith('e2e-test-'));
  await Promise.allSettled(stale.map((u) => client.auth.admin.deleteUser(u.id)));
}

let adminClient: any;
let testUser: any;
let testSessionId: string;
let sharedContext: BrowserContext;
let sharedPage: Page;

test.describe.serial('Scoreboard score freeze', () => {
  test.beforeAll(async ({ browser }) => {
    // 1. Setup DB
    await purgeStaleTestUsers();
    const created = await createTestUser();
    testUser = created.user;
    adminClient = created.adminClient;

    // Create session
    const { data: sessionData, error: sessionError } = await adminClient
      .from('sessions')
      .insert({
        hoster_id: testUser.id,
        target_score: 25,
        is_active: true,
        matchmaking_mode: 'casual',
      })
      .select('id')
      .single();

    if (sessionError) throw new Error(sessionError.message);
    testSessionId = sessionData.id;

    // Create 12 players
    const players = Array.from({ length: 12 }, (_, i) => ({
      id: crypto.randomUUID(),
      hoster_id: testUser.id,
      name: `Test Player ${i}`,
      positions: ['Setter'],
      is_present_today: true,
    }));
    await adminClient.from('players').insert(players);
    await adminClient.from('session_players').insert(
      players.map((p) => ({
        session_id: testSessionId,
        player_id: p.id,
        hoster_id: testUser.id,
      }))
    );

    // Create match (0-0)
    const { error: matchError } = await adminClient.from('matches').insert({
      session_id: testSessionId,
      hoster_id: testUser.id,
      team_a_players: players.slice(0, 6).map(p => p.id),
      team_b_players: players.slice(6, 12).map(p => p.id),
      team_a_score: 0,
      team_b_score: 0,
      team_a_positions: {},
      team_b_positions: {},
      is_completed: false,
    });
    if (matchError) throw new Error(matchError.message);

    // 2. Login via UI and save state
    sharedContext = await browser.newContext({ hasTouch: true });
    sharedPage = await sharedContext.newPage();
    await sharedPage.goto('/login');
    
    // Fill login form. Need to know the selectors. 
    // Assuming standard inputs for email and password
    await sharedPage.fill('input[type="email"]', testUser.email!);
    await sharedPage.fill('input[type="password"]', 'testPassword123!');
    await sharedPage.locator('button.bg-blue-600').click();
    
    // Wait for redirect to dashboard
    await sharedPage.waitForURL('**/dashboard**');
  });

  test.afterAll(async () => {
    if (sharedContext) await sharedContext.close();
    if (testUser) {
      await deleteTestUser(testUser.id, adminClient);
    }
  });

  test.beforeEach(async () => {
    // Reset scores to 0-0 before each test just in case (except tests that override it)
    await adminClient
      .from('matches')
      .update({ team_a_score: 0, team_b_score: 0 })
      .eq('session_id', testSessionId);

    await sharedPage.goto(`/dashboard/live/${testSessionId}`);
    // Ensure the page is fully loaded and scores are visible
    await expect(sharedPage.getByTestId('score-value-a')).toBeVisible();
    await expect(sharedPage.getByTestId('score-value-b')).toBeVisible();
  });

  // --- CONTROL GROUP ---

  test('[CONTROL-01] Scoreboard renders with seeded score 0-0', async () => {
    await expect(sharedPage.getByTestId('score-value-a')).toHaveText('0');
    await expect(sharedPage.getByTestId('score-value-b')).toHaveText('0');
  });

  test('[CONTROL-02] Single deliberate click increments score to 1', async () => {
    await sharedPage.getByTestId('score-panel-a').click();
    await sharedPage.waitForTimeout(2000); // network + realtime
    await expect(sharedPage.getByTestId('score-value-a')).toHaveText('1');
    await expect(sharedPage.getByTestId('score-value-b')).toHaveText('0');
  });

  test('[CONTROL-03] Decrement button brings score back to 0', async () => {
    await sharedPage.getByTestId('score-panel-a').click();
    await sharedPage.waitForTimeout(2000);
    await expect(sharedPage.getByTestId('score-value-a')).toHaveText('1');
    
    await sharedPage.getByTestId('decrement-a').click();
    await sharedPage.waitForTimeout(2000);
    await expect(sharedPage.getByTestId('score-value-a')).toHaveText('0');
  });

  // --- REGRESSION GROUP ---
  // To reproduce the concurrent render freeze reliably in a fast local test environment,
  // we need to simulate real-world network latency so the Server Actions overlap.
  test.beforeEach(async () => {
    await sharedPage.route('**/*', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise(r => setTimeout(r, 200));
      }
      await route.fallback();
    });
  });

  test('[REGRESSION-01] Five rapid clicks settle on score 5', async () => {
    const panel = sharedPage.getByTestId('score-panel-a');
    for (let i = 0; i < 5; i++) {
      await panel.click({ force: true });
    }
    await sharedPage.waitForTimeout(4000);
    await expect(sharedPage.getByTestId('score-value-a')).toHaveText('5');
    await expect(sharedPage.getByTestId('score-value-b')).toHaveText('0');
  });

  test('[REGRESSION-02] Alternating rapid clicks on both teams settle correctly', async () => {
    const panelA = sharedPage.getByTestId('score-panel-a');
    const panelB = sharedPage.getByTestId('score-panel-b');
    await panelA.click({ force: true });
    await panelB.click({ force: true });
    await panelA.click({ force: true });
    await panelB.click({ force: true });
    await panelA.click({ force: true });

    await sharedPage.waitForTimeout(4000);
    await expect(sharedPage.getByTestId('score-value-a')).toHaveText('3');
    await expect(sharedPage.getByTestId('score-value-b')).toHaveText('2');
  });

  test('[REGRESSION-03] Three rapid taps on mobile viewport settle correctly', async () => {
    await sharedPage.setViewportSize({ width: 390, height: 844 });
    const panel = sharedPage.getByTestId('score-panel-a');
    for (let i = 0; i < 3; i++) {
      await panel.tap({ force: true });
    }
    await sharedPage.waitForTimeout(4000);
    await expect(sharedPage.getByTestId('score-value-a')).toHaveText('3');
  });

  test('[REGRESSION-04] Match-over modal "Undo Point" works after reaching game point', async () => {
    // Setup: set score to 24-23
    await adminClient
      .from('matches')
      .update({ team_a_score: 24, team_b_score: 23 })
      .eq('session_id', testSessionId);

    await sharedPage.reload();
    await expect(sharedPage.getByTestId('score-value-a')).toHaveText('24');

    // Trigger match-over
    await sharedPage.getByTestId('score-panel-a').click();
    await expect(sharedPage.getByTestId('match-over-modal')).toBeVisible();

    // Undo
    await sharedPage.getByTestId('undo-point-btn').click();
    await sharedPage.waitForTimeout(2000);
    
    await expect(sharedPage.getByTestId('match-over-modal')).toBeHidden();
    await expect(sharedPage.getByTestId('score-value-a')).toHaveText('24');
  });
});
