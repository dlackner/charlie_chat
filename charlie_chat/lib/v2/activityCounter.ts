/*
 * CHARLIE2 V2 - Activity Counter Utility
 * Increments user activity counts for coaching metrics
 * Part of the new V2 application architecture
 */

/**
 * Activity Counter Utility
 * Increments user activity counts in the user_activity_counts table
 */

export type ActivityType = 'offers_created' | 'lois_created' | 'marketing_letters_created' | 'emails_sent';

/**
 * Increment activity count for today
 * @param userId - User UUID
 * @param activityType - Type of activity to increment
 * @returns Promise<boolean> - Success status
 */
export async function incrementActivityCount(userId: string, activityType: ActivityType): Promise<boolean> {
  try {
    const response = await fetch('/api/v2/activity-count', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        activityType,
      }),
    });

    if (!response.ok) {
      console.error('Failed to increment activity count:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error incrementing activity count:', error);
    return false;
  }
}