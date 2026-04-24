import React from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header({ currentPage, onNavigate, theme, onThemeToggle }) {
  const { t } = useTranslation();

  const isToolPage = currentPage === 'app' || currentPage === 'pdf-to-audio';

  return (
    <header className="header">
      <div className="header-left">
        <a href="/" className="logo" onClick={(e) => { e.preventDefault(); onNavigate('home'); }}>
          <svg className="logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="2" y="8" width="2" height="8" rx="1" />
            <rect x="6" y="5" width="2" height="14" rx="1" />
            <rect x="10" y="3" width="2" height="18" rx="1" />
            <rect x="14" y="6" width="2" height="12" rx="1" />
            <rect x="18" y="9" width="2" height="6" rx="1" />
            <rect x="22" y="7" width="2" height="10" rx="1" />
          </svg>
          speech-to-text.me
        </a>
        <nav className="header-nav">
          <button
            className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            {t('nav.home')}
          </button>
          <button
            className={`nav-link ${currentPage === 'app' ? 'active' : ''}`}
            onClick={() => onNavigate('app')}
          >
            {t('nav.transcribe')}
          </button>
          <button
            className={`nav-link ${currentPage === 'pdf-to-audio' ? 'active' : ''}`}
            onClick={() => onNavigate('pdf-to-audio')}
          >
            {t('nav.pdfToAudioShort', 'PDF')}
          </button>
        </nav>
      </div>
      <div className="header-controls">
        {!isToolPage && (
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('app')}>
            {t('nav.getStarted', 'Get Started')}
          </button>
        )}
        <LanguageSwitcher />
        <button
          className="theme-toggle"
          onClick={onThemeToggle}
          title={theme === 'light' ? t('header.darkMode') : t('header.lightMode')}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
}

export default Header;
