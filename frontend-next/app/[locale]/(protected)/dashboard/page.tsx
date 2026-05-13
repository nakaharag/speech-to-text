import { auth } from '@/lib/auth';
import { setRequestLocale } from 'next-intl/server';
import { DashboardContent } from './dashboard-content';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  return (
    <DashboardContent
      userName={session?.user?.name}
      tier={session?.user?.tier || 'free'}
    />
  );
}
