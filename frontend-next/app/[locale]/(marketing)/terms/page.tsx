import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
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
  const t = await getTranslations({ locale, namespace: 'metadata.terms' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TermsPageContent />;
}

function TermsPageContent() {
  const t = useTranslations('terms');

  return (
    <div className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-4 text-slate-500">
              {t('lastUpdated')}: May 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-slate prose-lg max-w-none">
            {/* Section 1 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('section1Title')}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t('section1Content')}
              </p>
            </section>

            {/* Section 2 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('section2Title')}
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                {t('section2Content')}
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>{t('section2Item1')}</li>
                <li>{t('section2Item2')}</li>
                <li>{t('section2Item3')}</li>
                <li>{t('section2Item4')}</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('section3Title')}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t('section3Content')}
              </p>
            </section>

            {/* Section 4 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('section4Title')}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t('section4Content')}
              </p>
            </section>

            {/* Section 5 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('section5Title')}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t('section5Content')}
              </p>
            </section>

            {/* Section 6 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('section6Title')}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t('section6Content')}
              </p>
            </section>

            {/* Section 7 */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('section7Title')}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t('section7Content')}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
