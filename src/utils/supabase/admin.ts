import { createClient } from '@supabase/supabase-js'

// This client uses the Service Role Key to bypass RLS.
// ONLY USE THIS IN SECURE SERVER ACTIONS OR API ROUTES.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
