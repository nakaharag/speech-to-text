import React from 'react';
import { useTranslation } from 'react-i18next';

export function AboutPage({ onNavigate }) {
  const { t } = useTranslation();

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button className="back-button" onClick={() => onNavigate('home')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t('legal.backToHome')}
        </button>

        <h1>{t('aboutPage.title')}</h1>

        <section className="legal-section">
          <h2>{t('aboutPage.missionTitle')}</h2>
          <p>{t('aboutPage.missionContent')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('aboutPage.whatWeDoTitle')}</h2>
          <p>{t('aboutPage.whatWeDoContent')}</p>
          <ul>
            <li>{t('aboutPage.feature1')}</li>
            <li>{t('aboutPage.feature2')}</li>
            <li>{t('aboutPage.feature3')}</li>
            <li>{t('aboutPage.feature4')}</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>{t('aboutPage.technologyTitle')}</h2>
          <p>{t('aboutPage.technologyContent')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('aboutPage.privacyTitle')}</h2>
          <p>{t('aboutPage.privacyContent')}</p>
        </section>

        <section className="legal-section">
          <h2>{t('aboutPage.contactTitle')}</h2>
          <p>
            {t('aboutPage.contactContent')}{' '}
            <button className="link-button" onClick={() => onNavigate('contact')}>
              {t('aboutPage.contactLink')}
            </button>
          </p>
        </section>
      </div>
    </div>
  );
}

export default AboutPage;
