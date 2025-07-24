// localStorage cleanup utilities for managing storage limits
// Automatically removes old chat data and documents to prevent storage overflow

interface ChatMessage {
  role: string;
  content: string;
  timestamp?: number;
}

const RETENTION_DAYS = 7;
const MAX_MESSAGES = 100;
const STORAGE_KEYS = [
  'chatMessages',
  'threadId', 
  'listings',
  'selectedListings',
  'batchSelectedListings',
  'currentBatch',
  'totalPropertiesToAnalyze',
  'isWaitingForContinuation'
];

/**
 * Check if localStorage is approaching its limit
 */
export const isStorageNearLimit = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const testKey = '__storage_test__';
    const testData = 'x'.repeat(1024 * 1024); // 1MB test
    localStorage.setItem(testKey, testData);
    localStorage.removeItem(testKey);
    return false;
  } catch (e) {
    return true;
  }
};

/**
 * Get storage size estimation in bytes
 */
export const getStorageSize = (): number => {
  if (typeof window === 'undefined') return 0;
  
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
};

/**
 * Clean up old chat messages, keeping only recent ones
 */
export const cleanupChatMessages = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const savedMessages = localStorage.getItem('chatMessages');
    if (!savedMessages) return;
    
    const messages: ChatMessage[] = JSON.parse(savedMessages);
    if (!Array.isArray(messages)) return;
    
    // Add timestamps to messages that don't have them
    const now = Date.now();
    const messagesWithTimestamps = messages.map((msg, index) => ({
      ...msg,
      timestamp: msg.timestamp || (now - (messages.length - index) * 60000) // Fake older timestamps
    }));
    
    // Keep messages from last 7 days OR last 100 messages, whichever is more restrictive
    const cutoffTime = now - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    let recentMessages = messagesWithTimestamps.filter(msg => 
      msg.timestamp && msg.timestamp > cutoffTime
    );
    
    // If still too many, keep only the most recent MAX_MESSAGES
    if (recentMessages.length > MAX_MESSAGES) {
      recentMessages = recentMessages
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, MAX_MESSAGES);
    }
    
    // Save cleaned messages
    if (recentMessages.length < messages.length) {
      localStorage.setItem('chatMessages', JSON.stringify(recentMessages));
      console.log(`[Cleanup] Removed ${messages.length - recentMessages.length} old chat messages`);
    }
    
  } catch (error) {
    console.error('[Cleanup] Error cleaning chat messages:', error);
    // If parsing fails, remove corrupted data
    localStorage.removeItem('chatMessages');
  }
};

/**
 * Clean up document-related data
 */
export const cleanupDocuments = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  // Remove thread ID to disconnect from document context
  localStorage.removeItem('threadId');
  delete (window as any).__CURRENT_THREAD_ID__;
  delete (window as any).__LATEST_FILE_ID__;
  delete (window as any).__LATEST_FILE_NAME__;
  
  console.log('[Cleanup] Cleared document references');
};

/**
 * Perform full cleanup of localStorage
 */
export const performFullCleanup = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  
  console.log('[Cleanup] Starting localStorage cleanup...');
  
  const sizeBefore = getStorageSize();
  
  // Clean up chat messages
  cleanupChatMessages();
  
  // Clean up documents
  await cleanupDocuments();
  
  // Remove any other old/corrupted data
  for (const key of STORAGE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        JSON.parse(value); // Test if valid JSON
      }
    } catch (error) {
      console.log(`[Cleanup] Removing corrupted data for key: ${key}`);
      localStorage.removeItem(key);
    }
  }
  
  const sizeAfter = getStorageSize();
  const savedBytes = sizeBefore - sizeAfter;
  
  if (savedBytes > 0) {
    console.log(`[Cleanup] Freed ${Math.round(savedBytes / 1024)}KB of storage`);
  }
};

/**
 * Safe localStorage write with automatic cleanup on failure
 */
export const safeLocalStorageWrite = async (key: string, value: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.log('[Cleanup] Storage write failed, performing cleanup...');
    await performFullCleanup();
    
    // Try again after cleanup
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (secondError) {
      console.error('[Cleanup] Storage write failed even after cleanup:', secondError);
      return false;
    }
  }
};