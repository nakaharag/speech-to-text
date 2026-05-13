import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from './prisma.service';

// Subscription tier type
export type SubscriptionTier = 'free' | 'basic' | 'pro';

// Subscription status type
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'unpaid'
  | null;

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: InstanceType<typeof Stripe> | null = null;
  private webhookSecret: string | null = null;

  // Price ID to tier mapping (from environment variables)
  private readonly priceIdToTier: Record<string, SubscriptionTier> = {};

  constructor(private prisma: PrismaService) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;

    if (secretKey) {
      this.stripe = new Stripe(secretKey);

      // Build price ID to tier mapping from environment
      this.buildPriceMapping();

      this.logger.log('Stripe service initialized');
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY not configured - Stripe service disabled',
      );
    }
  }

  private buildPriceMapping(): void {
    const basicMonthly = process.env.STRIPE_PRICE_BASIC_MONTHLY;
    const basicYearly = process.env.STRIPE_PRICE_BASIC_YEARLY;
    const proMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
    const proYearly = process.env.STRIPE_PRICE_PRO_YEARLY;

    if (basicMonthly) this.priceIdToTier[basicMonthly] = 'basic';
    if (basicYearly) this.priceIdToTier[basicYearly] = 'basic';
    if (proMonthly) this.priceIdToTier[proMonthly] = 'pro';
    if (proYearly) this.priceIdToTier[proYearly] = 'pro';
  }

  isAvailable(): boolean {
    return this.stripe !== null;
  }

  /**
   * Verify webhook signature and construct event
   */
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): ReturnType<InstanceType<typeof Stripe>['webhooks']['constructEvent']> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }
    if (!this.webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );
  }

  /**
   * Get tier from Stripe price ID
   */
  getTierFromPriceId(priceId: string): SubscriptionTier {
    return this.priceIdToTier[priceId] || 'free';
  }

  /**
   * Handle checkout.session.completed event
   * Sets user tier and stores subscription ID
   */
  async handleCheckoutCompleted(session: {
    metadata?: { userId?: string } | null;
    subscription_data?: { metadata?: { userId?: string } };
    subscription?: string | { id: string } | null;
    customer?: string | { id: string } | null;
  }): Promise<void> {
    const userId = session.metadata?.userId || session.subscription_data?.metadata?.userId;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

    if (!userId) {
      this.logger.warn('No userId in checkout session metadata');
      return;
    }

    if (!subscriptionId) {
      this.logger.warn('No subscription ID in checkout session');
      return;
    }

    // Fetch subscription to get price ID
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    const subscriptionResponse = await this.stripe.subscriptions.retrieve(subscriptionId);
    // Access the subscription data (handle both Response and direct object)
    const subscription = 'data' in subscriptionResponse
      ? (subscriptionResponse as unknown as { data: { items: { data: Array<{ price: { id: string } }> }; status: string; current_period_end?: number } }).data
      : subscriptionResponse as unknown as { items: { data: Array<{ price: { id: string } }> }; status: string; current_period_end?: number };

    const priceId = subscription.items.data[0]?.price.id;
    const tier = this.getTierFromPriceId(priceId);

    // Update user in database
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tier,
        stripeCustomerId: customerId || undefined,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: subscription.status as string,
        subscriptionEndsAt: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
      },
    });

    this.logger.log(`User ${userId} subscribed to ${tier} tier`);
  }

  /**
   * Handle customer.subscription.updated event
   * Updates tier if plan changed
   */
  async handleSubscriptionUpdated(subscription: {
    id: string;
    customer: string | { id: string };
    status: string;
    current_period_end?: number;
    items: { data: Array<{ price: { id: string } }> };
  }): Promise<void> {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    // Find user by Stripe customer ID
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      this.logger.warn(`No user found for Stripe customer ${customerId}`);
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    const tier = this.getTierFromPriceId(priceId);

    // Update user subscription info
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        tier,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        subscriptionEndsAt: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
      },
    });

    this.logger.log(
      `User ${user.id} subscription updated: ${tier}, status: ${subscription.status}`,
    );
  }

  /**
   * Handle customer.subscription.deleted event
   * Downgrades user to free tier
   */
  async handleSubscriptionDeleted(subscription: {
    customer: string | { id: string };
  }): Promise<void> {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

    // Find user by Stripe customer ID
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      this.logger.warn(`No user found for Stripe customer ${customerId}`);
      return;
    }

    // Downgrade to free tier
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        tier: 'free',
        stripeSubscriptionId: null,
        subscriptionStatus: 'canceled',
        subscriptionEndsAt: null,
      },
    });

    this.logger.log(`User ${user.id} subscription canceled, downgraded to free`);
  }

  /**
   * Handle invoice.payment_failed event
   * Marks subscription as past_due
   */
  async handlePaymentFailed(invoice: {
    customer?: string | { id: string } | null;
  }): Promise<void> {
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;

    if (!customerId) {
      this.logger.warn('No customer ID in failed invoice');
      return;
    }

    // Find user by Stripe customer ID
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      this.logger.warn(`No user found for Stripe customer ${customerId}`);
      return;
    }

    // Mark subscription as past due
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'past_due',
      },
    });

    this.logger.log(`User ${user.id} payment failed, marked as past_due`);
  }

  /**
   * Get user subscription info
   */
  async getUserSubscription(
    userId: string,
  ): Promise<{
    tier: string;
    status: string | null;
    endsAt: string | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tier: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    if (!user) {
      return { tier: 'free', status: null, endsAt: null };
    }

    return {
      tier: user.tier,
      status: user.subscriptionStatus,
      endsAt: user.subscriptionEndsAt?.toISOString() || null,
    };
  }
}
