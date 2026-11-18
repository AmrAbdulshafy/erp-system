"use client";

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ArrowLeft, ArrowRight, Home } from 'lucide-react';

export default function AccessDenied({ path, role }) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '65vh',
        textAlign: 'center',
        padding: '2rem'
      }}
    >
      <div 
        className="glass-card" 
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)'
        }}
      >
        <div 
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.25rem'
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            {isRTL ? 'غير مصرح بالدخول' : 'Access Denied'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {isRTL 
              ? 'عفواً، ليس لديك الصلاحيات الكافية للوصول إلى هذا القسم. يرجى مراجعة إدارة النظام.'
              : 'You do not have permission to access this area. Please contact the system administrator.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}>
          <Link 
            href="/"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.4rem',
              fontWeight: 700,
              textDecoration: 'none',
              borderRadius: '8px'
            }}
          >
            <Home size={17} />
            <span>{isRTL ? 'العودة للوحة التحكم' : 'Back to Dashboard'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
