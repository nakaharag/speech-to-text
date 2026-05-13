import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectedAccounts } from '@/components/settings/connected-accounts';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-600">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <p className="text-slate-900">{session.user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <p className="text-slate-900">{session.user.name || 'Not set'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <ConnectedAccounts userId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
