import { createAdminClient } from '../../src/lib/supabase/admin';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { beforeAll, afterAll } from 'vitest';

// ---------------------------------------------------------------------------
// Hey, user lifecycle helpers
// ---------------------------------------------------------------------------

/**
 * Creates a temporary test user via the Supabase Admin API.
 * The email is auto‑generated using a timestamp unless a custom one is provided.
 *
 * @returns The user object and an admin client (for later deletion).
 */
export async function createTestUser(email?: string): Promise<{
  user: User;
  adminClient: SupabaseClient;
}> {
  const adminClient = createAdminClient();
  const testEmail = email ?? `integration-test-${Date.now()}@example.com`;

  const {
    data: { user },
    error,
  } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: 'testPassword123!',
    email_confirm: true,
  });

  if (error || !user) {
    throw new Error(
      `Failed to create test user: ${error?.message ?? 'unknown error'}`,
    );
  }

  return { user, adminClient };
}

/**
 * Permanently deletes a test user (and any cascaded data).
 * Accepts an optional admin client to avoid creating a new one.
 */
export async function deleteTestUser(
  userId: string,
  adminClient?: SupabaseClient,
): Promise<void> {
  const client = adminClient ?? createAdminClient();
  const { error } = await client.auth.admin.deleteUser(userId);
  if (error) {
    console.error(`Cleanup error for user ${userId}:`, error.message);
  }
}

// ---------------------------------------------------------------------------
// Suite‑level cleanup hooks
// ---------------------------------------------------------------------------

/**
 * Purges all users whose email starts with the integration‑test prefix.
 * Call this inside a `beforeAll` to guarantee a clean slate.
 */
export async function purgeStaleTestUsers(): Promise<void> {
  const client = createAdminClient();
  const {
    data: { users },
    error,
  } = await client.auth.admin.listUsers();
  if (error) return;

  const stale = users.filter((u) =>
    u.email?.startsWith('integration-test-'),
  );
  await Promise.allSettled(
    stale.map((u) => client.auth.admin.deleteUser(u.id)),
  );
}

/**
 * Registers `beforeAll` / `afterAll` hooks that:
 *   1. Remove any leftover test users before the suite starts.
 *   2. Provide a fresh test user and an `afterAll` that deletes it.
 *
 * Usage inside any test file:
 * ```ts
 * const { user, adminClient } = await setupTestLifecycle();
 * // … tests use `user.id` …
 * // The user is automatically removed after the suite.
 * ```
 *
 * If you need multiple users per suite, call `createTestUser` / `deleteTestUser` manually.
 */
export function setupTestLifecycle(): { user: User; adminClient: SupabaseClient } {
  let user: User;
  let adminClient: SupabaseClient;

  beforeAll(async () => {
    await purgeStaleTestUsers();
    const created = await createTestUser();
    user = created.user;
    adminClient = created.adminClient;
  });

  afterAll(async () => {
    if (user) {
      await deleteTestUser(user.id, adminClient);
    }
  });

  // The references are not yet populated at top‑level – callers must use the
  // returned object inside `it` blocks (where `beforeAll` has already run).
  // Vitest ensures `beforeAll` finishes before any test runs, so this works.
  return new Proxy({} as { user: User; adminClient: SupabaseClient }, {
    get(_, prop) {
      if (prop === 'user') return user;
      if (prop === 'adminClient') return adminClient;
    },
  });
}
