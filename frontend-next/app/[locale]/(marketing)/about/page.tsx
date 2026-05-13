import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
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
  const t = await getTranslations({ locale, namespace: 'metadata.about' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AboutPageContent />;
}

function AboutPageContent() {
  const t = useTranslations('aboutPage');

  return (
    <div className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {t('title')}
            </h1>
          </div>

          {/* Content Sections */}
          <div className="prose prose-slate prose-lg max-w-none">
            {/* Mission */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('missionTitle')}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t('missionContent')}
              </p>
            </section>

            {/* What We Do */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('whatWeDoTitle')}
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                {t('whatWeDoContent')}
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>{t('feature1')}</li>
                <li>{t('feature2')}</li>
                <li>{t('feature3')}</li>
                <li>{t('feature4')}</li>
              </ul>
            </section>

            {/* Technology */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('technologyTitle')}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t('technologyContent')}
              </p>
            </section>

            {/* Privacy */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('privacyTitle')}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t('privacyContent')}
              </p>
            </section>

            {/* Contact */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                {t('contactTitle')}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t('contactContent')}{' '}
                <Link
                  href="/contact"
                  className="text-[#3B82F6] hover:text-blue-700 font-medium"
                >
                  {t('contactLink')}
                </Link>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
