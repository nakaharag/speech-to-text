import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';
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
  const t = await getTranslations({ locale, namespace: 'metadata.home' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <HomePageContent />
      </main>
      <MarketingFooter />
    </div>
  );
}

function HomePageContent() {
  const t = useTranslations('landing');
  const tFaq = useTranslations('faq');

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
              {t('heroTitle')}
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl">
              {t('heroSubtitle')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-lg">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  {t('startTranscribing')}
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">{t('heroNote')}</p>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-[#3B82F6]">30+</span>
              <span className="mt-2 text-sm text-slate-600">{t('languagesSupported')}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-[#3B82F6]">95%+</span>
              <span className="mt-2 text-sm text-slate-600">{t('accuracy')}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold text-[#3B82F6]">100%</span>
              <span className="mt-2 text-sm text-slate-600">{t('free')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-32 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t('featuresTitle')}
            </h2>
            <p className="mt-4 text-lg text-slate-600">{t('featuresSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#3B82F6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('feature1Title')}</h3>
              <p className="text-slate-600">{t('feature1Desc')}</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#3B82F6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('feature2Title')}</h3>
              <p className="text-slate-600">{t('feature2Desc')}</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#3B82F6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('feature3Title')}</h3>
              <p className="text-slate-600">{t('feature3Desc')}</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#3B82F6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('feature4Title')}</h3>
              <p className="text-slate-600">{t('feature4Desc')}</p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#3B82F6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('feature5Title')}</h3>
              <p className="text-slate-600">{t('feature5Desc')}</p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-[#3B82F6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('feature6Title')}</h3>
              <p className="text-slate-600">{t('feature6Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t('howItWorksTitle')}
            </h2>
            <p className="mt-4 text-lg text-slate-600">{t('howItWorksSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="relative text-center">
                <div className="w-16 h-16 bg-[#3B82F6] rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                  {step}
                </div>
                {step < 4 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-slate-200" />
                )}
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {t(`step${step}Title`)}
                </h3>
                <p className="text-slate-600">{t(`step${step}Desc`)}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/signup">
              <Button size="lg">{t('tryItNow')}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 sm:py-32 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t('useCasesTitle')}
            </h2>
            <p className="mt-4 text-lg text-slate-600">{t('useCasesSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                  {num === 1 && (
                    <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  )}
                  {num === 2 && (
                    <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  )}
                  {num === 3 && (
                    <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  )}
                  {num === 4 && (
                    <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 19l7-7 3 3-7 7-3-3z" />
                      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                      <path d="M2 2l7.586 7.586" />
                      <circle cx="11" cy="11" r="2" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {t(`useCase${num}Title`)}
                </h3>
                <p className="text-sm text-slate-600">{t(`useCase${num}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t('faqTitle')}
            </h2>
            <p className="mt-4 text-lg text-slate-600">{t('faqSubtitle')}</p>
          </div>

          <div className="mx-auto max-w-3xl divide-y divide-slate-200">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <details key={num} className="group py-6">
                <summary className="flex cursor-pointer items-center justify-between text-left">
                  <span className="text-lg font-medium text-slate-900">
                    {tFaq(`q${num}`)}
                  </span>
                  <span className="ml-6 flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-4 text-slate-600">{tFaq(`a${num}`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 sm:py-32 bg-[#3B82F6]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {t('finalCtaTitle')}
          </h2>
          <p className="mt-4 text-lg text-blue-100 max-w-2xl mx-auto">
            {t('finalCtaSubtitle')}
          </p>
          <div className="mt-10">
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="px-8 py-6 text-lg">
                {t('startFree')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
