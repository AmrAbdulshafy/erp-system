"use client";

import { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ImageModal({ src, alt = 'Image Preview', onClose }) {
  const { t, i18n } = useTranslation();
  const [isOriginalSize, setIsOriginalSize] = useState(false);
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    if (!src) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [src, onClose]);

  if (!src) return null;

  const handleDownload = () => {
    try {
      const a = document.createElement('a');
      a.href = src;
      a.download = `image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'imageModalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <style>{`
        @keyframes imageModalFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Header bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(30, 41, 59, 0.85)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          direction: isRTL ? 'rtl' : 'ltr'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {alt || (t('image_preview') || 'Image Preview')}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', backgroundColor: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '4px' }}>
            {isOriginalSize ? (t('original_size') || '100% Original Size') : (t('fit_screen') || 'Fit Screen')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setIsOriginalSize(!isOriginalSize)}
            title={isOriginalSize ? (t('fit_screen') || 'Fit to screen') : (t('original_size') || 'Original 1:1 Size')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: isOriginalSize ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
          >
            {isOriginalSize ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
            <span>{isOriginalSize ? (t('fit_screen') || 'Fit') : (t('original_size') || '100%')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title={t('download') || 'Download Image'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={16} />
          </button>

          <button
            type="button"
            onClick={onClose}
            title={t('close') || 'Close (Esc)'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: isOriginalSize ? 'auto' : 'hidden',
          borderRadius: '12px',
          position: 'relative',
          padding: '0.5rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <img
          src={src}
          alt={alt}
          onClick={(e) => {
            e.stopPropagation();
            setIsOriginalSize(!isOriginalSize);
          }}
          title={isOriginalSize ? (t('click_to_fit') || 'Click to fit screen') : (t('click_to_zoom') || 'Click to zoom 1:1 original size')}
          style={{
            maxWidth: isOriginalSize ? 'none' : '90vw',
            maxHeight: isOriginalSize ? 'none' : '82vh',
            width: isOriginalSize ? 'auto' : 'auto',
            height: isOriginalSize ? 'auto' : 'auto',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: '#0f172a',
            cursor: isOriginalSize ? 'zoom-out' : 'zoom-in',
            transition: 'max-width 0.2s ease, max-height 0.2s ease'
          }}
        />
      </div>
    </div>
  );
}
