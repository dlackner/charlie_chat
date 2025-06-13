// app/utils/chatlimits.js (or .ts if using TypeScript)

const MAX_CHATS_UNREGISTERED = 5;
const CHAT_COUNT_KEY = 'unregistered_chat_count'; // Renamed key

export function getUnregisteredChatCount() {
  if (typeof window !== 'undefined') { // Ensure running in browser environment
    const count = localStorage.getItem(CHAT_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  }
  return 0;
}

export function incrementUnregisteredChatCount() {
  if (typeof window !== 'undefined') {
    let count = getUnregisteredChatCount();
    count++;
    localStorage.setItem(CHAT_COUNT_KEY, count.toString());
    return count;
  }
  return 0;
}

export function hasReachedUnregisteredChatLimit() {
  return getUnregisteredChatCount() >= MAX_CHATS_UNREGISTERED;
}

export function resetUnregisteredChatCount() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CHAT_COUNT_KEY);
  }
}