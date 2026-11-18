"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2rem',
          borderRadius: '14px',
          backgroundColor: '#1e293b',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
        }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: '#f8fafc' }}>
            حدث خطأ غير متوقع في النظام / Critical Application Error
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            بياناتك المحلية محفوظة بالكامل. يرجى إعادة المحاولة أو تحديث التطبيق.
          </p>
          {error?.message && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              direction: 'ltr',
              textAlign: 'left',
              marginBottom: '1.25rem',
              wordBreak: 'break-word'
            }}>
              {String(error.message)}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              إعادة المحاولة / Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #475569',
                backgroundColor: '#334155',
                color: '#f8fafc',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              تحديث الصفحة / Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
