# Pro Signup Page

## Overview

The `/pro-signup` page is a dedicated signup flow for Pro users coming from external partner sites (e.g., the legacy capital club platform). It provides a streamlined, direct path to create a Pro account and proceed to Stripe checkout.

## Purpose

- **Direct signup for Pro users** - Bypasses the standard pricing page
- **Partner integration** - Shared URL with external platforms to funnel Pro users
- **One-click flow** - Opens modal immediately with Pro tier pre-selected
- **Hidden from main UI** - Not linked anywhere on the public site, only shared privately with partners

## How It Works

### User Flow

1. **User clicks shared link** → `https://yourdomain.com/pro-signup`
2. **Modal opens automatically** with Pro tier and billing frequency selector
3. **User enters email** and chooses Monthly or Annual billing
4. **Account created via `/api/auth/direct-signup`** with `userClass: 'pro'`
5. **User authenticated** with generated magic link token
6. **Redirected to Stripe checkout** automatically
7. **After payment**, Stripe webhook syncs subscription to database
8. **User becomes Pro subscriber** immediately

### Technical Details

**File:** `/app/pro-signup/page.tsx`

**Component Flow:**
- Imports `DirectCheckoutModal` (reused from pricing page)
- Opens modal with `selectedPlan: 'pro'` by default
- Handles direct signup via `/api/auth/direct-signup` endpoint
- Automatically proceeds to Stripe checkout after account creation
- Closes modal and redirects if user cancels

**Key Differences from Pricing Page:**
- No pricing cards or comparisons shown
- Modal opens immediately (not behind a button click)
- Only Pro tier available (no Plus option)
- Minimal UI (just the modal on a blank background)

## Usage

### Sharing the Link

Share this URL with the partner site:
```
https://yourdomain.com/pro-signup
```

### Local Testing

During development, test at:
```
http://localhost:3000/pro-signup
```

### Customization

To change billing frequency default, modify line in the page:
```typescript
const [isAnnual, setIsAnnual] = useState(false); // Change to true for annual default
```

## States & Error Handling

- **Modal opens** - Default state when page loads
- **Loading state** - While account is being created and Stripe checkout URL is fetched
- **Success** - User redirected to Stripe checkout
- **Error** - Alert shown, user can retry

## Notes

- This is a **Pro-only** signup flow (hardcoded `userClass: 'pro'`)
- No trial period - users proceed directly to paid subscription
- Email must be unique (returns error if already registered)
- Users from the partner site should use only this link, not the main `/pricing` page
