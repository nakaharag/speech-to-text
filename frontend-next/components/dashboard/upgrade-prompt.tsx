'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UpgradePromptProps {
  tier: string;
}

export function UpgradePrompt({ tier }: UpgradePromptProps) {
  const t = useTranslations('dashboard');

  // Don't show for paid users
  if (tier !== 'free') {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-3 bg-blue-100 rounded-xl">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{t('upgrade.title')}</h3>
              <p className="text-sm text-gray-600 mt-1">{t('upgrade.description')}</p>
            </div>
          </div>
          <Link href="/pricing">
            <Button size="sm">{t('upgrade.cta')}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
