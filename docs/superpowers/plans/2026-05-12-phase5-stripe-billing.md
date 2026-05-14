# Phase 5: Stripe Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Stripe subscription billing with checkout, customer portal, webhook handling, and tier enforcement.

**Architecture:** Create Stripe checkout sessions for upgrades, use Stripe Customer Portal for subscription management, handle webhooks with idempotency to sync subscription state, enforce tier limits throughout the app.

**Tech Stack:** Stripe SDK, Next.js API Routes, Prisma, PostgreSQL

**Prerequisites:** Phase 4 (Dashboard) must be complete. User model must have `tier` and `stripeCustomerId` fields.

---

## Task 1: Stripe Configuration and Environment Setup

**Files:**
- Modify: `frontend-next/.env.local` - Add Stripe keys
- Modify: `frontend-next/.env.example` - Document Stripe keys
- Create: `frontend-next/lib/stripe.ts` - Stripe client singleton

### Steps

- [ ] **Step 1.1: Add Stripe environment variables**

Add to `frontend-next/.env.local`:
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
```

- [ ] **Step 1.2: Update .env.example**

Add to `frontend-next/.env.example`:
```bash
# Stripe (get from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_BASIC_MONTHLY=price_your_basic_price_id
STRIPE_PRICE_PRO_MONTHLY=price_your_pro_price_id
```

- [ ] **Step 1.3: Install Stripe SDK**

```bash
cd frontend-next && npm install stripe @stripe/stripe-js
```

- [ ] **Step 1.4: Create Stripe server client**

Create `frontend-next/lib/stripe.ts`:
```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const STRIPE_PRICES = {
  basic: process.env.STRIPE_PRICE_BASIC_MONTHLY!,
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY!,
} as const;

export type PriceTier = keyof typeof STRIPE_PRICES;
```

- [ ] **Step 1.5: Create Stripe client-side loader**

Create `frontend-next/lib/stripe-client.ts`:
```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
}
```

- [ ] **Step 1.6: Add publishable key to env**

Add to `frontend-next/.env.local`:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

- [ ] **Step 1.7: Commit**

```bash
git add frontend-next/.env.example frontend-next/lib/stripe.ts frontend-next/lib/stripe-client.ts frontend-next/package.json frontend-next/package-lock.json
git commit -m "feat(billing): add Stripe SDK and configuration"
```

---

## Task 2: Prisma Schema Updates for Billing

**Files:**
- Modify: `frontend-next/prisma/schema.prisma` - Add subscription and event models

### Steps

- [ ] **Step 2.1: Add subscription fields to User model**

Update the User model in `frontend-next/prisma/schema.prisma`:
```prisma
model User {
  id                  String    @id @default(cuid())
  name                String?
  email               String    @unique
  emailVerified       DateTime?
  image               String?
  password            String?
  tier                String    @default("free") // free, basic, pro
  stripeCustomerId    String?   @unique
  subscriptionId      String?   @unique
  subscriptionStatus  String?   // active, canceled, past_due, etc.
  subscriptionEndDate DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  accounts            Account[]
  sessions            Session[]
  transcriptions      Transcription[]

  @@index([stripeCustomerId])
  @@index([subscriptionId])
}
```

- [ ] **Step 2.2: Add ProcessedStripeEvent model for idempotency**

Add to `frontend-next/prisma/schema.prisma`:
```prisma
model ProcessedStripeEvent {
  id          String   @id
  type        String
  processedAt DateTime @default(now())

  @@index([processedAt])
}
```

- [ ] **Step 2.3: Run migration**

```bash
cd frontend-next && npx prisma migrate dev --name add_billing_fields
```

- [ ] **Step 2.4: Verify migration**

```bash
npx prisma studio
```
Check that User has new fields and ProcessedStripeEvent table exists.

- [ ] **Step 2.5: Commit**

```bash
git add frontend-next/prisma/schema.prisma frontend-next/prisma/migrations/
git commit -m "feat(billing): add subscription fields and event idempotency table"
```

---

## Task 3: Create Checkout Session API

**Files:**
- Create: `frontend-next/app/api/billing/checkout/route.ts`
- Create: `frontend-next/lib/billing.ts` - Billing utilities

### Steps

- [ ] **Step 3.1: Create billing utilities**

Create `frontend-next/lib/billing.ts`:
```typescript
import { stripe, STRIPE_PRICES, PriceTier } from './stripe';
import { prisma } from './prisma';

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export function getPriceIdForTier(tier: PriceTier): string {
  const priceId = STRIPE_PRICES[tier];
  if (!priceId) {
    throw new Error(`Invalid tier: ${tier}`);
  }
  return priceId;
}

