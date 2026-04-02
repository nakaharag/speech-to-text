import React from 'react';
import { useTranslation } from 'react-i18next';

export function PrivacyPolicy({ onBack }) {
  const { t } = useTranslation();

  return (
    <div className="legal-page">
      <button className="back-button" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        {t('legal.backToHome')}
      </button>

      <h1>{t('privacy.title')}</h1>
      <p className="legal-updated">{t('privacy.lastUpdated')}: April 2026</p>

      <section className="legal-section">
        <h2>{t('privacy.section1Title')}</h2>
        <p>{t('privacy.section1Content')}</p>
      </section>

      <section className="legal-section">
        <h2>{t('privacy.section2Title')}</h2>
        <p>{t('privacy.section2Content')}</p>
        <ul>
          <li>{t('privacy.section2Item1')}</li>
          <li>{t('privacy.section2Item2')}</li>
          <li>{t('privacy.section2Item3')}</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>{t('privacy.section3Title')}</h2>
        <p>{t('privacy.section3Content')}</p>
        <ul>
          <li>{t('privacy.section3Item1')}</li>
          <li>{t('privacy.section3Item2')}</li>
          <li>{t('privacy.section3Item3')}</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>{t('privacy.section4Title')}</h2>
        <p>{t('privacy.section4Content')}</p>
      </section>

      <section className="legal-section">
        <h2>{t('privacy.section5Title')}</h2>
        <p>{t('privacy.section5Content')}</p>
      </section>

      <section className="legal-section">
        <h2>{t('privacy.section6Title')}</h2>
        <p>{t('privacy.section6Content')}</p>
      </section>

      <section className="legal-section">
        <h2>{t('privacy.section7Title')}</h2>
        <p>{t('privacy.section7Content')}</p>
      </section>
    </div>
  );
}

export function TermsOfService({ onBack }) {
  const { t } = useTranslation();

  return (
    <div className="legal-page">
      <button className="back-button" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        {t('legal.backToHome')}
      </button>

      <h1>{t('terms.title')}</h1>
      <p className="legal-updated">{t('terms.lastUpdated')}: April 2026</p>

      <section className="legal-section">
        <h2>{t('terms.section1Title')}</h2>
        <p>{t('terms.section1Content')}</p>
      </section>

      <section className="legal-section">
        <h2>{t('terms.section2Title')}</h2>
        <p>{t('terms.section2Content')}</p>
        <ul>
          <li>{t('terms.section2Item1')}</li>
          <li>{t('terms.section2Item2')}</li>
          <li>{t('terms.section2Item3')}</li>
          <li>{t('terms.section2Item4')}</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>{t('terms.section3Title')}</h2>
        <p>{t('terms.section3Content')}</p>
      </section>

      <section className="legal-section">
        <h2>{t('terms.section4Title')}</h2>
        <p>{t('terms.section4Content')}</p>
      </section>

      <section className="legal-section">
        <h2>{t('terms.section5Title')}</h2>
        <p>{t('terms.section5Content')}</p>
      </section>

      <section className="legal-section">
        <h2>{t('terms.section6Title')}</h2>
        <p>{t('terms.section6Content')}</p>
      </section>

      <section className="legal-section">
        <h2>{t('terms.section7Title')}</h2>
        <p>{t('terms.section7Content')}</p>
      </section>
    </div>
  );
}
