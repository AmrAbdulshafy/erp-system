"use client";

import { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PWAInstallPrompt() {
  const { i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
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
      setShowGuideModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Hide only when already running as an installed standalone app
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
    setShowGuideModal(true);
  };

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

      {showGuideModal && (
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
          onClick={() => setShowGuideModal(false)}
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
                <span>
                  {isIOSDevice
                    ? (isRTL ? 'تثبيت Jin Engine على iPhone / iPad' : 'Install Jin Engine on iOS')
                    : (isRTL ? 'تثبيت Jin Engine على الهاتف / الكمبيوتر' : 'Install Jin Engine App')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="icon-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {isIOSDevice ? (
              <ol style={{ margin: 0, paddingInlineStart: '1.25rem', fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
                <li>
                  {isRTL ? 'افتح الموقع في متصفح Safari واضغط على أيقونة المشاركة' : 'In Safari, tap the Share button'}{' '}
                  <Share size={14} style={{ display: 'inline', verticalAlign: 'middle', color: '#2563eb' }} />.
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
            ) : (
              <ol style={{ margin: 0, paddingInlineStart: '1.25rem', fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-muted)' }}>
                <li>
                  {isRTL ? 'في متصفح Chrome أو Edge اضغط على قائمة المتصفح' : 'In Chrome or Edge, tap the browser menu'}{' '}
                  <MoreVertical size={14} style={{ display: 'inline', verticalAlign: 'middle', color: '#2563eb' }} />.
                </li>
                <li>
                  {isRTL
                    ? 'اختر "تثبيت التطبيق" (Install app) أو "الإضافة إلى الشاشة الرئيسية" (Add to Home screen).'
                    : 'Select "Install app" or "Add to Home screen".'}
                </li>
                <li>
                  {isRTL
                    ? 'تأكد من فتح الرابط عبر HTTPS (رابط Vercel) حتى يظهر خيار التثبيت.'
                    : 'Make sure you are visiting the HTTPS Vercel URL so native app installation is enabled.'}
                </li>
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
