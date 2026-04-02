import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const SITE_LANGUAGES = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'pt', flag: '🇧🇷' },
  { code: 'es', flag: '🇪🇸' }
];

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = SITE_LANGUAGES.find(l => l.code === i18n.language) || SITE_LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('siteLanguage', langCode);
    setIsOpen(false);
  };

  return (
    <div className="site-lang-switcher" ref={dropdownRef}>
      <button
        className="site-lang-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change website language"
        title="Change website language"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>

      {isOpen && (
        <div className="site-lang-dropdown">
          {SITE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`site-lang-option ${i18n.language === lang.code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span className="site-lang-flag">{lang.flag}</span>
              <span className="site-lang-name">{t(`siteLang.${lang.code}`)}</span>
              {i18n.language === lang.code && (
                <svg className="site-lang-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
