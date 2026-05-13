import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'pt', 'es'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  // List of all supported locales
  locales,

  // Default locale when no locale prefix is detected
  defaultLocale: 'en',

  // Locale detection from Accept-Language header
  localeDetection: true,

  // Always show locale prefix in URL (e.g., /en/login, /pt/login)
  localePrefix: 'always',
});
