"use client";

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BANNER_DISMISSED_KEY = 'jin_engine_pwa_banner_dismissed';

export default function PWAInstallPrompt() {
  const { i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
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

    const dismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1';

    const timer = setTimeout(() => {
      setIsStandalone(Boolean(standalone));
      if (window.__pwaDeferredPrompt && !standalone) {
        setDeferredPrompt(window.__pwaDeferredPrompt);
        if (!dismissed) setShowBanner(true);
      }
    }, 0);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.__pwaDeferredPrompt = e;
      setDeferredPrompt(e);
      if (!sessionStorage.getItem(BANNER_DISMISSED_KEY)) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      window.__pwaDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowBanner(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isStandalone || !deferredPrompt) return null;

  const handleDirectInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      window.__pwaDeferredPrompt = null;
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDirectInstall}
        className="btn pwa-install-btn"
        title={isRTL ? 'تثبيت التطبيق مباشرة' : 'Install Jin Engine App'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.45rem 0.8rem',
          borderRadius: '8px',
          border: '1px solid rgba(37, 99, 235, 0.45)',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          color: '#2563eb',
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Download size={15} />
        <span>{isRTL ? 'تثبيت التطبيق' : 'Install App'}</span>
      </button>

      {showBanner && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'max(0.85rem, env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100vw - 1.5rem)',
            maxWidth: '460px',
            zIndex: 95,
            background: 'var(--surface)',
            border: '1.5px solid rgba(37, 99, 235, 0.45)',
            borderRadius: '14px',
            padding: '0.85rem 1rem',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.28)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <img
            src="/jin-engine-logo.svg"
            alt="Jin Engine"
            style={{ width: 40, height: 40, borderRadius: '10px', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.25 }}>
              {isRTL ? 'تثبيت تطبيق Jin Engine' : 'Install Jin Engine App'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.35 }}>
              {isRTL
                ? 'اضغط تثبيت الآن لتثبيت التطبيق مباشرة على جهازك'
                : 'Tap Install for direct app installation'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDirectInstall}
            className="btn btn-primary"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {isRTL ? 'تثبيت الآن' : 'Install'}
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            className="icon-btn"
            aria-label={isRTL ? 'إغلاق' : 'Dismiss'}
            style={{ flexShrink: 0, padding: '0.25rem' }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
