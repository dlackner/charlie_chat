// src/lib/pricing.ts

type UserClass = 'charlie_chat' | 'charlie_chat_pro' | 'cohort';

interface PropertyPackage { amount: number; price: number; }

// Client-safe loader that inlines NEXT_PUBLIC_ vars or falls back
function publicNum(key: string, fallback: number): number {
  const raw = process.env[key];            // inlined by Next.js
  const n   = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const PACKAGES: Record<UserClass, PropertyPackage[]> = {
  charlie_chat: [
    { amount:  25, price: publicNum('NEXT_PUBLIC_APP_CHARLIE_CHAT_25_PACK_PRICE', 29) },
    { amount:  50, price: publicNum('NEXT_PUBLIC_APP_CHARLIE_CHAT_50_PACK_PRICE', 39) },
    { amount: 100, price: publicNum('NEXT_PUBLIC_APP_CHARLIE_CHAT_100_PACK_PRICE',49) },
  ],
  charlie_chat_pro: [
    { amount: 100, price: publicNum('NEXT_PUBLIC_APP_CHARLIE_CHAT_PRO_100_PACK_PRICE',29) },
  ],
  cohort: [
    { amount: 100, price: publicNum('NEXT_PUBLIC_APP_MULTIFAMILYOS_100_PACK_PRICE',229) },
  ],
};

export const getPackagesFor = (u: UserClass) => PACKAGES[u];
