/*
 * CHARLIE2 V2 - Dashboard Recent Activity API
 * Fetches recent user activity data from user_activity_counts table
 * Part of the new V2 application architecture
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // Get activity from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activityData, error } = await supabase
      .from('user_activity_counts')
      .select('activity_type, activity_date, count')
      .eq('user_id', userId)
      .gte('activity_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('activity_date', { ascending: false });

    if (error) {
      console.error('Activity data error:', error);
      throw error;
    }

    // Group by activity type and sum counts
    const activitySummary = activityData?.reduce((acc, item) => {
      if (!acc[item.activity_type]) {
        acc[item.activity_type] = {
          total: 0,
          latestDate: item.activity_date
        };
      }
      acc[item.activity_type].total += item.count;
      
      // Keep track of the most recent date for each activity type
      if (item.activity_date > acc[item.activity_type].latestDate) {
        acc[item.activity_type].latestDate = item.activity_date;
      }
      
      return acc;
    }, {} as Record<string, { total: number; latestDate: string }>) || {};

    // Create activity items for display
    const activityItems = [];

    // Marketing Letters
    if (activitySummary.marketing_letters_created?.total > 0) {
      const count = activitySummary.marketing_letters_created.total;
      const date = new Date(activitySummary.marketing_letters_created.latestDate);
      activityItems.push({
        type: 'marketing',
        title: 'Marketing letters created',
        description: `${count} ${count === 1 ? 'letter' : 'letters'} generated this week`,
        time: getRelativeTime(date),
        icon: 'mail'
      });
    }

    // Emails Sent
    if (activitySummary.emails_sent?.total > 0) {
      const count = activitySummary.emails_sent.total;
      const date = new Date(activitySummary.emails_sent.latestDate);
      activityItems.push({
        type: 'engagement',
        title: 'Emails sent',
        description: `${count} ${count === 1 ? 'email' : 'emails'} sent to property owners`,
        time: getRelativeTime(date),
        icon: 'users'
      });
    }

    // LOIs Created
    if (activitySummary.lois_created?.total > 0) {
      const count = activitySummary.lois_created.total;
      const date = new Date(activitySummary.lois_created.latestDate);
      activityItems.push({
        type: 'analysis',
        title: 'LOIs created',
        description: `${count} Letter${count === 1 ? '' : 's'} of Intent generated`,
        time: getRelativeTime(date),
        icon: 'file-text'
      });
    }

    // Offers Created
    if (activitySummary.offers_created?.total > 0) {
      const count = activitySummary.offers_created.total;
      const date = new Date(activitySummary.offers_created.latestDate);
      activityItems.push({
        type: 'analysis',
        title: 'Offers created',
        description: `${count} investment offer${count === 1 ? '' : 's'} analyzed and saved`,
        time: getRelativeTime(date),
        icon: 'bar-chart'
      });
    }

    // Sort by most recent first
    activityItems.sort((a, b) => {
      const aTime = parseRelativeTime(a.time);
      const bTime = parseRelativeTime(b.time);
      return aTime - bTime;
    });

    // If no activity, return placeholder
    if (activityItems.length === 0) {
      activityItems.push({
        type: 'info',
        title: 'Getting started',
        description: 'Start using the platform to see your activity here',
        time: 'Welcome!',
        icon: 'info'
      });
    }

    return NextResponse.json({
      activities: activityItems.slice(0, 4) // Limit to 4 items
    });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
      { status: 500 }
    );
  }
}

// Helper function to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
}

// Helper function to parse relative time for sorting
function parseRelativeTime(timeStr: string): number {
  if (timeStr === 'Just now') return 0;
  if (timeStr === 'Welcome!') return Infinity;
  
  const match = timeStr.match(/(\d+)\s+(minute|hour|day)s?\s+ago/);
  if (!match) return Infinity;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'minute': return value;
    case 'hour': return value * 60;
    case 'day': return value * 1440;
    default: return Infinity;
  }
}