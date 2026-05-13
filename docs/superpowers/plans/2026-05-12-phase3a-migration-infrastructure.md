# Phase 3A: Migration Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up API proxy to NestJS, configure auth integration, migrate simple static pages (landing, about, contact, legal).

**Architecture:** Next.js API routes proxy requests to NestJS backend. NestJS validates JWT tokens from NextAuth.

**Tech Stack:** Next.js 16, NestJS, next-intl (i18n)

**Prerequisites:** Phase 2A complete (Apple OAuth working)

---

## Task 1: Set Up API Proxy to NestJS

**Files:**
- Create: `frontend-next/app/api/proxy/[...path]/route.ts`
- Modify: `frontend-next/next.config.js`

- [ ] **Step 1: Create proxy API route**

```typescript
// frontend-next/app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = new URL(path, BACKEND_URL);

  // Forward query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Get auth session for authenticated requests
  const session = await auth();

  // Build headers
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Skip host and other problematic headers
    if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Add auth header if user is logged in
  if (session?.user?.id) {
    headers.set('X-User-Id', session.user.id);
    headers.set('X-User-Email', session.user.email || '');
    headers.set('X-User-Tier', session.user.tier || 'free');
  }

  // Forward the request to backend
  try {
    const response = await fetch(url.toString(), {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      // @ts-ignore - duplex is needed for streaming body
      duplex: 'half',
    });

    // Build response headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Backend service unavailable' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context);
}
```

- [ ] **Step 2: Add BACKEND_URL to environment**

Add to `frontend-next/.env.local`:

```bash
# Backend
BACKEND_URL=http://localhost:3000
```

For Docker, this becomes `http://backend:3000`.

- [ ] **Step 3: Test proxy works**

```bash
# Start both frontend and backend
# Frontend should proxy /api/proxy/health to backend /health

curl http://localhost:3001/api/proxy/health
# Should return backend health response
```

---

## Task 2: Update NestJS to Accept Auth from Next.js

**Files:**
- Create: `backend/src/guards/nextauth.guard.ts`
- Create: `backend/src/decorators/current-user.decorator.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create NextAuth guard for NestJS**

```typescript
// backend/src/guards/nextauth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface NextAuthUser {
  id: string;
  email: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
}

@Injectable()
export class NextAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const userId = request.headers['x-user-id'] as string;
    const userEmail = request.headers['x-user-email'] as string;
    const userTier = request.headers['x-user-tier'] as string;

    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    // Attach user to request for later use
    (request as any).user = {
      id: userId,
      email: userEmail || '',
      tier: (userTier as NextAuthUser['tier']) || 'free',
    };

    return true;
  }
}

@Injectable()
export class OptionalNextAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const userId = request.headers['x-user-id'] as string;
    const userEmail = request.headers['x-user-email'] as string;
    const userTier = request.headers['x-user-tier'] as string;

    if (userId) {
      (request as any).user = {
        id: userId,
        email: userEmail || '',
        tier: (userTier as NextAuthUser['tier']) || 'free',
      };
    }

    return true; // Always allow, but attach user if present
  }
}
```

- [ ] **Step 2: Create current user decorator**

```typescript
// backend/src/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { NextAuthUser } from '../guards/nextauth.guard';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): NextAuthUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 3: Export guards and decorators**

Create or update `backend/src/guards/index.ts`:

```typescript
export * from './nextauth.guard';
```

Create or update `backend/src/decorators/index.ts`:

```typescript
export * from './current-user.decorator';
```

- [ ] **Step 4: Example usage in a controller**

```typescript
// Example: backend/src/controllers/transcription.controller.ts
import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { NextAuthGuard, OptionalNextAuthGuard } from '../guards/nextauth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { NextAuthUser } from '../guards/nextauth.guard';

@Controller('speech')
export class TranscriptionController {
  // Endpoint that requires authentication
  @Post('transcribe-authenticated')
  @UseGuards(NextAuthGuard)
  async transcribeAuthenticated(
    @CurrentUser() user: NextAuthUser,
    @Body() body: any,
  ) {
    // user is guaranteed to exist
    console.log('User:', user.id, user.email, user.tier);
    // ... transcription logic
  }

  // Endpoint that works for both anonymous and authenticated users
  @Post('transcribe')
  @UseGuards(OptionalNextAuthGuard)
  async transcribe(
    @CurrentUser() user: NextAuthUser | undefined,
    @Body() body: any,
  ) {
    if (user) {
      // Logged in user - save to history, use their tier limits
    } else {
      // Anonymous user - use IP-based rate limiting
    }
  }
}
```

---

## Task 3: Set Up i18n (Internationalization)

