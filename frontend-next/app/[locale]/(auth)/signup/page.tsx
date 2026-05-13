import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignupForm } from '@/components/auth/signup-form';
import { SocialButtons } from '@/components/auth/social-buttons';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SignupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SignupPageContent />;
}

function SignupPageContent() {
  const t = useTranslations('auth.signup');
  const tSocial = useTranslations('auth.social');

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SocialButtons />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">{tSocial('continueWith')}</span>
          </div>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-gray-600">
          {t('hasAccount')}{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            {t('signIn')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
