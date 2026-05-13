'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export default function PricingPage() {
  const t = useTranslations('pricing');
  const { data: session } = useSession();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleSubscribe = async (tier: 'basic' | 'pro') => {
    if (!session) {
      // Redirect to signup if not logged in
      window.location.href = '/signup';
      return;
    }

    setLoadingTier(tier);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          interval: isYearly ? 'yearly' : 'monthly',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      setLoadingTier(null);
    }
  };

  const CheckIcon = () => (
    <svg
      className="w-5 h-5 text-green-500 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );

  // Pricing based on interval
  const prices = {
    basic: {
      monthly: '$7',
      yearly: '$59',
      yearlySavings: '30%',
    },
    pro: {
      monthly: '$15',
      yearly: '$129',
      yearlySavings: '28%',
    },
  };

  return (
    <div className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-lg text-slate-600">{t('subtitle')}</p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${!isYearly ? 'text-slate-900' : 'text-slate-500'}`}
            >
              {t('monthly')}
            </span>
            <button
              type="button"
              onClick={() => setIsYearly(!isYearly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isYearly ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isYearly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${isYearly ? 'text-slate-900' : 'text-slate-500'}`}
            >
              {t('yearly')}
            </span>
            {isYearly && (
              <span className="ml-2 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                {t('savePercent', { percent: '30' })}
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              {t('free.name')}
            </h3>
            <p className="mt-2 text-slate-600 text-sm">
              {t('free.description')}
            </p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-slate-900">$0</span>
              <span className="text-slate-500 ml-2">{t('free.period')}</span>
            </div>
            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  5 transcriptions per day
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  Last 5 items in history
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  Real-time recording
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  File upload up to 25MB
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  Basic export formats
                </span>
              </li>
            </ul>
            <div className="mt-8">
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  {t('free.cta')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Basic Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Basic</h3>
            <p className="mt-2 text-slate-600 text-sm">
              For regular users who need more
            </p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-slate-900">
                {isYearly ? prices.basic.yearly : prices.basic.monthly}
              </span>
              <span className="text-slate-500 ml-2">
                /{isYearly ? t('yearly').toLowerCase() : t('monthly').toLowerCase()}
              </span>
              {isYearly && (
                <p className="text-sm text-green-600 mt-1">
                  Save {prices.basic.yearlySavings}
                </p>
              )}
            </div>
            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  15 transcriptions per day
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  Full history access
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  All export formats
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  AI summarization
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  Priority support
                </span>
              </li>
            </ul>
            <div className="mt-8">
              <Button
                className="w-full"
                onClick={() => handleSubscribe('basic')}
                disabled={loadingTier === 'basic'}
              >
                {loadingTier === 'basic' ? 'Loading...' : 'Subscribe to Basic'}
              </Button>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-2xl border-2 border-[#3B82F6] p-8 shadow-lg relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-[#3B82F6] text-white text-sm font-medium px-4 py-1 rounded-full">
                {t('pro.popular')}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">{t('pro.name')}</h3>
            <p className="mt-2 text-slate-600 text-sm">
              For power users and professionals
            </p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-slate-900">
                {isYearly ? prices.pro.yearly : prices.pro.monthly}
              </span>
              <span className="text-slate-500 ml-2">
                /{isYearly ? t('yearly').toLowerCase() : t('monthly').toLowerCase()}
              </span>
              {isYearly && (
                <p className="text-sm text-green-600 mt-1">
                  Save {prices.pro.yearlySavings}
                </p>
              )}
            </div>
            <ul className="mt-8 space-y-4">
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  Unlimited transcriptions
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  Priority processing
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  No advertisements
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  Full history access
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  AI summarization
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-slate-600 text-sm">
                  Priority support
                </span>
              </li>
            </ul>
            <div className="mt-8">
              <Button
                className="w-full"
                onClick={() => handleSubscribe('pro')}
                disabled={loadingTier === 'pro'}
              >
                {loadingTier === 'pro' ? 'Loading...' : 'Subscribe to Pro'}
              </Button>
            </div>
          </div>
        </div>

        {/* Pricing FAQ */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            {t('faq.title')}
          </h2>
          <div className="divide-y divide-slate-200">
            {[1, 2, 3].map((num) => (
              <details key={num} className="group py-6">
                <summary className="flex cursor-pointer items-center justify-between text-left">
                  <span className="text-lg font-medium text-slate-900">
                    {t(`faq.q${num}`)}
                  </span>
                  <span className="ml-6 flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="mt-4 text-slate-600">{t(`faq.a${num}`)}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
