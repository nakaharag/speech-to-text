import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
};

export default async function VerifyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { email } = await searchParams;

  return <VerifyPageContent email={email} />;
}

function VerifyPageContent({ email }: { email?: string }) {
  const t = useTranslations('auth.verify');

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}{' '}
          {email && <strong>{email}</strong>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            {t('checkInbox')}
          </p>
          <p className="text-sm text-gray-500">
            <Link href="/signup" className="text-blue-600 hover:underline">
              {t('resend')}
            </Link>
          </p>
          <p className="text-sm">
            <Link href="/login" className="text-blue-600 hover:underline">
              {t('backToLogin')}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
