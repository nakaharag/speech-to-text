import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

// Create the next-intl middleware
const intlMiddleware = createIntlMiddleware(routing);

// Auth pages (without locale prefix - we'll strip it for checking)
const authPages = ['/login', '/signup', '/verify', '/forgot-password', '/reset-password', '/error'];
const protectedPages = ['/dashboard', '/settings'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip i18n for API routes, static files, etc.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Run intl middleware first to handle locale detection and redirects
  const intlResponse = intlMiddleware(req);

  // Extract the pathname without locale prefix for auth checks
  const localePattern = /^\/(en|pt|es)(\/|$)/;
  const pathnameWithoutLocale = pathname.replace(localePattern, '/');

  const isLoggedIn = !!req.auth;
  const isAuthPage = authPages.some((page) => pathnameWithoutLocale.startsWith(page));
  const isProtectedPage = protectedPages.some((page) => pathnameWithoutLocale.startsWith(page));

  // Get the current locale from the path or default to 'en'
  const localeMatch = pathname.match(localePattern);
  const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.nextUrl));
  }

  // Redirect non-logged-in users to login from protected pages
  if (!isLoggedIn && isProtectedPage) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(
      new URL(`/${locale}/login?callbackUrl=${callbackUrl}`, req.nextUrl)
    );
  }

  return intlResponse;
});

export const config = {
  // Match all paths except API, static files, and Next.js internals
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)', '/'],
};
