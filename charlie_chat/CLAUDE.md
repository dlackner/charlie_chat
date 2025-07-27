# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Charlie Chat AI is a Next.js 15.3.0 application that provides AI-powered chat functionality with a focus on real estate analysis. Built as an assistant-ui starter project, it uses TypeScript with strict mode enabled, Tailwind CSS v4 for styling, and integrates with OpenAI for AI capabilities, Supabase for authentication and database, and Stripe for payment processing. The app includes specialized real estate tools, skip trace functionality, and property analysis features.

## Key Commands

```bash
# Development
npm run dev        # Start development server with Turbopack on http://localhost:3000

# Production
npm run build      # Build for production
npm run start      # Start production server

# Code Quality
npm run lint       # Run ESLint (note: next.config.ts ignores ESLint errors during builds)
```

## Architecture Overview

### App Router Structure (`/app`)
- Uses Next.js App Router with file-based routing
- API routes in `/app/api/` handle:
  - Chat functionality (`/api/chat/`)
  - Authentication (`/api/auth/`)
  - Real estate data (`/api/api-request/`)
  - Stripe webhooks and checkout (`/api/stripe/`)

### Authentication Flow
- NextAuth.js integration with custom Supabase adapter
- Auth context in `/contexts/AuthContext.tsx`
- Protected routes check authentication status
- Password reset flow through `/app/forgot-password/`

### AI Chat System
- Custom chat UI built with @assistant-ui/react components
- OpenAI integration through @ai-sdk/openai
- Chat components in `/components/assistant-ui/`
- Real-time streaming responses

### Property Analyzer Feature
- Complex investment analysis tool in `/app/property-analyzer/`
- Calculates IRR, NPV, and other real estate metrics
- Uses Recharts for data visualization
- Generates PDF/Word reports with jsPDF and docx

### Payment System
- Stripe integration for credit pack purchases
- Webhook handler in `/supabase/functions/stripe-webhook/`
- Pricing logic in `/lib/pricing.ts`

## Development Guidelines

### Environment Variables
Required in `.env.local`:
```
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Component Structure
- UI components use shadcn/ui pattern in `/components/ui/`
- Follow existing component patterns when creating new ones
- Components use Tailwind CSS v4 for styling

### API Route Patterns
- All API routes return consistent error responses
- Use Supabase client for database operations
- Authenticate requests using NextAuth session

### State Management
- Supabase Auth handled through custom AuthContext provider (`/contexts/AuthContext.tsx`)
- Chat state managed through ChatContext (`/contexts/ChatContext.tsx`)
- Listing data through ListingContext (`/contexts/ListingContext.tsx`)
- Local state with React hooks for component-specific data
- Zustand available for complex state needs

## Common Tasks

### Adding New Chat Features
1. Modify chat components in `/components/assistant-ui/`
2. Update API route in `/app/api/chat/`
3. Ensure proper OpenAI prompt engineering

### Working with Property Analyzer
1. Main logic in `/app/property-analyzer/page.tsx`
2. Calculation utilities within the component
3. Export functionality uses docx and jsPDF libraries

### Database Operations
- Use Supabase browser client from `/lib/supabase/client.ts` for client-side operations
- Use Supabase admin client for server-side operations requiring elevated privileges
- Follow existing patterns for CRUD operations
- Handle errors consistently

### Adding New Pages
1. Create directory in `/app/` with `page.tsx`
2. Add authentication check if needed using `useAuth()` hook
3. Include proper metadata exports
4. Wrap with appropriate context providers if needed

### Skip Trace Integration
- Skip trace functionality in `/components/skiptrace/`
- Service handles property data enrichment
- PDF generation for skip trace reports
- API endpoint at `/api/skiptrace/`

### Real Estate API Integration
- External real estate data through `/api/realestateapi/`
- Property classification and badge system
- Advanced filtering capabilities