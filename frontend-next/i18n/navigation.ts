import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Navigation utilities with locale-aware routing
 *
 * These should be used instead of Next.js's native Link, redirect, etc.
 * to ensure proper locale handling in URLs.
 */
export const {
  Link,
  redirect,
  usePathname,
  useRouter,
  getPathname,
  permanentRedirect,
} = createNavigation(routing);
