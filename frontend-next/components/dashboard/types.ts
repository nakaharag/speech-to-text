export type HistoryItemType = 'transcription' | 'pdf';

export interface HistoryItem {
  id: string;
  type: HistoryItemType;
  title: string;
  preview: string;
  createdAt: string;
  duration?: string;
  pages?: number;
}

export interface UsageStats {
  transcriptionsToday: number;
  transcriptionsLimit: number;
  pdfToday: number;
  pdfLimit: number;
  totalItems: number;
}

export interface HistoryResponse {
  items: HistoryItem[];
  totalPages: number;
  currentPage: number;
}

export type HistoryFilter = 'all' | 'transcription' | 'pdf';
