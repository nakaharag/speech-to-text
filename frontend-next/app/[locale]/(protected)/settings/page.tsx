import { auth } from '@/lib/auth';
import { redirect } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{t('title')}</h2>
        <p className="text-slate-600">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <p className="text-slate-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <p className="text-slate-900">{user.name || 'Not set'}</p>
          </div>
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
