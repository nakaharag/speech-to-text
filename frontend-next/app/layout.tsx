import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: 'speech-to-text.me',
  description: 'Voice transcription & AI summarization',
};

/**
 * Root layout - minimal wrapper for the entire app
 * The locale-specific layout handles i18n setup
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

// Required for next-intl to work properly
export const dynamic = 'force-dynamic';
