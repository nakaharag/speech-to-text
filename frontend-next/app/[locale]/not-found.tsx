import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const t = useTranslations('common');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-6xl font-bold text-slate-900">404</h1>
        <p className="text-xl text-slate-600">Page not found</p>
        <Link href="/">
          <Button>{t('back')}</Button>
        </Link>
      </div>
    </div>
  );
}
