import React from 'react';
import { useTranslation } from 'react-i18next';

export function AboutSection() {
  const { t } = useTranslation();

  return (
    <section className="content-section about-section">
      <h2>{t('about.title')}</h2>
      <p>{t('about.description')}</p>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <h3>{t('about.feature1Title')}</h3>
          <p>{t('about.feature1Desc')}</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h3>{t('about.feature2Title')}</h3>
          <p>{t('about.feature2Desc')}</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
          <h3>{t('about.feature3Title')}</h3>
          <p>{t('about.feature3Desc')}</p>
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <section className="content-section how-it-works-section">
      <h2>{t('howItWorks.title')}</h2>

      <div className="steps-container">
        <div className="step">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>{t('howItWorks.step1Title')}</h3>
            <p>{t('howItWorks.step1Desc')}</p>
          </div>
        </div>

        <div className="step">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>{t('howItWorks.step2Title')}</h3>
            <p>{t('howItWorks.step2Desc')}</p>
          </div>
        </div>

        <div className="step">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3>{t('howItWorks.step3Title')}</h3>
            <p>{t('howItWorks.step3Desc')}</p>
          </div>
        </div>

        <div className="step">
          <div className="step-number">4</div>
          <div className="step-content">
            <h3>{t('howItWorks.step4Title')}</h3>
            <p>{t('howItWorks.step4Desc')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FAQSection() {
  const { t } = useTranslation();

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
  ];

  return (
    <section className="content-section faq-section">
      <h2>{t('faq.title')}</h2>

      <div className="faq-list">
        {faqs.map((faq, index) => (
          <details key={index} className="faq-item">
            <summary className="faq-question">{faq.q}</summary>
            <p className="faq-answer">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function UseCasesSection() {
  const { t } = useTranslation();

  return (
    <section className="content-section use-cases-section">
      <h2>{t('useCases.title')}</h2>
      <p className="section-intro">{t('useCases.intro')}</p>

      <div className="use-cases-grid">
        <div className="use-case-card">
          <h3>{t('useCases.case1Title')}</h3>
          <p>{t('useCases.case1Desc')}</p>
        </div>

        <div className="use-case-card">
          <h3>{t('useCases.case2Title')}</h3>
          <p>{t('useCases.case2Desc')}</p>
        </div>

        <div className="use-case-card">
          <h3>{t('useCases.case3Title')}</h3>
          <p>{t('useCases.case3Desc')}</p>
        </div>

        <div className="use-case-card">
          <h3>{t('useCases.case4Title')}</h3>
          <p>{t('useCases.case4Desc')}</p>
        </div>
      </div>
    </section>
  );
}
