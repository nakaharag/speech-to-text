import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      {/* Logo */}
      <Link href="/" className="flex items-center space-x-2 mb-8">
        <svg className="w-10 h-10 text-[#3B82F6]" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 24h4M16 16v16M24 8v32M32 16v16M40 24h4" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <span className="text-2xl font-bold text-slate-900">
          speech-to-text<span className="text-[#3B82F6]">.me</span>
        </span>
      </Link>

      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
