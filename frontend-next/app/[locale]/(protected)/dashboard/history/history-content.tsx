'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { HistoryList } from '@/components/dashboard';

interface HistoryPageContentProps {
  tier: string;
}

export function HistoryPageContent({ tier }: HistoryPageContentProps) {
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-gray-900">
          {t('title')}
        </Link>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900">{t('history.title')}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('history.pageTitle')}</h1>
        <p className="mt-1 text-gray-600">{t('history.pageDescription')}</p>
      </div>

      {/* Full History List with Filters and Pagination */}
      <HistoryList
        tier={tier}
        showFilters={true}
        limit={10}
        showPagination={true}
        showViewAll={false}
      />
    </div>
  );
}
