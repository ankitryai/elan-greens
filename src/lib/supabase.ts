// Public read-only Supabase client.
// WHY no cookie handling? The main app has no auth — all data is public.
// RLS on the DB ensures the anon key can only SELECT active, non-deleted rows.

import { createClient } from '@supabase/supabase-js'

export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createClient(url, key)
}
