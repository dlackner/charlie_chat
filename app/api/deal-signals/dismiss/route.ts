/*
 * "Not interested right now" for a single property on the Signal Feed - distinct from
 * favoriting/rejecting in Buy Box (user_favorites), which is a permanent decision read by
 * several other features (My Properties Kanban, recommendation engine, weekly digest).
 * A dismissal here is soft: /api/dashboard/signals hides the property only while its latest
 * event is no newer than dismissed_at - a genuinely new signal (a real escalation, not the
 * same stale trigger) makes it reappear on its own, no un-dismiss action needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { propertyId } = await req.json();
    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          }
        }
      }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from('deal_signal_dismissals').upsert(
      { user_id: user.id, property_id: propertyId, dismissed_at: new Date().toISOString() },
      { onConflict: 'user_id,property_id' }
    );

    if (error) {
      return NextResponse.json({ error: `Failed to dismiss: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected server error' }, { status: 500 });
  }
}
