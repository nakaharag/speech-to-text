# User Authentication, Dashboard & Freemium Billing System

## Overview

Migrate speech-to-text.me from React to Next.js, implementing user authentication (social + email/password), a hub-style dashboard, freemium subscription tiers with Stripe, and Cloudflare R2 storage for audio files.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Pages     │  │  NextAuth   │  │   API Routes        │  │
│  │  (SSR/SSG)  │  │  (Auth)     │  │  (Stripe, proxy)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     NestJS Backend                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │Transcribe│ │ PDF/TTS  │ │  Stripe  │ │ R2 Storage    │   │
│  │ Service  │ │ Service  │ │ Webhooks │ │ (presigned)   │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│  ┌──────────────────┐           ┌───────────────────────┐   │
│  │    PostgreSQL    │           │    Cloudflare R2      │   │
│  │  (Prisma ORM)    │           │   (audio/MP3 files)   │   │
│  └──────────────────┘           └───────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Responsibilities

| Layer | Handles |
|-------|---------|
| **Next.js** | UI, SSR pages, auth (NextAuth), Stripe checkout/portal |
| **NestJS** | Heavy processing (transcription, TTS, OCR), Stripe webhooks, R2 uploads, rate limiting |
| **PostgreSQL** | Users, subscriptions, transcriptions metadata, shares |
| **Cloudflare R2** | Audio files, generated MP3s |

---

## Authentication

### Providers

| Provider | Method |
|----------|--------|
| Google | OAuth 2.0 |
| Apple | OAuth |
| Twitter/X | OAuth 2.0 |
| Email/Password | Credentials + email verification |

### Password Requirements

- Minimum 8 characters
- At least 1 letter
- At least 1 number

### Session Strategy

- JWT tokens in httpOnly, secure, sameSite=strict cookies
- Access token: 15 min expiry
- Refresh token: 7 days expiry
- Session extended on activity

### Email Verification

- Required before account is active
- Email service: Resend (free tier: 3k emails/month)
- Used for: verification, password reset, subscription receipts

### Auth Flow

1. User signs up with email/password
2. Verification email sent
3. User clicks verification link
4. Account activated, can access dashboard

Social logins bypass email verification (email already verified by provider).

---

## Subscription Tiers

| Tier | Monthly | Yearly | Transcriptions | PDF/OCR | History | Ads |
|------|---------|--------|----------------|---------|---------|-----|
| **Free** | $0 | $0 | 5/day | 5/day | Last 5 | Yes |
| **Basic** | $7 | $59 | 15/day | 5/month | Full | No |
| **Pro** | $15 | $129 | Unlimited | 100/month | Full | No |
| **Enterprise** | Contact | Contact | Custom | Custom | Full | No |

### Billing Details

- Payment processor: Stripe
- Yearly discount: ~30% off
- No free trial (free tier serves as trial)
- Cancellation: access until period ends, then downgrade to free

### Downgrade Behavior

- Data is never deleted
- History visibility changes based on tier
- Free/Basic: only last 5 items visible
- Full history restored on upgrade

---

## Database Schema

### User Model

```prisma
model User {
  id                   String    @id @default(cuid())
  email                String    @unique
  emailVerified        DateTime?
  passwordHash         String?
  name                 String?
  image                String?

  // Social provider IDs
  googleId             String?   @unique
  appleId              String?   @unique
  twitterId            String?   @unique

  // Subscription
  tier                 String    @default("free")
  stripeCustomerId     String?   @unique
  stripeSubscriptionId String?
  subscriptionStatus   String?
  subscriptionEndsAt   DateTime?

  // Relations
  transcriptions       Transcription[]
  pdfConversions       PdfConversion[]
  shares               Share[]
  usageCounter         UsageCounter?

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
}
```

### Usage Counter Model

```prisma
model UsageCounter {
  id                   String   @id @default(cuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id])

  transcriptionsToday  Int      @default(0)
  transcriptionsDate   String
  ocrThisMonth         Int      @default(0)
  ocrMonth             String
}
```

### Transcription Model (Updated)

```prisma
model Transcription {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])

  transcript    String   @db.Text
  corrected     String?  @db.Text
  summary       String?  @db.Text
  language      String?

  audioKey      String?
  audioSize     Int?
  audioDuration Float?

  createdAt     DateTime @default(now())
}
```

### PdfConversion Model (Updated)

```prisma
model PdfConversion {
  // Add user relation
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])

  // Add MP3 storage key
  mp3Key        String?

  // ... existing fields remain
}
```

### Share Model (Updated)

```prisma
model Share {
  id              String   @id @default(cuid())
  shortId         String   @unique  // 16+ chars nanoid

  userId          String
  user            User     @relation(fields: [userId], references: [id])

  transcriptionId String?
  pdfConversionId String?

  passwordHash    String?

  expiresAt       DateTime
  createdAt       DateTime @default(now())
}
```

### Verification Token Model

```prisma
model VerificationToken {
  identifier    String
  token         String   @unique
  expires       DateTime

  @@unique([identifier, token])
}
```

---

## Storage (Cloudflare R2)

