import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe, PRICE_IDS, type SubscriptionTier, type BillingInterval } from '@/lib/stripe';

interface CheckoutRequestBody {
  tier: Exclude<SubscriptionTier, 'free'>;
  interval: BillingInterval;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CheckoutRequestBody;
    const { tier, interval } = body;

    // Validate tier and interval
    if (!tier || !['basic', 'pro'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    if (!interval || !['monthly', 'yearly'].includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid billing interval' },
        { status: 400 }
      );
    }

    const priceId = PRICE_IDS[tier][interval];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured' },
        { status: 500 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to database
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Get the origin for redirect URLs
    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Create checkout session
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
      success_url: `${origin}/dashboard/billing?success=true`,
      cancel_url: `${origin}/dashboard/billing?canceled=true`,
      subscription_data: {
        metadata: {
          userId: user.id,
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
