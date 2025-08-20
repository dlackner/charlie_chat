/**
 * Utility functions for parsing and managing property note reminders
 */

export interface ParsedReminder {
  date: Date;
  text: string;
  originalMatch: string;
  position: number;
}

export interface ReminderData {
  id: string;
  user_id: string;
  property_id: string;
  user_favorite_id: string;
  reminder_text: string;
  reminder_date: string;
  original_note_text: string;
  created_at: string;
  dismissed_at: string | null;
  is_dismissed: boolean;
}

/**
 * Parse @MM/DD/YY patterns from notes text
 * @param notes - The notes text to parse
 * @returns Array of parsed reminders
 */
export function parseRemindersFromNotes(notes: string): ParsedReminder[] {
  if (!notes) return [];

  // Regex to match @MM/DD/YY pattern (supports 1-2 digit months/days, 2-4 digit years)
  // Updated to handle cases with or without space after date, and extract text before the date
  const reminderRegex = /(.{0,50}?)@(\d{1,2})\/(\d{1,2})\/(\d{2,4})(\s+([^@]*?))?(?=@|$)/g;
  const reminders: ParsedReminder[] = [];
  let match;

  while ((match = reminderRegex.exec(notes)) !== null) {
    const [fullMatch, contextBefore, monthStr, dayStr, yearStr, , reminderText] = match;
    
    // Combine context before date with text after date
    const combinedText = (contextBefore?.trim() || '') + ' ' + (reminderText?.trim() || '');
    const cleanText = combinedText.trim() || 'Reminder';
    
    // Parse date components
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    let year = parseInt(yearStr, 10);
    
    // Handle 2-digit years (assume 20XX for years 00-99)
    if (year < 100) {
      year += 2000;
    }
    
    // Validate date
    const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
    
    // Check if date is valid and matches input (handles invalid dates like 2/30/24)
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      reminders.push({
        date,
        text: cleanText,
        originalMatch: fullMatch,
        position: match.index
      });
    }
  }

  return reminders;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Format date for display (e.g., "December 15, 2024")
 */
export function formatReminderDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Check if a reminder date string is today
 */
export function isReminderDueToday(reminderDate: string): boolean {
  const date = new Date(reminderDate);
  return isToday(date);
}

/**
 * Extract the text before a reminder pattern for context
 */
export function extractReminderContext(notes: string, reminderPosition: number, maxLength = 50): string {
  const before = notes.substring(Math.max(0, reminderPosition - maxLength), reminderPosition);
  const words = before.split(' ');
  
  // Take last few words for context, but don't start mid-word
  if (words.length > 1) {
    return '...' + words.slice(-8).join(' ');
  }
  
  return before;
}

/**
 * Generate a clean reminder text by combining context and reminder text
 */
export function generateReminderDisplayText(context: string, reminderText: string): string {
  // Remove common prefixes and clean up
  const cleanReminderText = reminderText
    .replace(/^(to\s+|need\s+to\s+|should\s+|must\s+)/i, '')
    .trim();
  
  if (context && context !== '...') {
    return `${context.replace(/^\.\.\./, '')} ${cleanReminderText}`;
  }
  
  return cleanReminderText;
}

// Example usage and test cases
if (typeof window === 'undefined') {
  // Only run tests in Node.js environment (not in browser)
  const testNotes = `
    Called seller, they want $450k. Need to @12/15/24 follow up after they talk to spouse. 
    Also mentioned @01/03/25 check if they reduced price after holidays.
    Property needs @02/28/24 schedule inspection with contractor.
  `;

  console.log('Test parsing:', parseRemindersFromNotes(testNotes));
}