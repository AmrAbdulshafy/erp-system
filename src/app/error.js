"use client";

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error('[JinEngine ErrorBoundary]', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="card" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '2rem',
        textAlign: 'center',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}>
          <AlertTriangle size={30} />
        </div>

        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          حدث خطأ غير متوقع / Unexpected Error
        </h2>

        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          جميع بياناتك محفوظة بأمان داخل قاعدة البيانات المحلية. يمكنك إعادة المحاولة أو تحديث الصفحة للمتابعة.
          <br />
          <span style={{ fontSize: '0.82rem', opacity: 0.85 }}>
            Your local database remains safe. Click below to retry or reload the screen.
          </span>
        </p>

        {error?.message && (
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            textAlign: 'left',
            direction: 'ltr',
            marginBottom: '1.5rem',
            wordBreak: 'break-word'
          }}>
            {String(error.message)}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => reset()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}
          >
            <RefreshCw size={16} />
            <span>إعادة المحاولة / Try Again</span>
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => window.location.reload()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-hover)',
              color: 'var(--text-main)'
            }}
          >
            <Home size={16} />
            <span>تحديث التطبيق / Reload App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
