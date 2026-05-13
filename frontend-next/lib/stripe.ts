import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

// For backward compatibility - use getStripe() instead
export const stripe = {
  get checkout() {
    return getStripe().checkout;
  },
  get customers() {
    return getStripe().customers;
  },
  get billingPortal() {
    return getStripe().billingPortal;
  },
  get subscriptions() {
    return getStripe().subscriptions;
  },
};

// Subscription tier price IDs (configure in .env)
export const PRICE_IDS = {
  basic: {
    monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_BASIC_YEARLY || '',
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  },
} as const;

// Tier limits
export const TIER_LIMITS = {
  free: {
    transcriptionsPerDay: 5,
    historyLimit: 5,
  },
  basic: {
    transcriptionsPerDay: 15,
    historyLimit: -1, // unlimited
  },
  pro: {
    transcriptionsPerDay: -1, // unlimited
    historyLimit: -1, // unlimited
  },
} as const;

export type SubscriptionTier = keyof typeof TIER_LIMITS;
export type BillingInterval = 'monthly' | 'yearly';

// Map Stripe price IDs to tiers
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (
    priceId === PRICE_IDS.pro.monthly ||
    priceId === PRICE_IDS.pro.yearly
  ) {
    return 'pro';
  }
  if (
    priceId === PRICE_IDS.basic.monthly ||
    priceId === PRICE_IDS.basic.yearly
  ) {
    return 'basic';
  }
  return 'free';
}
