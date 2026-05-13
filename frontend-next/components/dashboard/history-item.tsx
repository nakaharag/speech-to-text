'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { HistoryItem as HistoryItemType } from './types';

interface HistoryItemProps {
  item: HistoryItemType;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function HistoryItemCard({ item, onDelete, isDeleting }: HistoryItemProps) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const TypeIcon = item.type === 'transcription' ? (
    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  ) : (
    <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(item.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-surface-elevated rounded-lg">
            {TypeIcon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium text-foreground truncate">{item.title}</h4>
              <span className="flex-shrink-0 text-xs text-muted">{formattedDate}</span>
            </div>

            <p className={`mt-1 text-sm text-foreground-secondary ${expanded ? '' : 'line-clamp-2'}`}>
              {item.preview}
            </p>

            {item.preview.length > 100 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {expanded ? t('history.showLess') : t('history.showMore')}
              </button>
            )}

            <div className="mt-2 flex items-center gap-4 text-xs text-muted">
              <span className="capitalize">
                {item.type === 'transcription' ? t('history.types.transcription') : t('history.types.pdf')}
              </span>
              {item.duration && <span>{item.duration}</span>}
              {item.pages && <span>{t('history.pages', { count: item.pages })}</span>}
            </div>
          </div>

          <div className="flex-shrink-0">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-red-500 hover:bg-red-600"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                >
                  {tCommon('confirm')}
                </Button>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="p-2 text-muted hover:text-red-500 transition-colors"
                title={t('history.delete')}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
