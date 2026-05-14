import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VerifyPageContent } from '@/components/auth/verify-page-content';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function VerifyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Card>
      <VerifyPageContent />
    </Card>
  );
}
