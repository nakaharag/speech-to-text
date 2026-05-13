import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';

/**
 * Configuration for server-side i18n
 *
 * This is used by Next.js to load the correct messages for each request
 * based on the locale parameter from the URL.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Validate that the incoming locale is supported
  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
