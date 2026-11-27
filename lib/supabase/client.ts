'use client'

import { createBrowserClient } from '@supabase/ssr'

/** Browser Supabase client (anon key). Rarely needed — most reads/writes go through server actions. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  )
}
