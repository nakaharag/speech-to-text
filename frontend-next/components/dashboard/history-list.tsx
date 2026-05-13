'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { HistoryItemCard } from './history-item';
import { HistoryFilterBar } from './history-filter';
import { UpgradePrompt } from './upgrade-prompt';
import type { HistoryItem as HistoryItemType, HistoryFilter, HistoryResponse } from './types';

interface HistoryListProps {
  initialItems?: HistoryItemType[];
  tier: string;
  showFilters?: boolean;
  limit?: number;
  showPagination?: boolean;
  showViewAll?: boolean;
}

export function HistoryList({
  initialItems,
  tier,
  showFilters = false,
  limit = 10,
  showPagination = false,
  showViewAll = false,
}: HistoryListProps) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [items, setItems] = useState<HistoryItemType[]>(initialItems || []);
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(!initialItems);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isFreeUser = tier === 'free';
  const effectiveLimit = isFreeUser && !showPagination ? 5 : limit;

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type: filter,
        page: currentPage.toString(),
        limit: effectiveLimit.toString(),
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/proxy/user/history?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data: HistoryResponse = await response.json();
      setItems(data.items);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(t('history.error'));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter, currentPage, effectiveLimit, searchQuery, t]);

  useEffect(() => {
    if (!initialItems) {
      fetchHistory();
    }
  }, [fetchHistory, initialItems]);

  // Refetch when filters change (but not for preview mode with initial items)
  useEffect(() => {
    if (showFilters) {
      fetchHistory();
    }
  }, [filter, searchQuery, currentPage, fetchHistory, showFilters]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      const response = await fetch(`/api/proxy/user/history/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error deleting item:', err);
      // Could show a toast here
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('history.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-4 border border-border rounded-lg">
                <div className="h-10 w-10 bg-border rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-border rounded animate-pulse" />
                  <div className="h-3 w-full bg-border rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('history.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted mb-4">{error}</p>
            <Button onClick={fetchHistory} variant="outline">
              {tCommon('retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('history.title')}</CardTitle>
          {showViewAll && items.length > 0 && (
            <Link href="/dashboard/history" className="text-sm text-blue-600 hover:text-blue-800">
              {t('history.viewAll')}
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="mb-6">
              <HistoryFilterBar
                filter={filter}
                onFilterChange={setFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-muted">{t('history.empty')}</p>
              <div className="mt-4 flex justify-center gap-4">
                <Link href="/transcribe">
                  <Button size="sm">{t('quickActions.transcribe')}</Button>
                </Link>
                <Link href="/pdf-to-audio">
                  <Button size="sm" variant="secondary">{t('quickActions.pdfToAudio')}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <HistoryItemCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  isDeleting={deletingId === item.id}
                />
              ))}
            </div>
          )}

          {showPagination && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {t('history.pagination.previous')}
              </Button>
              <span className="text-sm text-foreground-secondary">
                {t('history.pagination.page', { current: currentPage, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {t('history.pagination.next')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isFreeUser && showPagination && items.length > 0 && (
        <UpgradePrompt tier={tier} />
      )}
    </div>
  );
}
