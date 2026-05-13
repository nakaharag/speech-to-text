'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export function ContactForm() {
  const t = useTranslations('contact');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
      setErrorMessage(t('errorGeneric'));
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="16 10 10.5 15 8 12.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {t('successTitle')}
        </h2>
        <p className="text-slate-600 mb-6">{t('successMessage')}</p>
        <Button onClick={() => setStatus('idle')} variant="outline">
          {t('sendAnother')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">{t('nameLabel')}</Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            placeholder={t('namePlaceholder')}
            value={formData.name}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder={t('emailPlaceholder')}
            value={formData.email}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">{t('subjectLabel')}</Label>
        <Input
          id="subject"
          name="subject"
          type="text"
          required
          placeholder={t('subjectPlaceholder')}
          value={formData.subject}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">{t('messageLabel')}</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder={t('messagePlaceholder')}
          value={formData.message}
          onChange={handleChange}
        />
      </div>

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={status === 'sending'}
      >
        {status === 'sending' ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {t('sending')}
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {t('submit')}
          </>
        )}
      </Button>
    </form>
  );
}
