'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SignupForm() {
  const router = useRouter();
  const t = useTranslations('auth.signup');
  const tErrors = useTranslations('auth.errors');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError(tErrors('passwordMismatch'));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || tErrors('generic'));
        return;
      }

      // Don't expose email in URL - just redirect to verify page
      router.push('/verify');
    } catch (err) {
      setError(tErrors('generic'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          {t('name')}
        </label>
        <Input
          id="name"
          type="text"
          placeholder={t('namePlaceholder')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {t('email')}
        </label>
        <Input
          id="email"
          type="email"
          placeholder={t('emailPlaceholder')}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          {t('password')}
        </label>
        <Input
          id="password"
          type="password"
          placeholder={t('passwordPlaceholder')}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          {t('confirmPassword')}
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder={t('confirmPasswordPlaceholder')}
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
        />
      </div>

      <Button type="submit" className="w-full" isLoading={isLoading}>
        {isLoading ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
