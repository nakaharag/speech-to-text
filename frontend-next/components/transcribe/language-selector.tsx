'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface Language {
  code: string;
  flag: string;
  nativeName: string;
  group?: string;
}

const LANGUAGES: Language[] = [
  { code: '', flag: '', nativeName: 'Automatic' },
  // English variants
  { code: 'en', flag: 'US', nativeName: 'English', group: 'English' },
  { code: 'en-GB', flag: 'GB', nativeName: 'English', group: 'English' },
  { code: 'en-AU', flag: 'AU', nativeName: 'English', group: 'English' },
  // Portuguese variants
  { code: 'pt', flag: 'BR', nativeName: 'Portugues', group: 'Portuguese' },
  { code: 'pt-PT', flag: 'PT', nativeName: 'Portugues', group: 'Portuguese' },
  // Spanish variants
  { code: 'es', flag: 'ES', nativeName: 'Espanol', group: 'Spanish' },
  { code: 'es-MX', flag: 'MX', nativeName: 'Espanol', group: 'Spanish' },
  { code: 'es-AR', flag: 'AR', nativeName: 'Espanol', group: 'Spanish' },
  // French variants
  { code: 'fr', flag: 'FR', nativeName: 'Francais', group: 'French' },
  { code: 'fr-CA', flag: 'CA', nativeName: 'Francais', group: 'French' },
  // German
  { code: 'de', flag: 'DE', nativeName: 'Deutsch' },
  { code: 'de-AT', flag: 'AT', nativeName: 'Deutsch', group: 'German' },
  { code: 'de-CH', flag: 'CH', nativeName: 'Deutsch', group: 'German' },
  // Italian
  { code: 'it', flag: 'IT', nativeName: 'Italiano' },
  // Chinese variants
  { code: 'zh', flag: 'CN', nativeName: 'Chinese', group: 'Chinese' },
  { code: 'zh-TW', flag: 'TW', nativeName: 'Chinese Traditional', group: 'Chinese' },
  // Japanese
  { code: 'ja', flag: 'JP', nativeName: 'Japanese' },
  // Korean
  { code: 'ko', flag: 'KR', nativeName: 'Korean' },
  // Russian
  { code: 'ru', flag: 'RU', nativeName: 'Russian' },
  // Arabic
  { code: 'ar', flag: 'SA', nativeName: 'Arabic' },
  // Hindi
  { code: 'hi', flag: 'IN', nativeName: 'Hindi' },
  // Dutch
  { code: 'nl', flag: 'NL', nativeName: 'Nederlands' },
  // Polish
  { code: 'pl', flag: 'PL', nativeName: 'Polski' },
  // Turkish
  { code: 'tr', flag: 'TR', nativeName: 'Turkce' },
  // Vietnamese
  { code: 'vi', flag: 'VN', nativeName: 'Vietnamese' },
  // Thai
  { code: 'th', flag: 'TH', nativeName: 'Thai' },
  // Indonesian
  { code: 'id', flag: 'ID', nativeName: 'Bahasa Indonesia' },
  // Swedish
  { code: 'sv', flag: 'SE', nativeName: 'Svenska' },
  // Norwegian
  { code: 'no', flag: 'NO', nativeName: 'Norsk' },
  // Danish
  { code: 'da', flag: 'DK', nativeName: 'Dansk' },
  // Finnish
  { code: 'fi', flag: 'FI', nativeName: 'Suomi' },
  // Greek
  { code: 'el', flag: 'GR', nativeName: 'Greek' },
  // Hebrew
  { code: 'he', flag: 'IL', nativeName: 'Hebrew' },
  // Czech
  { code: 'cs', flag: 'CZ', nativeName: 'Cestina' },
  // Romanian
  { code: 'ro', flag: 'RO', nativeName: 'Romana' },
  // Hungarian
  { code: 'hu', flag: 'HU', nativeName: 'Magyar' },
  // Ukrainian
  { code: 'uk', flag: 'UA', nativeName: 'Ukrainian' },
];

interface LanguageSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LanguageSelector({ value, onChange, disabled }: LanguageSelectorProps) {
  const t = useTranslations('transcribe.languageSelector');
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getLanguageName = (lang: Language) => {
    if (lang.code === '') return t('autoDetect');
    return lang.nativeName;
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
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const handleSelect = (lang: Language) => {
    onChange(lang.code);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg border bg-white
          transition-colors
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedLanguage.flag && (
          <span className="text-base">{selectedLanguage.flag}</span>
        )}
        {!selectedLanguage.flag && (
          <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        )}
        <span className="text-sm font-medium text-slate-700">{getLanguageName(selectedLanguage)}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                placeholder={t('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
            {filteredLanguages.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">{t('noResults')}</li>
            ) : (
              filteredLanguages.map((lang) => (
                <li
                  key={lang.code || 'auto'}
                  className={`
                    flex items-center justify-between px-3 py-2 cursor-pointer
                    ${value === lang.code ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}
                  `}
                  onClick={() => handleSelect(lang)}
                  role="option"
                  aria-selected={value === lang.code}
                >
                  <div className="flex items-center gap-2">
                    {lang.flag ? (
                      <span className="text-base">{lang.flag}</span>
                    ) : (
                      <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    )}
                    <span className="text-sm">{getLanguageName(lang)}</span>
                  </div>
                  {value === lang.code && (
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
