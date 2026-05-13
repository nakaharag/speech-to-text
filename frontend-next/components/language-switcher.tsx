'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { locales, type Locale } from '@/i18n/routing';
import { useTransition, useState } from 'react';

const localeLabels: Record<Locale, string> = {
  en: 'EN',
  pt: 'PT',
  es: 'ES',
};

const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  pt: '🇧🇷',
  es: '🇪🇸',
};

interface LanguageSwitcherProps {
  /** Show flag emoji alongside locale code */
  showFlag?: boolean;
  /** Show full language name instead of code */
  showFullName?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function LanguageSwitcher({
  showFlag = false,
  showFullName = false,
  className = '',
}: LanguageSwitcherProps) {
  const t = useTranslations('siteLang');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleChange = (newLocale: Locale) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
    setIsOpen(false);
  };

  const getLabel = (loc: Locale) => {
    const flag = showFlag ? `${localeFlags[loc]} ` : '';
    const name = showFullName ? t(loc) : localeLabels[loc];
    return `${flag}${name}`;
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {getLabel(locale)}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <ul
            role="listbox"
            aria-label="Select language"
            className="absolute right-0 z-20 mt-1 min-w-[120px] bg-white border border-slate-200 rounded-lg shadow-lg py-1"
          >
            {locales.map((loc) => (
              <li key={loc}>
                <button
                  type="button"
                  role="option"
                  aria-selected={locale === loc}
                  onClick={() => handleLocaleChange(loc)}
                  disabled={isPending}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    locale === loc
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  } disabled:opacity-50`}
                >
                  {getLabel(loc)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * Simple inline language switcher using links
 * Useful for footers or minimal UIs
 */
export function LanguageSwitcherInline({ className = '' }: { className?: string }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = (newLocale: Locale) => {
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {locales.map((loc, index) => (
        <span key={loc} className="flex items-center">
          {index > 0 && <span className="text-slate-300 mx-2">|</span>}
          <button
            type="button"
            onClick={() => handleClick(loc)}
            disabled={isPending || locale === loc}
            className={`text-sm transition-colors ${
              locale === loc
                ? 'text-blue-600 font-medium cursor-default'
                : 'text-slate-500 hover:text-slate-700'
            } disabled:opacity-50`}
          >
            {localeLabels[loc]}
          </button>
        </span>
      ))}
    </div>
  );
}
