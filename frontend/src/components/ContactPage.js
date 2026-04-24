import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { submitContactForm } from '../utils/api';

export function ContactPage({ onNavigate }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState('idle'); // idle, sending, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      await submitContactForm(formData);
      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message || t('contact.errorGeneric'));
    }
  };

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

        <h1>{t('contact.title')}</h1>
        <p className="contact-intro">{t('contact.intro')}</p>

        {status === 'success' ? (
          <div className="contact-success">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="16 10 10.5 15 8 12.5" />
            </svg>
            <h2>{t('contact.successTitle')}</h2>
            <p>{t('contact.successMessage')}</p>
            <button className="btn btn-primary" onClick={() => setStatus('idle')}>
              {t('contact.sendAnother')}
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">{t('contact.nameLabel')}</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder={t('contact.namePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">{t('contact.emailLabel')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder={t('contact.emailPlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="subject">{t('contact.subjectLabel')}</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                placeholder={t('contact.subjectPlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">{t('contact.messageLabel')}</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="6"
                placeholder={t('contact.messagePlaceholder')}
              />
            </div>

            {status === 'error' && (
              <div className="form-error">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary contact-submit-btn"
              disabled={status === 'sending'}
            >
              {status === 'sending' ? (
                <>
                  <span className="btn-spinner" />
                  {t('contact.sending')}
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {t('contact.submit')}
                </>
              )}
            </button>
          </form>
        )}

        <div className="contact-email">
          <p>{t('contact.directEmail')}</p>
          <a href="mailto:admin@speech-to-text.me">admin@speech-to-text.me</a>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
