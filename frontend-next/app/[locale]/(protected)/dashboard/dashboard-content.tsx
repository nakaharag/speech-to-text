'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsageStatsCards, QuickActions, UpgradePrompt, HistoryList } from '@/components/dashboard';
import type { UsageStats, HistoryItem } from '@/components/dashboard';

interface DashboardContentProps {
  userName?: string | null;
  tier: string;
}

export function DashboardContent({ userName, tier }: DashboardContentProps) {
  const t = useTranslations('dashboard');
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch usage stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/proxy/user/usage');
        if (!response.ok) throw new Error('Failed to fetch usage');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setStatsError(t('stats.error'));
        // Set default values on error
        setStats({
          transcriptionsToday: 0,
          transcriptionsLimit: 5,
          pdfToday: 0,
          pdfLimit: 5,
          totalItems: 0,
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    // Fetch recent history (last 5 items)
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/proxy/user/history?type=all&page=1&limit=5');
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        setRecentHistory(data.items || []);
      } catch (err) {
        console.error('Error fetching history:', err);
        setRecentHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchStats();
    fetchHistory();
  }, [t]);

  const isFreeUser = tier === 'free';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {t('welcome', { name: userName || 'User' })}
              </h1>
              <p className="mt-2 text-blue-100">
                {t('currentPlan')}: <span className="font-semibold capitalize">{tier}</span>
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('stats.title')}</h2>
        <UsageStatsCards stats={stats} isLoading={isLoadingStats} error={statsError} />
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">{t('quickActions.title')}</h2>
        <QuickActions />
      </section>

      {/* Upgrade Prompt for Free Users */}
      {isFreeUser && <UpgradePrompt tier={tier} />}

      {/* Recent History Preview */}
      <section>
        <HistoryList
          initialItems={recentHistory}
          tier={tier}
          showFilters={false}
          limit={5}
          showPagination={false}
          showViewAll={true}
        />
      </section>
    </div>
  );
}
