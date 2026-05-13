import { auth } from '@/lib/auth';
import { redirect, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConnectedAccounts } from '@/components/settings/connected-accounts';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user) {
    redirect({ href: '/login', locale });
    return null; // TypeScript guard
  }

  return <SettingsPageContent user={session.user} />;
}

function SettingsPageContent({ user }: { user: { id: string; email?: string | null; name?: string | null } }) {
  const t = useTranslations('settings');
  const tBilling = useTranslations('billing');

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t('title')}</h2>
        <p className="text-slate-600">{t('description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">{t('emailLabel')}</label>
            <p className="text-slate-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">{t('nameLabel')}</label>
            <p className="text-slate-900">{user.name || t('notSet')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('billing')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">{t('billingDescription')}</p>
          <Link href="/dashboard/billing">
            <Button variant="outline">{tBilling('manageSubscription')}</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <ConnectedAccounts userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