**Files:**
- Install: `next-intl`
- Create: `frontend-next/i18n.ts`
- Create: `frontend-next/messages/en.json`
- Create: `frontend-next/messages/es.json`
- Create: `frontend-next/messages/pt.json`
- Modify: `frontend-next/middleware.ts`

- [ ] **Step 1: Install next-intl**

```bash
cd frontend-next && pnpm add next-intl
```

- [ ] **Step 2: Create i18n configuration**

```typescript
// frontend-next/i18n.ts
import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'es', 'pt'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

- [ ] **Step 3: Create English messages (base)**

```json
// frontend-next/messages/en.json
{
  "common": {
    "appName": "speech-to-text.me",
    "tagline": "Voice transcription & AI summarization",
    "getStarted": "Get Started Free",
    "signIn": "Sign In",
    "signOut": "Sign Out",
    "dashboard": "Dashboard",
    "settings": "Settings",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "landing": {
    "hero": {
      "title": "Convert Speech to Text Instantly",
      "subtitle": "Record or upload audio and get accurate transcriptions powered by AI",
      "cta": "Start Transcribing"
    },
    "features": {
      "title": "Why Choose Us",
      "accurate": {
        "title": "Highly Accurate",
        "description": "Powered by state-of-the-art AI models"
      },
      "fast": {
        "title": "Lightning Fast",
        "description": "Get transcriptions in seconds"
      },
      "secure": {
        "title": "Privacy First",
        "description": "Your audio is processed securely"
      }
    },
    "trustBadges": {
      "free": "Free to use",
      "noSignup": "No signup required",
      "aiPowered": "AI powered"
    }
  },
  "auth": {
    "login": {
      "title": "Welcome back",
      "subtitle": "Sign in to your account"
    },
    "signup": {
      "title": "Create an account",
      "subtitle": "Get started with speech-to-text.me"
    },
    "forgotPassword": {
      "title": "Reset your password",
      "subtitle": "Enter your email to receive a reset link"
    }
  },
  "footer": {
    "about": "About",
    "contact": "Contact",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service",
    "copyright": "© {year} speech-to-text.me. All rights reserved."
  }
}
```

- [ ] **Step 4: Create Spanish messages**

```json
// frontend-next/messages/es.json
{
  "common": {
    "appName": "speech-to-text.me",
    "tagline": "Transcripción de voz y resumen con IA",
    "getStarted": "Comenzar Gratis",
    "signIn": "Iniciar Sesión",
    "signOut": "Cerrar Sesión",
    "dashboard": "Panel",
    "settings": "Configuración",
    "loading": "Cargando...",
    "error": "Error",
    "success": "Éxito"
  },
  "landing": {
    "hero": {
      "title": "Convierte Voz a Texto al Instante",
      "subtitle": "Graba o sube audio y obtén transcripciones precisas con IA",
      "cta": "Comenzar a Transcribir"
    },
    "features": {
      "title": "Por Qué Elegirnos",
      "accurate": {
        "title": "Alta Precisión",
        "description": "Impulsado por modelos de IA de última generación"
      },
      "fast": {
        "title": "Ultra Rápido",
        "description": "Obtén transcripciones en segundos"
      },
      "secure": {
        "title": "Privacidad Primero",
        "description": "Tu audio se procesa de forma segura"
      }
    },
    "trustBadges": {
      "free": "Gratis",
      "noSignup": "Sin registro",
      "aiPowered": "Con IA"
    }
  },
  "auth": {
    "login": {
      "title": "Bienvenido de nuevo",
      "subtitle": "Inicia sesión en tu cuenta"
    },
    "signup": {
      "title": "Crear una cuenta",
      "subtitle": "Comienza con speech-to-text.me"
    },
    "forgotPassword": {
      "title": "Restablecer contraseña",
      "subtitle": "Ingresa tu email para recibir un enlace"
    }
  },
  "footer": {
    "about": "Acerca de",
    "contact": "Contacto",
    "privacy": "Política de Privacidad",
    "terms": "Términos de Servicio",
    "copyright": "© {year} speech-to-text.me. Todos los derechos reservados."
  }
}
```

- [ ] **Step 5: Create Portuguese messages**

```json
// frontend-next/messages/pt.json
{
  "common": {
    "appName": "speech-to-text.me",
    "tagline": "Transcrição de voz e resumo com IA",
    "getStarted": "Começar Grátis",
    "signIn": "Entrar",
    "signOut": "Sair",
    "dashboard": "Painel",
    "settings": "Configurações",
    "loading": "Carregando...",
    "error": "Erro",
    "success": "Sucesso"
  },
  "landing": {
    "hero": {
      "title": "Converta Voz em Texto Instantaneamente",
      "subtitle": "Grave ou envie áudio e obtenha transcrições precisas com IA",
      "cta": "Começar a Transcrever"
    },
    "features": {
      "title": "Por Que Nos Escolher",
      "accurate": {
        "title": "Alta Precisão",
        "description": "Alimentado por modelos de IA de última geração"
      },
      "fast": {
        "title": "Ultra Rápido",
        "description": "Obtenha transcrições em segundos"
      },
      "secure": {
        "title": "Privacidade em Primeiro",
        "description": "Seu áudio é processado com segurança"
      }
    },
    "trustBadges": {
      "free": "Grátis",
      "noSignup": "Sem cadastro",
      "aiPowered": "Com IA"
    }
  },
  "auth": {
    "login": {
      "title": "Bem-vindo de volta",
      "subtitle": "Entre na sua conta"
    },
    "signup": {
      "title": "Criar uma conta",
      "subtitle": "Comece com speech-to-text.me"
    },
    "forgotPassword": {
      "title": "Redefinir senha",
      "subtitle": "Digite seu email para receber um link"
    }
  },
  "footer": {
    "about": "Sobre",
    "contact": "Contato",
    "privacy": "Política de Privacidade",
    "terms": "Termos de Serviço",
    "copyright": "© {year} speech-to-text.me. Todos os direitos reservados."
  }
}
```

- [ ] **Step 6: Update middleware for i18n**

```typescript
// frontend-next/middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export default auth((req) => {
  // Run i18n middleware first
  const intlResponse = intlMiddleware(req);

  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // Remove locale prefix for route matching
  const pathnameWithoutLocale = pathname.replace(/^\/(en|es|pt)/, '') || '/';

  const isAuthPage = ['/login', '/signup', '/verify', '/forgot-password', '/reset-password', '/error'].some(
    (p) => pathnameWithoutLocale.startsWith(p)
  );
  const isProtectedPage = pathnameWithoutLocale.startsWith('/dashboard');

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  // Redirect non-logged-in users to login from protected pages
  if (!isLoggedIn && isProtectedPage) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  return intlResponse || NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

---

## Task 4: Migrate Landing Page (SSG)

**Files:**
- Create: `frontend-next/app/[locale]/page.tsx`
- Create: `frontend-next/app/[locale]/layout.tsx`
- Create: `frontend-next/components/landing/hero.tsx`
- Create: `frontend-next/components/landing/features.tsx`
- Create: `frontend-next/components/landing/footer.tsx`

- [ ] **Step 1: Create locale layout**

```typescript
// frontend-next/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 2: Create landing page**

```typescript
// frontend-next/app/[locale]/page.tsx
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'landing' });

  return {
    title: 'speech-to-text.me - ' + t('hero.title'),
    description: t('hero.subtitle'),
  };
}

