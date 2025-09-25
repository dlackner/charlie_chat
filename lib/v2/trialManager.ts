/*
 * CHARLIE2 V2 - Trial Management System
 * Handles trial expiration logic and automatic conversion to core
 * Checks trial dates and updates user_class when 7 days have passed
 * Part of the new V2 application architecture
 */

import { createSupabaseAdminClient } from "@/lib/supabase/client";

/**
 * Check if a trial user has expired (past 7 days) and convert to core
 */
export async function checkAndUpdateTrialStatus(userId: string): Promise<{
  wasExpired: boolean;
  newUserClass: string | null;
}> {
  const supabase = createSupabaseAdminClient();

  try {
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_class, trial_end_date, created_at')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile for trial check:', profileError);
      return { wasExpired: false, newUserClass: null };
    }

    // Only check trial users
    if (profile.user_class !== 'trial') {
      return { wasExpired: false, newUserClass: profile.user_class };
    }

    // Determine trial end date
    let trialEndDate: Date;
    
    if (profile.trial_end_date) {
      // Use existing trial_end_date if available
      trialEndDate = new Date(profile.trial_end_date);
    } else {
      // Calculate from created_at (7 days)
      trialEndDate = new Date(profile.created_at);
      trialEndDate.setDate(trialEndDate.getDate() + 7);
    }

    const now = new Date();
    const isExpired = now > trialEndDate;

    if (isExpired) {
      // Convert trial to core
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          user_class: 'core',
          trial_expired_at: now.toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating expired trial user:', updateError);
        return { wasExpired: true, newUserClass: 'trial' }; // Keep as trial if update failed
      }

      console.log(`✅ Converted expired trial user ${userId} to core`);
      return { wasExpired: true, newUserClass: 'core' };
    }

    return { wasExpired: false, newUserClass: 'trial' };

  } catch (error) {
    console.error('Error in trial status check:', error);
    return { wasExpired: false, newUserClass: null };
  }
}

/**
 * Get days remaining in trial
 */
export async function getDaysRemainingInTrial(userId: string): Promise<number | null> {
  const supabase = createSupabaseAdminClient();

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('user_class, trial_end_date, created_at')
      .eq('user_id', userId)
      .single();

    if (error || !profile || profile.user_class !== 'trial') {
      return null;
    }

    // Determine trial end date
    let trialEndDate: Date;
    
    if (profile.trial_end_date) {
      trialEndDate = new Date(profile.trial_end_date);
    } else {
      trialEndDate = new Date(profile.created_at);
      trialEndDate.setDate(trialEndDate.getDate() + 7);
    }

    const now = new Date();
    const diffTime = trialEndDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);

  } catch (error) {
    console.error('Error calculating trial days remaining:', error);
    return null;
  }
}

/**
 * Check if user just converted from trial (for showing modal)
 */
export function shouldShowTrialEndModal(
  currentUserClass: string | null, 
  previousUserClass: string | null
): boolean {
  return previousUserClass === 'trial' && currentUserClass === 'core';
}

/**
 * Batch process to convert all expired trial users (for cron job)
 */
export async function processExpiredTrials(): Promise<{
  processed: number;
  errors: number;
}> {
  const supabase = createSupabaseAdminClient();
  let processed = 0;
  let errors = 0;

  try {
    // Get all trial users
    const { data: trialUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, created_at, trial_end_date')
      .eq('user_class', 'trial');

    if (fetchError) {
      console.error('Error fetching trial users:', fetchError);
      return { processed: 0, errors: 1 };
    }

    const now = new Date();

    for (const user of trialUsers || []) {
      try {
        // Determine trial end date
        let trialEndDate: Date;
        
        if (user.trial_end_date) {
          trialEndDate = new Date(user.trial_end_date);
        } else {
          trialEndDate = new Date(user.created_at);
          trialEndDate.setDate(trialEndDate.getDate() + 7);
        }

        if (now > trialEndDate) {
          // Convert to core
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              user_class: 'core',
              trial_expired_at: now.toISOString()
            })
            .eq('user_id', user.user_id);

          if (updateError) {
            console.error(`Error updating trial user ${user.user_id}:`, updateError);
            errors++;
          } else {
            processed++;
            console.log(`✅ Converted trial user ${user.user_id} to core`);
          }
        }
      } catch (error) {
        console.error(`Error processing trial user ${user.user_id}:`, error);
        errors++;
      }
    }

    console.log(`🔄 Trial processing complete: ${processed} converted, ${errors} errors`);
    return { processed, errors };

  } catch (error) {
    console.error('Error in batch trial processing:', error);
    return { processed: 0, errors: 1 };
  }
}