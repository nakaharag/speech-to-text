import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomePageContent />;
}

function HomePageContent() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher showFlag />
      </div>

      <div className="text-center space-y-8 px-4 max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-3">
          <svg className="w-12 h-12 text-[#3B82F6]" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 24h4M16 16v16M24 8v32M32 16v16M40 24h4" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
            {t('app.title').split('.')[0]}<span className="text-[#3B82F6]">.me</span>
          </h1>
        </div>

        {/* Tagline */}
        <p className="text-xl text-slate-600 leading-relaxed">
          {t('app.description')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto px-8">
              {t('nav.getStarted', { defaultMessage: 'Get Started Free' })}
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
              {t('auth.login.submit')}
            </Button>
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 pt-8 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            Free to use
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            No signup required
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
            </svg>
            AI powered
          </span>
        </div>
      </div>
    </div>
  );
}