export const TIER_LIMITS = {
  free: {
    dailyTranscriptions: 5,
    historyVisible: 5,
    maxFileSizeMB: 25,
  },
  basic: {
    dailyTranscriptions: 25,
    historyVisible: 5,
    maxFileSizeMB: 50,
  },
  pro: {
    dailyTranscriptions: -1, // unlimited
    historyVisible: -1, // unlimited
    maxFileSizeMB: 100,
  },
} as const;

export type UserTier = keyof typeof TIER_LIMITS;
```

- [ ] **Step 3.2: Create checkout session endpoint**

Create `frontend-next/app/api/billing/checkout/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';
import { getOrCreateStripeCustomer, getPriceIdForTier } from '@/lib/billing';
import { PriceTier } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const tier = body.tier as PriceTier;

    if (!tier || !['basic', 'pro'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email
    );

    const priceId = getPriceIdForTier(tier);

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?upgrade=canceled`,
      subscription_data: {
        metadata: {
          userId: session.user.id,
          tier,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3.3: Test checkout endpoint manually**

```bash
curl -X POST http://localhost:3000/api/billing/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"tier": "basic"}'
```

Expected: Returns `{ "url": "https://checkout.stripe.com/..." }`

- [ ] **Step 3.4: Commit**

```bash
git add frontend-next/lib/billing.ts frontend-next/app/api/billing/checkout/route.ts
git commit -m "feat(billing): add checkout session API endpoint"
```

---

## Task 4: Stripe Webhook Handler with Idempotency

**Files:**
- Create: `frontend-next/app/api/webhooks/stripe/route.ts`

### Steps

- [ ] **Step 4.1: Create webhook handler**

Create `frontend-next/app/api/webhooks/stripe/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Idempotency check
  const existingEvent = await prisma.processedStripeEvent.findUnique({
    where: { id: event.id },
  });

  if (existingEvent) {
    console.log(`Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true });
  }

  try {
    await handleStripeEvent(event);

    // Mark event as processed
    await prisma.processedStripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
      },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.updated':
    case 'customer.subscription.created':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return;

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const tier = subscription.metadata?.tier || 'basic';

  await prisma.user.update({
    where: { id: userId },
    data: {
      tier,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    },
  });

  console.log(`User ${userId} upgraded to ${tier}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { subscriptionId: subscription.id },
  });

  if (!user) {
    console.error(`No user found for subscription ${subscription.id}`);
    return;
  }

  const tier = subscription.metadata?.tier || user.tier;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tier: subscription.status === 'active' ? tier : 'free',
      subscriptionStatus: subscription.status,
      subscriptionEndDate: new Date(subscription.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { subscriptionId: subscription.id },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tier: 'free',
      subscriptionStatus: 'canceled',
      subscriptionEndDate: null,
    },
  });

  console.log(`User ${user.id} subscription canceled, reverted to free`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const user = await prisma.user.findFirst({
    where: { subscriptionId: invoice.subscription as string },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'past_due',
    },
  });

  // TODO: Send email notification about failed payment
  console.log(`Payment failed for user ${user.id}`);
}
```

- [ ] **Step 4.2: Configure webhook in next.config.ts**

Stripe webhooks need the raw body. Next.js 14+ handles this automatically for route handlers, but verify it works.

- [ ] **Step 4.3: Test webhook locally with Stripe CLI**

```bash
# In terminal 1
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In terminal 2, trigger a test event
stripe trigger checkout.session.completed
```

Expected: "Webhook received" log in terminal 1, event processed.

- [ ] **Step 4.4: Commit**

```bash
git add frontend-next/app/api/webhooks/stripe/route.ts
git commit -m "feat(billing): add Stripe webhook handler with idempotency"
```

---

## Task 5: Customer Portal API

**Files:**
- Create: `frontend-next/app/api/billing/portal/route.ts`

### Steps

- [ ] **Step 5.1: Create customer portal endpoint**

Create `frontend-next/app/api/billing/portal/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5.2: Configure Stripe Customer Portal in Dashboard**

