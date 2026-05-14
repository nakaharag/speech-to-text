'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function VerifyPageContent() {
  const t = useTranslations('auth.verify');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setResent(true);
      setShowResendForm(false);
    } catch (error) {
      console.error('Resend error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            {t('checkInbox')}
          </p>

          {resent ? (
            <p className="text-sm text-green-600 font-medium">
              {t('resent')}
            </p>
          ) : showResendForm ? (
            <form onSubmit={handleResend} className="space-y-3 max-w-xs mx-auto">
              <Input
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowResendForm(false)}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={isLoading}
                >
                  {isLoading ? t('resending') : t('resendButton')}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-500">
              <button
                type="button"
                onClick={() => setShowResendForm(true)}
                className="text-blue-600 hover:underline"
              >
                {t('resend')}
              </button>
            </p>
          )}

          <p className="text-sm">
            <Link href="/login" className="text-blue-600 hover:underline">
              {t('backToLogin')}
            </Link>
          </p>
        </div>
      </CardContent>
    </>
  );
}
