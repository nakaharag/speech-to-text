'use client';

interface AdBannerProps {
  position: 'top' | 'bottom';
}

export function AdBanner({ position }: AdBannerProps) {
  // This is a placeholder for ad integration (e.g., Google AdSense)
  // In production, replace with actual ad implementation

  return (
    <div className={`bg-slate-100 border-y border-slate-200 ${position === 'top' ? 'mt-0' : 'mt-8'}`}>
      <div className="container mx-auto px-4">
        <div className="py-4 text-center">
          <div className="inline-flex items-center justify-center min-h-[90px] w-full max-w-[728px] bg-white border border-slate-200 rounded-lg text-slate-400 text-sm">
            {/* Placeholder for ad content */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <span>Advertisement</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
