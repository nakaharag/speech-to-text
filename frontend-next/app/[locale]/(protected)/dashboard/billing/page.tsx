'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

interface SubscriptionInfo {
  tier: string;
  status: string | null;
  endsAt: string | null;
}

function BillingPageContent() {
  const t = useTranslations('billing');
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for success/cancel URL params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setMessage({ type: 'success', text: t('successMessage') });
    } else if (searchParams.get('canceled') === 'true') {
      setMessage({ type: 'error', text: t('canceledMessage') });
    }
  }, [searchParams, t]);

  // Fetch subscription info
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/proxy/user/subscription');
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleManageSubscription = async () => {
    setIsRedirecting(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Portal redirect error:', error);
      setMessage({ type: 'error', text: t('portalError') });
      setIsRedirecting(false);
    }
  };

  const handleUpgrade = async (tier: 'basic' | 'pro', interval: 'monthly' | 'yearly') => {
    setIsRedirecting(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier, interval }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout redirect error:', error);
      setMessage({ type: 'error', text: t('checkoutError') });
      setIsRedirecting(false);
    }
  };

  const CheckIcon = () => (
    <svg
      className="w-5 h-5 text-green-500 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  const currentTier = subscription?.tier || 'free';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-2 text-slate-600">{t('subtitle')}</p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('currentPlan')}</CardTitle>
          <CardDescription>{t('currentPlanDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse h-20 bg-slate-100 rounded-lg" />
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold capitalize">{currentTier}</span>
                  {isActive && currentTier !== 'free' && (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {t('active')}
                    </span>
                  )}
                  {subscription?.status === 'past_due' && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      {t('pastDue')}
                    </span>
                  )}
                </div>
                {subscription?.endsAt && (
                  <p className="mt-1 text-sm text-slate-600">
                    {subscription.status === 'canceled'
                      ? t('endsAt', { date: new Date(subscription.endsAt).toLocaleDateString() })
                      : t('renewsAt', { date: new Date(subscription.endsAt).toLocaleDateString() })}
                  </p>
                )}
              </div>
              {currentTier !== 'free' && (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={isRedirecting}
                >
                  {isRedirecting ? t('redirecting') : t('manageSubscription')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Plans */}
      {currentTier === 'free' && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6">{t('upgradePlans')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Plan */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>{t('basic.name')}</CardTitle>
                <CardDescription>{t('basic.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$7</span>
                    <span className="text-slate-500">/{t('month')}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {t('or')} $59/{t('year')} ({t('save')} 30%)
                  </p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="text-sm text-slate-600">{t('basic.feature1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="text-sm text-slate-600">{t('basic.feature2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="text-sm text-slate-600">{t('basic.feature3')}</span>
                  </li>
                </ul>
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade('basic', 'monthly')}
                    disabled={isRedirecting}
                  >
                    {t('upgradeMonthly')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUpgrade('basic', 'yearly')}
                    disabled={isRedirecting}
                  >
                    {t('upgradeYearly')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  {t('recommended')}
                </span>
              </div>
              <CardHeader>
                <CardTitle>{t('pro.name')}</CardTitle>
                <CardDescription>{t('pro.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$15</span>
                    <span className="text-slate-500">/{t('month')}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {t('or')} $129/{t('year')} ({t('save')} 28%)
                  </p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="text-sm text-slate-600">{t('pro.feature1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="text-sm text-slate-600">{t('pro.feature2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="text-sm text-slate-600">{t('pro.feature3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="text-sm text-slate-600">{t('pro.feature4')}</span>
                  </li>
                </ul>
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade('pro', 'monthly')}
                    disabled={isRedirecting}
                  >
                    {t('upgradeMonthly')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleUpgrade('pro', 'yearly')}
                    disabled={isRedirecting}
                  >
                    {t('upgradeYearly')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Features Comparison Link */}
      <div className="text-center pt-4">
        <Link href="/pricing" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          {t('viewAllFeatures')}
        </Link>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8">
          <div className="animate-pulse h-8 w-48 bg-slate-200 rounded" />
          <div className="animate-pulse h-40 bg-slate-100 rounded-lg" />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
