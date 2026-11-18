"use client";

import { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PWAInstallPrompt() {
  const { i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register Service Worker for PWA installability
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Service Worker registration skipped:', err);
      });
    }

    const standalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone === true;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);

    const timer = setTimeout(() => {
      setIsStandalone(Boolean(standalone));
      setIsIOSDevice(ios);
    }, 0);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowIOSGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }
    if (isIOSDevice) {
      setShowIOSGuide(true);
    }
  };

  const canShowInstallButton = Boolean(deferredPrompt) || isIOSDevice;
  if (!canShowInstallButton) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className="btn pwa-install-btn"
        title={isRTL ? 'تثبيت التطبيق على الهاتف أو الجهاز' : 'Install Jin Engine App'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.45rem 0.8rem',
          borderRadius: '8px',
          border: '1px solid rgba(37, 99, 235, 0.45)',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          color: '#2563eb',
          fontSize: '0.84rem',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <Download size={15} />
        <span className="hide-on-mobile">
          {isRTL ? 'تثبيت التطبيق' : 'Install App'}
        </span>
      </button>

      {showIOSGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '1rem',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.25rem',
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                <Smartphone size={18} style={{ color: '#2563eb' }} />
                <span>{isRTL ? 'تثبيت Jin Engine على iPhone / iPad' : 'Install Jin Engine on iOS'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="icon-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <ol style={{ margin: 0, paddingInlineStart: '1.25rem', fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
              <li>
                {isRTL ? 'اضغط على أيقونة المشاركة' : 'Tap the Share button'}{' '}
                <Share size={14} style={{ display: 'inline', verticalAlign: 'middle', color: '#2563eb' }} />{' '}
                {isRTL ? 'في شريط متصفح Safari بالأسفل.' : 'in Safari’s toolbar.'}
              </li>
              <li>
                {isRTL
                  ? 'اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).'
                  : 'Scroll down and tap "Add to Home Screen".'}
              </li>
              <li>
                {isRTL ? 'اضغط "إضافة" (Add) لتشغيل النظام كتطبيق مستقل.' : 'Tap "Add" to launch Jin Engine as a full-screen app.'}
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
