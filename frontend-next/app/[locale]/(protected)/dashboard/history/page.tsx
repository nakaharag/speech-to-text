import { auth } from '@/lib/auth';
import { setRequestLocale } from 'next-intl/server';
import { HistoryPageContent } from './history-content';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HistoryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  return (
    <HistoryPageContent tier={session?.user?.tier || 'free'} />
  );
}
