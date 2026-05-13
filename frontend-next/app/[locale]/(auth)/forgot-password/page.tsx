import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ForgotPasswordPageContent />;
}

function ForgotPasswordPageContent() {
  const t = useTranslations('auth.forgotPassword');

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ForgotPasswordForm />

        <p className="text-center text-sm text-slate-600">
          {t('backToLogin')}{' '}
          <Link href="/login" className="font-medium text-[#3B82F6] hover:underline">
            {t('backToLogin')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
