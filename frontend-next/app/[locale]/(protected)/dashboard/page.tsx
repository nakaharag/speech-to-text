import { auth } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  return <DashboardPageContent userName={session?.user?.name} tier={session?.user?.tier} />;
}

function DashboardPageContent({ userName, tier }: { userName?: string | null; tier?: string }) {
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('welcome', { name: userName || 'User' })}
        </h2>
        <p className="text-gray-600">
          Your current plan: <span className="font-medium capitalize">{tier || 'Free'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              Transcriptions Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0 / 5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              PDF Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0 / 5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              Total History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentTranscriptions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">{t('noTranscriptions')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
