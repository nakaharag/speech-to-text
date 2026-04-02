import React from 'react';
import { useTranslation } from 'react-i18next';

export function LandingPage({ onNavigate }) {
  const { t } = useTranslation();

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">{t('landing.heroTitle')}</h1>
          <p className="hero-subtitle">{t('landing.heroSubtitle')}</p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={() => onNavigate('app')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {t('landing.startTranscribing')}
            </button>
          </div>
          <p className="hero-note">{t('landing.heroNote')}</p>
        </div>
        <div className="hero-visual">
          <div className="hero-demo">
            <div className="demo-waveform">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="demo-bar"
                  style={{
                    height: `${20 + Math.sin(i * 0.5) * 30 + Math.random() * 20}%`,
                    animationDelay: `${i * 0.05}s`
                  }}
                />
              ))}
            </div>
            <div className="demo-text">
              <span className="demo-cursor"></span>
              {t('landing.demoText')}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="trust-section">
        <div className="trust-badges">
          <div className="trust-badge">
            <span className="trust-number">30+</span>
            <span className="trust-label">{t('landing.languagesSupported')}</span>
          </div>
          <div className="trust-badge">
            <span className="trust-number">95%+</span>
            <span className="trust-label">{t('landing.accuracy')}</span>
          </div>
          <div className="trust-badge">
            <span className="trust-number">100%</span>
            <span className="trust-label">{t('landing.free')}</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">{t('landing.featuresTitle')}</h2>
        <p className="section-subtitle">{t('landing.featuresSubtitle')}</p>

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
            <h3>{t('landing.feature1Title')}</h3>
            <p>{t('landing.feature1Desc')}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3>{t('landing.feature2Title')}</h3>
            <p>{t('landing.feature2Desc')}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <h3>{t('landing.feature3Title')}</h3>
            <p>{t('landing.feature3Desc')}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <h3>{t('landing.feature4Title')}</h3>
            <p>{t('landing.feature4Desc')}</p>
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
            <h3>{t('landing.feature5Title')}</h3>
            <p>{t('landing.feature5Desc')}</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3>{t('landing.feature6Title')}</h3>
            <p>{t('landing.feature6Desc')}</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <h2 className="section-title">{t('landing.howItWorksTitle')}</h2>
        <p className="section-subtitle">{t('landing.howItWorksSubtitle')}</p>

        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>{t('landing.step1Title')}</h3>
              <p>{t('landing.step1Desc')}</p>
            </div>
          </div>

          <div className="step-connector"></div>

          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>{t('landing.step2Title')}</h3>
              <p>{t('landing.step2Desc')}</p>
            </div>
          </div>

          <div className="step-connector"></div>

          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>{t('landing.step3Title')}</h3>
              <p>{t('landing.step3Desc')}</p>
            </div>
          </div>

          <div className="step-connector"></div>

          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>{t('landing.step4Title')}</h3>
              <p>{t('landing.step4Desc')}</p>
            </div>
          </div>
        </div>

        <div className="section-cta">
          <button className="btn btn-primary btn-lg" onClick={() => onNavigate('app')}>
            {t('landing.tryItNow')}
          </button>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="use-cases-section">
        <h2 className="section-title">{t('landing.useCasesTitle')}</h2>
        <p className="section-subtitle">{t('landing.useCasesSubtitle')}</p>

        <div className="use-cases-grid">
          <div className="use-case-card">
            <div className="use-case-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3>{t('landing.useCase1Title')}</h3>
            <p>{t('landing.useCase1Desc')}</p>
          </div>

          <div className="use-case-card">
            <div className="use-case-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <h3>{t('landing.useCase2Title')}</h3>
            <p>{t('landing.useCase2Desc')}</p>
          </div>

          <div className="use-case-card">
            <div className="use-case-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <h3>{t('landing.useCase3Title')}</h3>
            <p>{t('landing.useCase3Desc')}</p>
          </div>

          <div className="use-case-card">
            <div className="use-case-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
            <h3>{t('landing.useCase4Title')}</h3>
            <p>{t('landing.useCase4Desc')}</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <h2 className="section-title">{t('landing.faqTitle')}</h2>
        <p className="section-subtitle">{t('landing.faqSubtitle')}</p>

        <div className="faq-list">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <details key={num} className="faq-item">
              <summary className="faq-question">{t(`faq.q${num}`)}</summary>
              <p className="faq-answer">{t(`faq.a${num}`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section">
        <h2>{t('landing.finalCtaTitle')}</h2>
        <p>{t('landing.finalCtaSubtitle')}</p>
        <button className="btn btn-primary btn-lg" onClick={() => onNavigate('app')}>
          {t('landing.startFree')}
        </button>
      </section>
    </div>
  );
}

export default LandingPage;
