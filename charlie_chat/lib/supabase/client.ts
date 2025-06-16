// lib/client.ts

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 🚨 Only use this in server-side code like API routes or webhooks
export function createSupabaseAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,               // use private URL
    process.env.SUPABASE_SERVICE_ROLE_KEY!   // service-role key
  );
}