Go to Stripe Dashboard > Settings > Billing > Customer Portal and configure:
- Allow customers to update payment methods
- Allow customers to view invoice history
- Allow customers to cancel subscriptions
- Set cancellation behavior (end of billing period)

- [ ] **Step 5.3: Commit**

```bash
git add frontend-next/app/api/billing/portal/route.ts
git commit -m "feat(billing): add customer portal API endpoint"
```

---

## Task 6: Subscription Status API

**Files:**
- Create: `frontend-next/app/api/billing/subscription/route.ts`

### Steps

- [ ] **Step 6.1: Create subscription status endpoint**

Create `frontend-next/app/api/billing/subscription/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { TIER_LIMITS, UserTier } from '@/lib/billing';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        tier: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const tier = (user.tier || 'free') as UserTier;
    const limits = TIER_LIMITS[tier];

    return NextResponse.json({
      tier,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionEndDate: user.subscriptionEndDate,
      limits,
      isPaid: tier !== 'free',
      canUpgrade: tier === 'free' || tier === 'basic',
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 6.2: Commit**

```bash
git add frontend-next/app/api/billing/subscription/route.ts
git commit -m "feat(billing): add subscription status API endpoint"
```

---

## Task 7: Pricing Page Component

**Files:**
- Create: `frontend-next/app/pricing/page.tsx`
- Create: `frontend-next/components/billing/PricingCard.tsx`

### Steps

- [ ] **Step 7.1: Create PricingCard component**

Create `frontend-next/components/billing/PricingCard.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PricingCardProps {
  tier: 'free' | 'basic' | 'pro';
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
  currentTier?: string;
  isLoggedIn: boolean;
}