export default function LandingPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC] px-4">
        <div className="text-center space-y-8 max-w-2xl">
          {/* Logo */}
          <div className="flex items-center justify-center space-x-3">
            <svg className="w-12 h-12 text-[#3B82F6]" viewBox="0 0 48 48" fill="none">
              <path d="M8 24h4M16 16v16M24 8v32M32 16v16M40 24h4" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
              {t('common.appName').replace('.me', '')}<span className="text-[#3B82F6]">.me</span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl text-slate-600 leading-relaxed">
            {t('landing.hero.title')}
            <br />
            <span className="text-slate-500">{t('landing.hero.subtitle')}</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/transcribe">
              <Button size="lg" className="w-full sm:w-auto px-8">
                {t('landing.hero.cta')}
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
                {t('common.signIn')}
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 pt-8 text-sm text-slate-500">
            <TrustBadge text={t('landing.trustBadges.free')} />
            <TrustBadge text={t('landing.trustBadges.noSignup')} />
            <TrustBadge text={t('landing.trustBadges.aiPowered')} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-6 text-sm text-slate-600">
            <Link href="/about" className="hover:text-slate-900">{t('footer.about')}</Link>
            <Link href="/contact" className="hover:text-slate-900">{t('footer.contact')}</Link>
            <Link href="/privacy" className="hover:text-slate-900">{t('footer.privacy')}</Link>
            <Link href="/terms" className="hover:text-slate-900">{t('footer.terms')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrustBadge({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg className="w-4 h-4 text-[#10B981]" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
      </svg>
      {text}
    </span>
  );
}
```

---

## Task 5: Migrate About & Contact Pages

**Files:**
- Create: `frontend-next/app/[locale]/about/page.tsx`
- Create: `frontend-next/app/[locale]/contact/page.tsx`

- [ ] **Step 1: Create about page**

```typescript
// frontend-next/app/[locale]/about/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'About - speech-to-text.me',
  description: 'Learn about speech-to-text.me and our mission to make transcription accessible.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">About Us</h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-lg text-slate-600 mb-6">
            speech-to-text.me is a modern transcription service that makes it easy to convert
            audio to text using state-of-the-art AI technology.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Our Mission</h2>
          <p className="text-slate-600 mb-6">
            We believe everyone should have access to high-quality transcription tools.
            Whether you're a student, professional, or content creator, our service helps
            you save time and capture important information accurately.
          </p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">Features</h2>
          <ul className="list-disc list-inside text-slate-600 space-y-2 mb-6">
            <li>Real-time audio recording and transcription</li>
            <li>Support for multiple languages</li>
            <li>AI-powered summarization</li>
            <li>PDF to audio conversion</li>
            <li>Secure and private processing</li>
          </ul>

          <div className="mt-12">
            <Link
              href="/contact"
              className="text-[#3B82F6] hover:underline font-medium"
            >
              Have questions? Contact us →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create contact page**

```typescript
// frontend-next/app/[locale]/contact/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/proxy/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Message Sent!</h1>
          <p className="text-slate-600">We'll get back to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Contact Us</h1>
        <p className="text-slate-600 mb-8">Have a question or feedback? We'd love to hear from you.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
            <textarea
              className="flex w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent min-h-[150px]"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

---

## Task 6: Create Legal Pages (Privacy, Terms)

**Files:**
- Create: `frontend-next/app/[locale]/privacy/page.tsx`
- Create: `frontend-next/app/[locale]/terms/page.tsx`

- [ ] **Step 1: Create privacy policy page**

```typescript
// frontend-next/app/[locale]/privacy/page.tsx
export const metadata = {
  title: 'Privacy Policy - speech-to-text.me',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-sm text-slate-500 mb-8">Last updated: May 2026</p>

          <h2>1. Information We Collect</h2>
          <p>When you use speech-to-text.me, we collect:</p>
          <ul>
            <li>Audio files you upload for transcription (processed and deleted after 24 hours)</li>
            <li>Account information (email, name) if you register</li>
            <li>Usage data and analytics</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide transcription services</li>
            <li>Improve our AI models (anonymized data only)</li>
            <li>Send service-related communications</li>
          </ul>

          <h2>3. Data Retention</h2>
          <p>
            Audio files are automatically deleted 24 hours after processing.
            Transcription text is retained based on your subscription tier.
          </p>

          <h2>4. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul>
            <li>OpenAI for transcription processing</li>
            <li>Cloudflare for hosting and security</li>
            <li>Stripe for payment processing</li>
          </ul>

          <h2>5. Contact</h2>
          <p>
            For privacy-related inquiries, contact us at privacy@speech-to-text.me
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create terms of service page**

```typescript
// frontend-next/app/[locale]/terms/page.tsx
export const metadata = {
  title: 'Terms of Service - speech-to-text.me',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-sm text-slate-500 mb-8">Last updated: May 2026</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By using speech-to-text.me, you agree to these terms of service.
            If you do not agree, please do not use our service.
          </p>

          <h2>2. Service Description</h2>
          <p>
            speech-to-text.me provides AI-powered audio transcription and related services.
            We strive for accuracy but cannot guarantee 100% accuracy for all audio types.
          </p>

          <h2>3. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul>
            <li>Not upload illegal or harmful content</li>
            <li>Not attempt to circumvent usage limits</li>
            <li>Not use the service for automated bulk processing without permission</li>
            <li>Have the right to process any audio you upload</li>
          </ul>

          <h2>4. Subscription and Billing</h2>
          <p>
            Paid subscriptions are billed monthly or yearly. Cancellations take effect
            at the end of the current billing period. Refunds are handled on a case-by-case basis.
          </p>

          <h2>5. Limitation of Liability</h2>
          <p>
            speech-to-text.me is provided "as is" without warranties. We are not liable
            for any damages arising from your use of the service.
          </p>

          <h2>6. Changes to Terms</h2>
          <p>
            We may update these terms at any time. Continued use after changes
            constitutes acceptance of the new terms.
          </p>

          <h2>7. Contact</h2>
          <p>
            For questions about these terms, contact us at legal@speech-to-text.me
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Validation Checkpoint

After completing all tasks, verify:

- [ ] API proxy forwards requests to NestJS backend
- [ ] Authenticated requests include user headers
- [ ] NestJS guard extracts user from headers
- [ ] i18n works - switch between en/es/pt
- [ ] Landing page renders with SSG (check page source for content)
- [ ] Landing page uses translations
- [ ] About, Contact, Privacy, Terms pages render correctly
- [ ] Contact form submits to backend
- [ ] Footer links work

---

## Next Phase

After validation passes, proceed to **Phase 3B: Core Features Migration**
