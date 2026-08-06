/*
 * Server-side activity count increment.
 * Called directly (in-process) by server code - e.g. app/api/realestateapi/route.ts -
 * and via the /api/activity-count HTTP route for client-side callers.
 */

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const ACTIVITY_TYPES = [
  'offers_created',
  'lois_created',
  'marketing_letters_created',
  'emails_sent',
  'property_searches',
  'properties_retrieved',
] as const;

export type ServerActivityType = typeof ACTIVITY_TYPES[number];

export async function incrementActivityCountServer(
  userId: string,
  activityType: ServerActivityType,
  count: number = 1
): Promise<{ success: boolean; error?: string }> {
  if (!ACTIVITY_TYPES.includes(activityType)) {
    return { success: false, error: 'Invalid activity type' };
  }

  const incrementBy = Number.isInteger(count) && count > 0 ? count : 1;
  const supabase = createSupabaseAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase.rpc('increment_activity_count', {
    p_user_id: userId,
    p_activity_date: today,
    p_activity_type: activityType,
    p_count: incrementBy,
  });

  if (error) {
    console.error('❌ Error incrementing activity count:', error);
    return { success: false, error: 'Failed to increment activity count' };
  }

  return { success: true };
}