export function PricingCard({
  tier,
  name,
  price,
  period,
  features,
  highlighted = false,
  currentTier,
  isLoggedIn,
}: PricingCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isCurrent = currentTier === tier;

  async function handleUpgrade() {
    if (!isLoggedIn) {
      router.push('/auth/signin?callbackUrl=/pricing');
      return;
    }

    if (tier === 'free' || isCurrent) return;

    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-2xl p-8 ${
        highlighted
          ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-xl scale-105'
          : 'bg-white dark:bg-gray-800 shadow-lg'
      }`}
    >
      <h3 className="text-2xl font-bold mb-2">{name}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-sm opacity-75">/{period}</span>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleUpgrade}
        disabled={loading || isCurrent || tier === 'free'}
        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
          isCurrent
            ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
            : highlighted
            ? 'bg-white text-orange-500 hover:bg-gray-100'
            : 'bg-orange-500 text-white hover:bg-orange-600'
        } disabled:opacity-50`}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing...
          </span>
        ) : isCurrent ? (
          'Current Plan'
        ) : tier === 'free' ? (
          'Free Forever'
        ) : (
          `Upgrade to ${name}`
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 7.2: Create pricing page**

Create `frontend-next/app/pricing/page.tsx`:
```typescript
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { PricingCard } from '@/components/billing/PricingCard';

const PRICING_TIERS = [
  {
    tier: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '5 transcriptions per day',
      'View last 5 items in history',
      '25MB max file size',
      'All languages supported',
      'Basic audio formats',
    ],
  },
  {
    tier: 'basic' as const,
    name: 'Basic',
    price: '$5',
    period: 'month',
    features: [
      '25 transcriptions per day',
      'View last 5 items in history',
      '50MB max file size',
      'All languages supported',
      'All audio formats',
      'No ads',
      'Priority support',
    ],
    highlighted: true,
  },
  {
    tier: 'pro' as const,
    name: 'Pro',
    price: '$15',
    period: 'month',
    features: [
      'Unlimited transcriptions',
      'Full history access',
      '100MB max file size',
      'All languages supported',
      'All audio formats',
      'No ads',
      'Priority support',
      'API access',
    ],
  },
];

export default async function PricingPage() {
  const session = await auth();
  let currentTier = 'free';

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tier: true },
    });
    currentTier = user?.tier || 'free';
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Start free and upgrade when you need more. All plans include our
            core transcription features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-center">
          {PRICING_TIERS.map((tier) => (
            <PricingCard
              key={tier.tier}
              {...tier}
              currentTier={currentTier}
              isLoggedIn={!!session}
            />
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, you can cancel your subscription at any time. You&apos;ll
                continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What happens to my history if I downgrade?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your transcriptions are never deleted. On free/basic plans,
                you&apos;ll see your 5 most recent items. Upgrade again to
                access your full history.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                We offer a 7-day money-back guarantee on all paid plans. Contact
                support if you&apos;re not satisfied.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                We accept all major credit cards through Stripe. Your payment
                information is securely handled by Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7.3: Commit**

```bash
git add frontend-next/app/pricing/page.tsx frontend-next/components/billing/PricingCard.tsx
git commit -m "feat(billing): add pricing page with tier cards"
```

---

## Task 8: Billing Settings Section in Dashboard

**Files:**
- Create: `frontend-next/components/billing/BillingSettings.tsx`
- Modify: Dashboard settings page to include billing section

### Steps

- [ ] **Step 8.1: Create BillingSettings component**

Create `frontend-next/components/billing/BillingSettings.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SubscriptionData {
  tier: string;
  subscriptionStatus: string | null;
  subscriptionEndDate: string | null;
  limits: {
    dailyTranscriptions: number;
    historyVisible: number;
    maxFileSizeMB: number;
  };
  isPaid: boolean;
  canUpgrade: boolean;
}

export function BillingSettings() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  async function fetchSubscription() {
    try {
      const res = await fetch('/api/billing/subscription');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening portal:', error);
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!subscription) {
    return null;
  }

  const tierDisplay = subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Billing & Subscription
      </h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Plan</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {tierDisplay}
              {subscription.subscriptionStatus === 'past_due' && (
                <span className="ml-2 text-sm text-red-500">(Payment Past Due)</span>
              )}
            </p>
          </div>
          {subscription.isPaid && subscription.subscriptionEndDate && (
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Renews</p>
              <p className="text-gray-900 dark:text-white">
                {new Date(subscription.subscriptionEndDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Plan Limits</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Daily Transcriptions</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {subscription.limits.dailyTranscriptions === -1
                  ? 'Unlimited'
                  : subscription.limits.dailyTranscriptions}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">History Visible</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {subscription.limits.historyVisible === -1
                  ? 'All'
                  : `Last ${subscription.limits.historyVisible}`}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Max File Size</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {subscription.limits.maxFileSizeMB}MB
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          {subscription.canUpgrade && (
            <Link
              href="/pricing"
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Upgrade Plan
            </Link>
          )}
          {subscription.isPaid && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {portalLoading ? 'Loading...' : 'Manage Subscription'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2: Add BillingSettings to dashboard settings page**

Update `frontend-next/app/dashboard/settings/page.tsx` to include:
```typescript
import { BillingSettings } from '@/components/billing/BillingSettings';

// In the JSX, add:
<BillingSettings />
```

- [ ] **Step 8.3: Commit**

```bash
git add frontend-next/components/billing/BillingSettings.tsx frontend-next/app/dashboard/settings/page.tsx
git commit -m "feat(billing): add billing settings section to dashboard"
```

---

## Task 9: Add Pricing Link to Navigation

**Files:**
- Modify: `frontend-next/components/Header.tsx` or navigation component

### Steps

- [ ] **Step 9.1: Add Pricing link to header**

Update the navigation to include a Pricing link:
```typescript
<Link
  href="/pricing"
  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
>
  Pricing
</Link>
```

- [ ] **Step 9.2: Commit**

```bash
git add frontend-next/components/Header.tsx
git commit -m "feat(billing): add pricing link to navigation"
```

---

## Task 10: Stripe Dashboard Configuration

**Files:** None (Stripe Dashboard configuration)

### Steps

- [ ] **Step 10.1: Create Products in Stripe Dashboard**

1. Go to Stripe Dashboard > Products
2. Create "Basic Plan":
   - Name: Basic
   - Price: $5.00 USD / month
   - Metadata: tier=basic
3. Create "Pro Plan":
   - Name: Pro
   - Price: $15.00 USD / month
   - Metadata: tier=pro
4. Copy the Price IDs to `.env.local`

- [ ] **Step 10.2: Configure Webhook Endpoints**

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the Signing Secret to `.env.local`

- [ ] **Step 10.3: Configure Customer Portal**

1. Go to Stripe Dashboard > Settings > Billing > Customer Portal
2. Enable:
   - Payment method updates
   - Invoice history
   - Subscription cancellation (at end of period)
3. Set branding (logo, colors)

- [ ] **Step 10.4: Document configuration**

Add to project README or docs:
```markdown
## Stripe Configuration

1. Create products "Basic" ($5/mo) and "Pro" ($15/mo) in Stripe Dashboard
2. Set STRIPE_PRICE_BASIC_MONTHLY and STRIPE_PRICE_PRO_MONTHLY in .env.local
3. Create webhook endpoint for /api/webhooks/stripe
4. Set STRIPE_WEBHOOK_SECRET in .env.local
5. Configure Customer Portal in Stripe Dashboard
```

---

## Task 11: Tier Enforcement in Usage Limits

**Files:**
- Modify: Usage check middleware/utilities to enforce tier limits

### Steps

- [ ] **Step 11.1: Create tier check utility**

Create `frontend-next/lib/tier-check.ts`:
```typescript
import { prisma } from './prisma';
import { TIER_LIMITS, UserTier } from './billing';

interface TierCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number;
}

export async function checkDailyTranscriptionLimit(
  userId: string | null,
  ipAddress: string
): Promise<TierCheckResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let tier: UserTier = 'free';
  let identifier: { userId: string } | { ipAddress: string };

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    tier = (user?.tier || 'free') as UserTier;
    identifier = { userId };
  } else {
    identifier = { ipAddress };
  }

  const limit = TIER_LIMITS[tier].dailyTranscriptions;

  // Unlimited for pro users
  if (limit === -1) {
    return { allowed: true };
  }

  const todayCount = await prisma.transcription.count({
    where: {
      ...identifier,
      createdAt: { gte: today },
    },
  });

  const remaining = Math.max(0, limit - todayCount);

  if (todayCount >= limit) {
    return {
      allowed: false,
      reason: `Daily limit of ${limit} transcriptions reached`,
      remaining: 0,
      limit,
    };
  }

  return {
    allowed: true,
    remaining,
    limit,
  };
}

export async function checkFileSizeLimit(
  userId: string | null,
  fileSizeBytes: number
): Promise<TierCheckResult> {
  let tier: UserTier = 'free';

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    tier = (user?.tier || 'free') as UserTier;
  }

  const maxSizeMB = TIER_LIMITS[tier].maxFileSizeMB;
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  if (fileSizeMB > maxSizeMB) {
    return {
      allowed: false,
      reason: `File size exceeds ${maxSizeMB}MB limit for ${tier} plan`,
      limit: maxSizeMB,
    };
  }

  return { allowed: true };
}
```

- [ ] **Step 11.2: Apply tier checks in transcription API**

Update the transcription endpoint to use tier checks:
```typescript
import { checkDailyTranscriptionLimit, checkFileSizeLimit } from '@/lib/tier-check';

// In the handler:
const tierCheck = await checkDailyTranscriptionLimit(userId, ipAddress);
if (!tierCheck.allowed) {
  return NextResponse.json(
    { error: tierCheck.reason, remaining: tierCheck.remaining },
    { status: 429 }
  );
}

const sizeCheck = await checkFileSizeLimit(userId, file.size);
if (!sizeCheck.allowed) {
  return NextResponse.json(
    { error: sizeCheck.reason },
    { status: 413 }
  );
}
```

- [ ] **Step 11.3: Commit**

```bash
git add frontend-next/lib/tier-check.ts
git commit -m "feat(billing): add tier-based usage limit enforcement"
```

---

## Task 12: Integration Tests for Billing Flow

**Files:**
- Create: `frontend-next/__tests__/api/billing.test.ts`

### Steps

- [ ] **Step 12.1: Create billing API tests**

Create `frontend-next/__tests__/api/billing.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    customers: {
      create: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
  STRIPE_PRICES: {
    basic: 'price_basic_test',
    pro: 'price_pro_test',
  },
}));

describe('Billing API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/billing/checkout', () => {
    it('should require authentication', async () => {
      // Test implementation
    });

    it('should create checkout session for basic tier', async () => {
      // Test implementation
    });

    it('should reject invalid tier', async () => {
      // Test implementation
    });
  });

  describe('POST /api/billing/portal', () => {
    it('should require authentication', async () => {
      // Test implementation
    });

    it('should require existing stripe customer', async () => {
      // Test implementation
    });
  });

  describe('Webhook handling', () => {
    it('should verify webhook signature', async () => {
      // Test implementation
    });

    it('should skip already processed events (idempotency)', async () => {
      // Test implementation
    });

    it('should update user tier on checkout.session.completed', async () => {
      // Test implementation
    });

    it('should revert to free on subscription.deleted', async () => {
      // Test implementation
    });
  });
});
```

- [ ] **Step 12.2: Run tests**

```bash
cd frontend-next && npm test -- billing
```

- [ ] **Step 12.3: Commit**

```bash
git add frontend-next/__tests__/api/billing.test.ts
git commit -m "test(billing): add billing API tests"
```

---

## Verification Checklist

- [ ] Stripe environment variables are set correctly
- [ ] Database migration completed successfully
- [ ] Checkout flow creates Stripe session and redirects
- [ ] Webhook receives events and updates user tier
- [ ] Idempotency prevents duplicate event processing
- [ ] Customer portal opens and allows subscription management
- [ ] Pricing page displays all tiers correctly
- [ ] Current plan is highlighted for logged-in users
- [ ] Tier limits are enforced on transcription API
- [ ] File size limits vary by tier
- [ ] History visibility is limited for free/basic tiers
- [ ] Subscription cancellation reverts user to free tier
- [ ] All tests pass

---

## Security Considerations

1. **Webhook Signature Verification**: Always verify Stripe webhook signatures
2. **Idempotency**: ProcessedStripeEvent table prevents duplicate processing
3. **Server-side Tier Checks**: Never trust client-side tier information
4. **No Price Exposure**: Price IDs are kept server-side only
5. **Customer ID Security**: stripeCustomerId is unique and indexed

## Rollback Plan

If billing issues occur:
1. Disable checkout endpoint (return 503)
2. Keep webhook active to process existing subscriptions
3. Users can still access features based on stored tier
4. Contact Stripe support for payment issues