### Bucket Structure

```
speech-to-text-storage/
├── audio/{userId}/{transcriptionId}.webm
├── mp3/{userId}/{pdfConversionId}.mp3
└── temp/{uploadId}.tmp
```

### Access Control

- Bucket is private (no public access)
- All files accessed via presigned URLs
- URLs expire after 5 minutes
- Presigned URL generation requires:
  1. Valid user session
  2. Ownership verification (userId matches)

### Pricing

- Storage: $0.015/GB/month (first 10GB free)
- Egress: $0 (free)
- Class A ops: $4.50/million
- Class B ops: $0.36/million

---

## Rate Limiting

### Limits by Tier

| Tier | Transcriptions | PDF/OCR |
|------|----------------|---------|
| Free | 5/day | 5/day |
| Basic | 15/day | 5/month |
| Pro | Unlimited | 100/month |

### Anonymous Users

- Tracked by IP address
- Same limits as free tier (5/day)
- No history saved

### Rate Limit Response

```json
{
  "error": "Rate limit exceeded",
  "limit": 5,
  "used": 5,
  "resetsAt": "2024-01-16T00:00:00Z",
  "upgrade": "/pricing"
}
```

---

## Dashboard

### Layout (Hub-style)

- Welcome banner with current plan
- Usage stats cards (today's usage, monthly OCR, total items)
- Quick action buttons (New Transcription, Convert PDF)
- History list with filter/search
- Upgrade prompt for free users viewing limited history

### Pages

| Page | Route | Access |
|------|-------|--------|
| Landing | `/` | Public (SSG) |
| Transcribe | `/transcribe` | Public |
| PDF to Audio | `/pdf-to-audio` | Public |
| Pricing | `/pricing` | Public (SSG) |
| Login | `/login` | Public |
| Sign Up | `/signup` | Public |
| Verify Email | `/verify` | Public |
| Dashboard | `/dashboard` | Auth required |
| Settings | `/dashboard/settings` | Auth required |
| Billing | `/dashboard/billing` | Auth required |
| Share Page | `/s/{shortId}` | Public (SSR) |

---

## Share Pages

### URL Format

```
https://speech-to-text.me/s/{shortId}
```

- shortId: 16+ characters (nanoid)

### Expiration Options

| Tier | Options |
|------|---------|
| Free/Basic | 24 hours, 7 days, 30 days |
| Pro | 24 hours, 7 days, 30 days, Never |

### Password Protection

- Optional password when creating share
- Password hashed with bcrypt
- On access: prompt for password, validate, set 1-hour auth cookie

### Ads on Share Pages

| Owner Tier | Show Ads |
|------------|----------|
| Free | Yes |
| Basic | Yes |
| Pro | No |

---

## Security

### Authentication

- Password hashing: bcrypt (12 rounds)
- JWT in httpOnly, secure, sameSite=strict cookies
- CSRF protection: built into NextAuth
- Login rate limit: 5 attempts per 15 min per IP

### Data Access

- All queries include userId ownership check
- R2 files: presigned URLs with ownership verification
- Share IDs: 16+ char random (non-guessable)
- Share passwords: bcrypt hashed

### Ownership Check Pattern

```typescript
async getTranscription(id: string, userId: string) {
  const item = await prisma.transcription.findFirst({
    where: { id, userId }
  });
  if (!item) throw new NotFoundException();
  return item;
}
```

---

## Stripe Integration

### Products

| Product | Monthly Price ID | Yearly Price ID |
|---------|------------------|-----------------|
| Basic | `price_basic_monthly` | `price_basic_yearly` |
| Pro | `price_pro_monthly` | `price_pro_yearly` |

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/stripe/checkout` | Create checkout session |
| `POST /api/stripe/portal` | Open customer portal |
| `POST /api/stripe/webhook` | Handle Stripe events (NestJS) |

### Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set user tier, store subscription ID |
| `customer.subscription.updated` | Update tier if plan changed |
| `customer.subscription.deleted` | Downgrade to free |
| `invoice.payment_failed` | Mark status as past_due |

---

## Next.js File Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── verify/page.tsx
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── pricing/page.tsx
│   │   └── about/page.tsx
│   ├── (app)/
│   │   ├── transcribe/page.tsx
│   │   ├── pdf-to-audio/page.tsx
│   │   └── dashboard/
│   │       ├── page.tsx
│   │       ├── settings/page.tsx
│   │       └── billing/page.tsx
│   ├── s/[shortId]/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── stripe/
│       │   ├── checkout/route.ts
│       │   └── portal/route.ts
│       └── proxy/[...path]/route.ts
├── components/
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   └── stripe.ts
└── ...
```

---

## Implementation Phases with Validation Checkpoints

### Phase 1: Next.js Setup + Auth Foundation

**Tasks:**
1. Create new Next.js 14 project with App Router
2. Set up Tailwind CSS + existing styles migration
3. Configure NextAuth.js with Google provider
4. Create login/signup/verify pages
5. Set up Prisma with updated User schema
6. Implement email verification with Resend

**Validation Checkpoint:**
- [ ] Can sign up with Google OAuth
- [ ] Can sign up with email/password
- [ ] Email verification sent and works
- [ ] Login/logout works correctly
- [ ] Session persists across page refresh
- [ ] Protected routes redirect to login

---

### Phase 2: Add Apple + Twitter/X OAuth

**Tasks:**
1. Configure Apple OAuth provider
2. Configure Twitter/X OAuth provider
3. Account linking (connect multiple providers to one account)
4. Settings page for managing connected accounts

**Validation Checkpoint:**
- [ ] Can sign up/login with Apple
- [ ] Can sign up/login with Twitter/X
- [ ] Can link additional providers to existing account
- [ ] Can unlink providers (if more than one remains)

---

### Phase 3: Migrate Core Pages

**Tasks:**
1. Migrate landing page (SSG)
2. Migrate transcribe page
3. Migrate PDF-to-audio page
4. Migrate about/contact pages
5. Set up API proxy to NestJS backend
6. Update NestJS to accept auth from Next.js

**Validation Checkpoint:**
- [ ] Landing page renders with SSG
- [ ] Transcription works for logged-in users
- [ ] Transcription works for anonymous users
- [ ] PDF-to-audio works for logged-in users
- [ ] Results saved to user's history
- [ ] Rate limiting works based on user/IP

---

### Phase 4: Dashboard + History

**Tasks:**
1. Create dashboard hub page
2. Implement history list with pagination
3. Add filter/search for history
4. Show usage stats (today's count, monthly OCR)
5. Implement "last 5" visibility for free users
6. Create settings page (profile, password)

**Validation Checkpoint:**
- [ ] Dashboard shows usage stats correctly
- [ ] History list displays user's items
- [ ] Free users only see last 5 items
- [ ] Can filter by type (transcription/PDF)
- [ ] Can search history
- [ ] Settings page allows profile updates
- [ ] Can change password

---

### Phase 5: Stripe Billing Integration

**Tasks:**
1. Create Stripe products and prices
2. Implement checkout session creation
3. Implement customer portal redirect
4. Create pricing page
5. Handle Stripe webhooks in NestJS
6. Update user tier on subscription changes

**Validation Checkpoint:**
- [ ] Pricing page shows all tiers
- [ ] Can initiate checkout for Basic/Pro
- [ ] Checkout completes and updates user tier
- [ ] Can access customer portal
- [ ] Can cancel subscription
- [ ] Webhook updates tier on subscription end
- [ ] Downgrade shows limited history

---

### Phase 6: Cloudflare R2 Storage

**Tasks:**
1. Create R2 bucket and configure access
2. Implement file upload to R2 in NestJS
3. Implement presigned URL generation
4. Update transcription flow to save audio
5. Update PDF conversion to save MP3
6. Implement secure download endpoints

**Validation Checkpoint:**
- [ ] Audio files upload to R2 after transcription
- [ ] MP3 files upload to R2 after PDF conversion
- [ ] Can play audio from history
- [ ] Can download MP3 from history
- [ ] Presigned URLs expire correctly
- [ ] Cannot access other users' files

---

### Phase 7: Share Pages + Password Protection

**Tasks:**
1. Update Share model with new fields
2. Create share page with SSR
3. Implement password protection flow
4. Add share creation modal with options
5. Implement ads display logic (owner tier)
6. Update share ID to 16+ characters

**Validation Checkpoint:**
- [ ] Can create share link from history item
- [ ] Share page renders with SSR (check page source)
- [ ] Can set password on share
- [ ] Password prompt appears for protected shares
- [ ] Correct password grants access
- [ ] Ads show for Free/Basic owner shares
- [ ] No ads for Pro owner shares
- [ ] Expiration options respect tier limits

---

### Phase 8: Polish + Migration Cleanup

**Tasks:**
1. Remove old React frontend
2. Update Docker configuration
3. Update Coolify deployment
4. Comprehensive testing
5. Performance optimization
6. Documentation update

**Validation Checkpoint:**
- [ ] Old frontend removed
- [ ] Docker builds successfully
- [ ] Coolify deploys correctly
- [ ] All features work in production
- [ ] No console errors
- [ ] Lighthouse score acceptable
- [ ] Mobile responsive

---

## Environment Variables

### Next.js (.env.local)

```
# Auth
NEXTAUTH_URL=https://speech-to-text.me
NEXTAUTH_SECRET=<random-string>

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# Backend
BACKEND_URL=http://backend:3000
```

### NestJS (additional)

```
# R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=speech-to-text-storage

# Stripe (webhook handling)
STRIPE_WEBHOOK_SECRET=
```

---

## Success Criteria

1. Users can sign up/login with Google, Apple, X, or email/password
2. Email verification required for email signups
3. Dashboard shows usage stats and history
4. Free users limited to 5/day, see last 5 history items
5. Paid users have increased limits and full history
6. Stripe handles all billing (checkout, portal, webhooks)
7. Audio/MP3 files stored in R2, accessed via presigned URLs
8. Share pages are SSR, show ads based on owner tier
9. Share links are non-guessable, optionally password-protected
10. All data access is ownership-verified
