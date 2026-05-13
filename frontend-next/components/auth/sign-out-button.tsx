'use client';

import { signOut } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';

export function SignOutButton() {
  const t = useTranslations('nav');
  const locale = useLocale();

  return (
    <button
      onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
      className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
    >
      {t('signOut')}
    </button>
  );
}
