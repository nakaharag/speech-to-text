import { Plus_Jakarta_Sans } from 'next/font/google';
import '@/app/globals.css';
import type { Metadata } from 'next';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: 'Shared Content - speech-to-text.me',
  description: 'View shared transcription from speech-to-text.me',
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} font-sans antialiased bg-[#F8FAFC]`}>
        {children}
      </body>
    </html>
  );
}
