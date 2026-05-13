'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import type { HistoryFilter } from './types';

interface HistoryFilterProps {
  filter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function HistoryFilterBar({ filter, onFilterChange, searchQuery, onSearchChange }: HistoryFilterProps) {
  const t = useTranslations('dashboard');

  const filters: { value: HistoryFilter; label: string }[] = [
    { value: 'all', label: t('history.filter.all') },
    { value: 'transcription', label: t('history.filter.transcriptions') },
    { value: 'pdf', label: t('history.filter.pdf') },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <Input
          type="search"
          placeholder={t('history.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === f.value
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
