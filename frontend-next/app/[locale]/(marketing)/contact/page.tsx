import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';
import { ContactForm } from './contact-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.contact' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ContactPageContent />;
}

function ContactPageContent() {
  const t = useTranslations('contact');

  return (
    <div className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {t('title')}
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              {t('intro')}
            </p>
          </div>

          {/* Contact Form */}
          <ContactForm />

          {/* Direct Email */}
          <div className="mt-12 text-center">
            <p className="text-slate-600">{t('directEmail')}</p>
            <a
              href="mailto:admin@speech-to-text.me"
              className="text-[#3B82F6] hover:text-blue-700 font-medium text-lg"
            >
              admin@speech-to-text.me
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
