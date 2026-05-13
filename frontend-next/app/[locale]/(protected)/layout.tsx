import { redirect } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { auth } from '@/lib/auth';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { getLocale, getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function ProtectedLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const t = await getTranslations('nav');

  if (!session?.user) {
    redirect({ href: '/login', locale });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <svg className="w-8 h-8 text-[#3B82F6]" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 24h4M16 16v16M24 8v32M32 16v16M40 24h4" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <span className="text-xl font-bold text-foreground">speech-to-text.me</span>
          </div>
          <nav className="flex items-center space-x-6">
            <Link href="/dashboard" className="text-sm font-medium text-foreground-secondary hover:text-foreground">
              {t('dashboard')}
            </Link>
            <Link href="/settings" className="text-sm text-foreground-secondary hover:text-foreground">
              {t('settings')}
            </Link>
            <ThemeToggle />
            <LanguageSwitcher />
            <span className="text-sm text-foreground-secondary">{session?.user?.email}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
