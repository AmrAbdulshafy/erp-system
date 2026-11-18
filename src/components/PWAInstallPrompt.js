"use client";

import { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BANNER_DISMISSED_KEY = 'jin_engine_pwa_banner_dismissed';

export default function PWAInstallPrompt() {
  const { i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
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
    const dismissed = sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1';

    const timer = setTimeout(() => {
      setIsStandalone(Boolean(standalone));
      setIsIOSDevice(ios);
      if (!standalone && !dismissed) {
        setShowBanner(true);
      }
    }, 600);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem(BANNER_DISMISSED_KEY)) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowGuideModal(false);
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

  // Hide only when already running as an installed standalone app
  if (isStandalone) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowBanner(false);
      }
      return;
    }
    setShowGuideModal(true);
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

      {/* Floating Mobile & Desktop PWA Install Notification Banner */}
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
                ? 'ثبّت النظام على Android أو iOS كتطبيق مستقل سريع'
                : 'Add to Home Screen on Android or iOS for app-like speed'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
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

      {showGuideModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
            zIndex: 10050,
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
