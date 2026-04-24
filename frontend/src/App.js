import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { TranscribePage } from './components/TranscribePage';
import { PdfToAudioPage } from './components/PdfToAudioPage';
import { PrivacyPolicy, TermsOfService } from './components/LegalPages';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { AdBanner } from './components/AdBanner';

function App() {
  const { t } = useTranslation();

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [currentPage, setCurrentPage] = useState('home');
  const [sharedId, setSharedId] = useState(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle initial routing
  useEffect(() => {
    const path = window.location.pathname;

    if (path === '/app' || path === '/transcribe') {
      setCurrentPage('app');
    } else if (path === '/pdf-to-audio' || path === '/pdf') {
      setCurrentPage('pdf-to-audio');
    } else if (path === '/privacy' || path === '/privacy-policy') {
      setCurrentPage('privacy');
    } else if (path === '/terms' || path === '/terms-of-service') {
      setCurrentPage('terms');
    } else if (path === '/about') {
      setCurrentPage('about');
    } else if (path === '/contact') {
      setCurrentPage('contact');
    } else {
      const shareMatch = path.match(/^\/s\/([a-zA-Z0-9_-]+)$/);
      if (shareMatch) {
        setSharedId(shareMatch[1]);
        setCurrentPage('app');
      } else {
        setCurrentPage('home');
      }
    }

    // Handle browser back/forward
    const handlePopState = () => {
      const newPath = window.location.pathname;
      if (newPath === '/app' || newPath === '/transcribe') {
        setCurrentPage('app');
      } else if (newPath === '/pdf-to-audio' || newPath === '/pdf') {
        setCurrentPage('pdf-to-audio');
      } else if (newPath === '/privacy' || newPath === '/privacy-policy') {
        setCurrentPage('privacy');
      } else if (newPath === '/terms' || newPath === '/terms-of-service') {
        setCurrentPage('terms');
      } else if (newPath === '/about') {
        setCurrentPage('about');
      } else if (newPath === '/contact') {
        setCurrentPage('contact');
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page) => {
    setCurrentPage(page);
    setSharedId(null);

    const paths = {
      home: '/',
      app: '/app',
      'pdf-to-audio': '/pdf-to-audio',
      privacy: '/privacy',
      terms: '/terms',
      about: '/about',
      contact: '/contact',
    };

    window.history.pushState({}, '', paths[page] || '/');
    window.scrollTo(0, 0);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'app':
        return <TranscribePage sharedId={sharedId} />;
      case 'pdf-to-audio':
        return <PdfToAudioPage />;
      case 'privacy':
        return <PrivacyPolicy onBack={() => navigateTo('home')} />;
      case 'terms':
        return <TermsOfService onBack={() => navigateTo('home')} />;
      case 'about':
        return <AboutPage onNavigate={navigateTo} />;
      case 'contact':
        return <ContactPage onNavigate={navigateTo} />;
      default:
        return <LandingPage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="app">
      <div className="app-wrapper">
        {/* Left Side Ad */}
        <aside className="side-ad">
          <AdBanner slot="1111111111" format="vertical" />
        </aside>

        <div className="container">
          {/* Header */}
          <Header
            currentPage={currentPage}
            onNavigate={navigateTo}
            theme={theme}
            onThemeToggle={toggleTheme}
          />

          {/* Top Leaderboard Ad */}
          <div className="leaderboard-ad">
            <AdBanner slot="1234567890" format="horizontal" />
          </div>

          {/* Main Content */}
          <main className="main">
            {renderPage()}
          </main>

          {/* Bottom Leaderboard Ad */}
          <div className="leaderboard-ad bottom">
            <AdBanner slot="0987654321" format="horizontal" />
          </div>

          {/* Footer */}
          <footer className="footer">
            <p>{t('app.footer')}</p>
            <div className="footer-links">
              <button onClick={() => navigateTo('about')}>{t('footer.about')}</button>
              <span className="footer-divider">|</span>
              <button onClick={() => navigateTo('contact')}>{t('footer.contact')}</button>
              <span className="footer-divider">|</span>
              <button onClick={() => navigateTo('privacy')}>{t('footer.privacy')}</button>
              <span className="footer-divider">|</span>
              <button onClick={() => navigateTo('terms')}>{t('footer.terms')}</button>
            </div>
          </footer>
        </div>

        {/* Right Side Ad */}
        <aside className="side-ad">
          <AdBanner slot="2222222222" format="vertical" />
        </aside>
      </div>
    </div>
  );
}

export default App;
