/*
 * CHARLIE2 V2 - Reminders API
 * Extracts reminders from property notes using @MM/DD/YYYY format
 * Part of the new V2 API architecture
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface ParsedReminder {
  id: string;
  property_id: string;
  property_address: string;
  reminder_date: string;
  reminder_text: string;
  original_note: string;
  type: 'today' | 'upcoming' | 'overdue';
  priority: 'high' | 'medium' | 'low';
}

function parseRemindersFromNote(note: string): { date: string; text: string }[] {
  if (!note) {
    return [];
  }
  
  const reminders: { date: string; text: string }[] = [];
  const reminderRegex = /@(\d{1,2})\/(\d{1,2})\/(\d{4})\s*([^@]*)/g;
  let match;
  
  // Find all date matches and their associated text
  while ((match = reminderRegex.exec(note)) !== null) {
    const [, month, day, year, text] = match;
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);
    const yearNum = parseInt(year);
    
    // Validate date components
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 2020 && yearNum <= 2030) {
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Clean up the text - remove leading/trailing whitespace and newlines
      const cleanText = text.trim().split('\n')[0].trim();
      
      reminders.push({
        date: formattedDate,
        text: cleanText || 'No reminder text'
      });
    }
  }
  
  return reminders;
}

function categorizeReminder(reminderDate: string): { type: 'today' | 'upcoming' | 'overdue'; priority: 'high' | 'medium' | 'low' } {
  // Use local timezone for both dates to avoid UTC conversion issues
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
  
  // Parse date components manually to avoid timezone issues
  const [year, month, day] = reminderDate.split('-').map(Number);
  const reminder = new Date(year, month - 1, day); // month is 0-based in Date constructor
  reminder.setHours(0, 0, 0, 0);
  
  const diffTime = reminder.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Get the date 7 days from today
  const sevenDaysFromToday = new Date(today);
  sevenDaysFromToday.setDate(today.getDate() + 7);
  
  // Determine type
  let type: 'today' | 'upcoming' | 'overdue';
  if (diffDays === 0) {
    type = 'today';
  } else if (diffDays > 0 && diffDays <= 7) {
    type = 'upcoming'; // Next 7 days (1-7 days from today)
  } else {
    type = 'overdue'; // Past dates or dates beyond 7 days
  }
  
  // Determine priority based on how overdue or close it is
  let priority: 'high' | 'medium' | 'low';
  if (type === 'overdue') {
    priority = Math.abs(diffDays) > 7 ? 'high' : 'medium';
  } else if (type === 'today') {
    priority = 'high';
  } else {
    priority = diffDays <= 7 ? 'medium' : 'low';
  }
  
  return { type, priority };
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user favorites with notes
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        property_id,
        notes,
        saved_properties:property_id (
          address_street,
          address_full,
          address_city,
          address_state
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .not('notes', 'is', null)
      .not('notes', 'eq', '');

    if (error) {
      console.error('Error fetching favorites with notes:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    // Parse reminders from notes
    const reminders: ParsedReminder[] = [];
    
    favorites.forEach((favorite) => {
      if (favorite.notes) {
        const parsedReminders = parseRemindersFromNote(favorite.notes);
        
        parsedReminders.forEach((parsed, index) => {
          const { type, priority } = categorizeReminder(parsed.date);
          const propertyData = favorite.saved_properties as any;
          
          reminders.push({
            id: `${favorite.property_id}-${parsed.date}-${index}`,
            property_id: favorite.property_id,
            property_address: propertyData?.address_street || propertyData?.address_full || 'Unknown Address',
            reminder_date: parsed.date,
            reminder_text: parsed.text,
            original_note: favorite.notes,
            type,
            priority
          });
        });
      }
    });

    // Sort reminders by date (overdue first, then by date)
    reminders.sort((a, b) => {
      // Overdue items first
      if (a.type === 'overdue' && b.type !== 'overdue') return -1;
      if (b.type === 'overdue' && a.type !== 'overdue') return 1;
      
      // Then by date
      return new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime();
    });

    return NextResponse.json({ 
      reminders,
      summary: {
        today: reminders.filter(r => r.type === 'today').length,
        upcoming: reminders.filter(r => r.type === 'upcoming').length,
        overdue: reminders.filter(r => r.type === 'overdue').length,
        total: reminders.length
      }
    });
    
  } catch (error) {
    console.error('Reminders API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}