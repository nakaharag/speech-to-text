import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.pricing' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PricingPageContent />;
}

function PricingPageContent() {
  const t = useTranslations('pricing');

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

  return (
    <div className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-lg text-slate-600">{t('subtitle')}</p>
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
              <span className="text-4xl font-bold text-slate-900">
                {t('free.price')}
              </span>
              <span className="text-slate-500 ml-2">{t('free.period')}</span>
            </div>
            <ul className="mt-8 space-y-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <li key={num} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-slate-600 text-sm">
                    {t(`free.feature${num}`)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/signup">
                <Button variant="outline" className="w-full">
                  {t('free.cta')}
                </Button>
              </Link>
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
              {t('pro.description')}
            </p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-slate-900">
                {t('pro.price')}
              </span>
              <span className="text-slate-500 ml-2">{t('pro.period')}</span>
            </div>
            <ul className="mt-8 space-y-4">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <li key={num} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-slate-600 text-sm">
                    {t(`pro.feature${num}`)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/signup">
                <Button className="w-full">{t('pro.cta')}</Button>
              </Link>
            </div>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              {t('enterprise.name')}
            </h3>
            <p className="mt-2 text-slate-600 text-sm">
              {t('enterprise.description')}
            </p>
            <div className="mt-6">
              <span className="text-4xl font-bold text-slate-900">
                {t('enterprise.price')}
              </span>
              <span className="text-slate-500 ml-2">
                {t('enterprise.period')}
              </span>
            </div>
            <ul className="mt-8 space-y-4">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <li key={num} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-slate-600 text-sm">
                    {t(`enterprise.feature${num}`)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/contact">
                <Button variant="outline" className="w-full">
                  {t('enterprise.cta')}
                </Button>
              </Link>
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
