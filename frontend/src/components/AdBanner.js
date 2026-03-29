import React, { useEffect } from 'react';

const ADSENSE_ENABLED = process.env.REACT_APP_ADSENSE_ENABLED === 'true';
const ADSENSE_CLIENT = process.env.REACT_APP_ADSENSE_CLIENT || '';

export function AdBanner({ slot, format = 'auto' }) {
  useEffect(() => {
    try {
      if (ADSENSE_ENABLED && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  // Hide ads if not enabled
  if (!ADSENSE_ENABLED) {
    // Show placeholder only in development
    if (process.env.NODE_ENV === 'development') {
      const label = format === 'vertical' ? 'Side Ad (160x600)' : 'Leaderboard Ad (728x90)';
      return (
        <div className="ad-banner">
          <span>{label}</span>
        </div>
      );
    }
    // In production, hide completely when ads not enabled
    return null;
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}

export default AdBanner;
