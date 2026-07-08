import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// This client uses the Service Role Key to bypass RLS.
// ONLY USE THIS IN SECURE SERVER ACTIONS OR API ROUTES.
export function createAdminClient() {
  return createClient<Database>(
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
