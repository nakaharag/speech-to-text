import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// Language data with flags (using emoji flags) and dialect variations
const LANGUAGES = [
  { code: '', flag: '🌐', nativeName: 'Automatic' },
  // English variants
  { code: 'en', flag: '🇺🇸', nativeName: 'English', group: 'English' },
  { code: 'en-GB', flag: '🇬🇧', nativeName: 'English', group: 'English' },
  { code: 'en-AU', flag: '🇦🇺', nativeName: 'English', group: 'English' },
  // Portuguese variants
  { code: 'pt', flag: '🇧🇷', nativeName: 'Portugues', group: 'Portuguese' },
  { code: 'pt-PT', flag: '🇵🇹', nativeName: 'Portugues', group: 'Portuguese' },
  // Spanish variants
  { code: 'es', flag: '🇪🇸', nativeName: 'Espanol', group: 'Spanish' },
  { code: 'es-MX', flag: '🇲🇽', nativeName: 'Espanol', group: 'Spanish' },
  { code: 'es-AR', flag: '🇦🇷', nativeName: 'Espanol', group: 'Spanish' },
  // French variants
  { code: 'fr', flag: '🇫🇷', nativeName: 'Francais', group: 'French' },
  { code: 'fr-CA', flag: '🇨🇦', nativeName: 'Francais', group: 'French' },
  // German
  { code: 'de', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'de-AT', flag: '🇦🇹', nativeName: 'Deutsch', group: 'German' },
  { code: 'de-CH', flag: '🇨🇭', nativeName: 'Deutsch', group: 'German' },
  // Italian
  { code: 'it', flag: '🇮🇹', nativeName: 'Italiano' },
  // Chinese variants
  { code: 'zh', flag: '🇨🇳', nativeName: '中文', group: 'Chinese' },
  { code: 'zh-TW', flag: '🇹🇼', nativeName: '繁體中文', group: 'Chinese' },
  // Japanese
  { code: 'ja', flag: '🇯🇵', nativeName: '日本語' },
  // Korean
  { code: 'ko', flag: '🇰🇷', nativeName: '한국어' },
  // Russian
  { code: 'ru', flag: '🇷🇺', nativeName: 'Русский' },
  // Arabic
  { code: 'ar', flag: '🇸🇦', nativeName: 'العربية' },
  // Hindi
  { code: 'hi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  // Dutch
  { code: 'nl', flag: '🇳🇱', nativeName: 'Nederlands' },
  // Polish
  { code: 'pl', flag: '🇵🇱', nativeName: 'Polski' },
  // Turkish
  { code: 'tr', flag: '🇹🇷', nativeName: 'Turkce' },
  // Vietnamese
  { code: 'vi', flag: '🇻🇳', nativeName: 'Tieng Viet' },
  // Thai
  { code: 'th', flag: '🇹🇭', nativeName: 'ไทย' },
  // Indonesian
  { code: 'id', flag: '🇮🇩', nativeName: 'Bahasa Indonesia' },
  // Swedish
  { code: 'sv', flag: '🇸🇪', nativeName: 'Svenska' },
  // Norwegian
  { code: 'no', flag: '🇳🇴', nativeName: 'Norsk' },
  // Danish
  { code: 'da', flag: '🇩🇰', nativeName: 'Dansk' },
  // Finnish
  { code: 'fi', flag: '🇫🇮', nativeName: 'Suomi' },
  // Greek
  { code: 'el', flag: '🇬🇷', nativeName: 'Ελληνικά' },
  // Hebrew
  { code: 'he', flag: '🇮🇱', nativeName: 'עברית' },
  // Czech
  { code: 'cs', flag: '🇨🇿', nativeName: 'Cestina' },
  // Romanian
  { code: 'ro', flag: '🇷🇴', nativeName: 'Romana' },
  // Hungarian
  { code: 'hu', flag: '🇭🇺', nativeName: 'Magyar' },
  // Ukrainian
  { code: 'uk', flag: '🇺🇦', nativeName: 'Українська' },
];

export function LanguageSelector({ value, onChange, disabled }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Helper to get translated language name
  const getLanguageName = (lang) => {
    if (lang.code === '') return t('languageSelector.autoDetect');
    return t(`languages.${lang.code}`, lang.nativeName);
  };

  const selectedLanguage = LANGUAGES.find(lang => lang.code === value) || LANGUAGES[0];

  const filteredLanguages = LANGUAGES.filter(lang => {
    const name = getLanguageName(lang);
    return name.toLowerCase().includes(search.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(search.toLowerCase()) ||
      lang.code.toLowerCase().includes(search.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (lang) => {
    onChange(lang.code);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="language-selector-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`language-selector-button ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="language-flag">{selectedLanguage.flag}</span>
        <span className="language-name">{getLanguageName(selectedLanguage)}</span>
        <svg
          className={`language-chevron ${isOpen ? 'rotated' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="language-dropdown">
          <div className="language-search-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              className="language-search"
              placeholder={t('languageSelector.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ul className="language-list" role="listbox">
            {filteredLanguages.length === 0 ? (
              <li className="language-no-results">{t('languageSelector.noResults')}</li>
            ) : (
              filteredLanguages.map((lang) => {
                const langName = getLanguageName(lang);
                return (
                <li
                  key={lang.code || 'auto'}
                  className={`language-option ${value === lang.code ? 'selected' : ''}`}
                  onClick={() => handleSelect(lang)}
                  role="option"
                  aria-selected={value === lang.code}
                >
                  <span className="language-flag">{lang.flag}</span>
                  <div className="language-info">
                    <span className="language-name">{langName}</span>
                    {lang.nativeName !== langName.split(' ')[0] && (
                      <span className="language-native">{lang.nativeName}</span>
                    )}
                  </div>
                  {value === lang.code && (
                    <svg className="language-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </li>
              );})
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
