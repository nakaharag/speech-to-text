import { prisma } from '@/lib/prisma';

interface ConnectedAccountsProps {
  userId: string;
}

export async function ConnectedAccounts({ userId }: ConnectedAccountsProps) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      provider: true,
      createdAt: true,
    },
  });

  const providers = {
    google: { name: 'Google', icon: '🔵' },
    apple: { name: 'Apple', icon: '🍎' },
    credentials: { name: 'Email/Password', icon: '📧' },
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Connected Accounts</h3>
      <p className="text-sm text-slate-600">
        These accounts are linked to your profile.
      </p>

      <div className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-slate-500 text-sm">No connected accounts</p>
        ) : (
          accounts.map((account) => {
            const provider = providers[account.provider as keyof typeof providers] || {
              name: account.provider,
              icon: '🔗',
            };
            return (
              <div
                key={account.provider}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{provider.icon}</span>
                  <div>
                    <p className="font-medium text-slate-900">{provider.name}</p>
                    <p className="text-xs text-slate-500">
                      Connected {account.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Connected
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Account linking and unlinking will be available in a future update.
      </p>
    </div>
  );
}
