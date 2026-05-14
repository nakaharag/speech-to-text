import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function AuthErrorPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error: errorParam } = await searchParams;

  return <AuthErrorPageContent error={errorParam} />;
}

function AuthErrorPageContent({ error }: { error?: string }) {
  const t = useTranslations('auth.errorPage');
  const errorKey = error || 'default';

  // Map NextAuth error codes to i18n keys
  const errorKeyMap: Record<string, string> = {
    Configuration: 'configuration',
    AccessDenied: 'accessDenied',
    Verification: 'verification',
    OAuthSignin: 'oauthSignin',
    OAuthCallback: 'oauthCallback',
    OAuthCreateAccount: 'oauthCreateAccount',
    EmailCreateAccount: 'emailCreateAccount',
    Callback: 'callback',
    OAuthAccountNotLinked: 'oauthAccountNotLinked',
    CredentialsSignin: 'credentialsSignin',
    Default: 'default',
  };

  const translationKey = errorKeyMap[error || 'Default'] || 'default';

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t(`errors.${translationKey}`)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error === 'OAuthAccountNotLinked' && (
          <p className="text-sm text-slate-600 text-center">
            {t('hints.oauthAccountNotLinked')}
          </p>
        )}

        {error === 'Configuration' && (
          <p className="text-sm text-slate-600 text-center">
            {t('hints.configuration')}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Link href="/login">
            <Button className="w-full">{t('tryAgain')}</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">{t('goHome')}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
