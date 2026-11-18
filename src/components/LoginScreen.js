"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Lock, User, KeyRound, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Globe, Sun, Moon } from 'lucide-react';
import { ModeToggle } from './mode-toggle';
import { useCompanyProfile } from '../utils/companyProfile';
import { useTheme } from 'next-themes';

export default function LoginScreen() {
  const { resolvedTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { login, loginWithPin, loginAsDemoAdmin } = useAuth();
  const { profile, getDisplayName, getTagline } = useCompanyProfile();

  const [mode, setMode] = useState('password'); // 'password' or 'pin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jin-engine-lang', nextLang);
      document.documentElement.lang = nextLang;
      document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
      if (document.body) document.body.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const res = await login(username, password, remember);
    setLoading(false);

    if (!res.success) {
      if (res.message === 'username_not_found') {
        setErrorMessage(isRTL ? 'اسم المستخدم غير مسجل بالنظام.' : 'Username not found.');
      } else if (res.message === 'invalid_password') {
        setErrorMessage(isRTL ? 'كلمة المرور غير صحيحة.' : 'Incorrect password.');
      } else if (res.message === 'account_disabled') {
        setErrorMessage(isRTL ? 'هذا الحساب معطل، يرجى مراجعة الإدارة.' : 'Account is disabled.');
      } else {
        setErrorMessage(isRTL ? 'فشل تسجيل الدخول، يرجى المحاولة ثانية.' : 'Login failed. Please try again.');
      }
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const res = await loginWithPin(pin, remember);
    setLoading(false);

    if (!res.success) {
      if (res.message === 'invalid_pin') {
        setErrorMessage(isRTL ? 'رمز PIN غير صحيح أو الحساب معطل.' : 'Invalid PIN or account disabled.');
      } else {
        setErrorMessage(isRTL ? 'يرجى إدخال رمز PIN المكون من 4 أرقام.' : 'Please enter a valid 4-digit PIN.');
      }
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(37, 99, 235, 0.08), transparent 70%), var(--background)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative backdrop elements */}
      <div 
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(16, 185, 129, 0.05))',
          filter: 'blur(80px)',
          pointerEvents: 'none'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(37, 99, 235, 0.05))',
          filter: 'blur(75px)',
          pointerEvents: 'none'
        }}
      />

      {/* Top action controls */}
      <div 
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: isRTL ? 'auto' : '1.5rem',
          left: isRTL ? '1.5rem' : 'auto',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          zIndex: 10
        }}
      >
        <button
          onClick={toggleLanguage}
          className="btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-main)',
            cursor: 'pointer'
          }}
        >
          <Globe size={15} />
          {isRTL ? 'English' : 'العربية'}
        </button>
        <ModeToggle />
      </div>

      {/* Main Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '2.5rem',
          boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--border)',
          position: 'relative',
          zIndex: 5
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {profile.logo && profile.logo.startsWith('data:') ? (
            <img 
              src={profile.logo} 
              alt={getDisplayName(isRTL)} 
              style={{
                height: '56px',
                width: 'auto',
                maxWidth: '220px',
                objectFit: 'contain',
                margin: '0 auto 1.25rem auto',
                display: 'block',
                background: 'transparent'
              }}
            />
          ) : (
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.4rem',
              margin: '0 auto 1.25rem auto'
            }}>
              {profile.logo_symbol || 'U'}
            </div>
          )}
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-main)' }}>
            {getDisplayName(isRTL)}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            {getTagline(isRTL)}
          </p>
        </div>

        {/* Mode Selector Tabs (Password vs PIN) */}
        <div 
          style={{
            display: 'flex',
            background: 'var(--surface-hover)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '1.5rem',
            border: '1px solid var(--border)'
          }}
        >
          <button
            type="button"
            onClick={() => { setMode('password'); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '8px',
              border: 'none',
              background: mode === 'password' ? 'var(--surface)' : 'transparent',
              color: mode === 'password' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: mode === 'password' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: mode === 'password' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Lock size={15} />
            {isRTL ? 'كلمة المرور' : 'Password'}
          </button>
          <button
            type="button"
            onClick={() => { setMode('pin'); setErrorMessage(''); }}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '8px',
              border: 'none',
              background: mode === 'pin' ? 'var(--surface)' : 'transparent',
              color: mode === 'pin' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: mode === 'pin' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: mode === 'pin' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <KeyRound size={15} />
            {isRTL ? 'رمز PIN السريع' : 'Quick PIN'}
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div 
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form: Username + Password */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: '1.15rem' }}>
              <label 
                style={{ 
                  display: 'block', 
                  fontSize: '0.825rem', 
                  fontWeight: 600, 
                  marginBottom: '0.45rem', 
                  color: 'var(--text-main)' 
                }}
              >
                {isRTL ? 'اسم المستخدم' : 'Username'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isRTL ? 'أدخل اسم المستخدم (مثال: admin)' : 'e.g. admin'}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    paddingInlineStart: '2.5rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <User 
                  size={16} 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    [isRTL ? 'right' : 'left']: '0.85rem',
                    color: 'var(--text-muted)'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label 
                style={{ 
                  display: 'block', 
                  fontSize: '0.825rem', 
                  fontWeight: 600, 
                  marginBottom: '0.45rem', 
                  color: 'var(--text-main)' 
                }}
              >
                {isRTL ? 'كلمة المرور' : 'Password'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    paddingInlineStart: '2.5rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--background)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
                <Lock 
                  size={16} 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    [isRTL ? 'right' : 'left']: '0.85rem',
                    color: 'var(--text-muted)'
                  }}
                />
              </div>
            </div>

            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: '1.5rem',
                fontSize: '0.825rem' 
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                {isRTL ? 'تذكر الجلسة على هذا الجهاز' : 'Remember me'}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (isRTL ? 'جار التحقق...' : 'Logging in...') : (
                <>
                  <span>{isRTL ? 'تسجيل الدخول' : 'Sign In'}</span>
                  <ArrowRight size={17} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Form: Quick PIN login */}
        {mode === 'pin' && (
          <form onSubmit={handlePinSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label 
                style={{ 
                  display: 'block', 
                  fontSize: '0.825rem', 
                  fontWeight: 600, 
                  marginBottom: '0.45rem', 
                  color: 'var(--text-main)',
                  textAlign: 'center'
                }}
              >
                {isRTL ? 'أدخل رمز PIN الخاص بك (4 أرقام)' : 'Enter your 4-digit PIN'}
              </label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1 2 3 4"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--text-main)',
                  fontSize: '1.4rem',
                  letterSpacing: '0.6rem',
                  textAlign: 'center',
                  outline: 'none',
                  fontWeight: 800
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !pin}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <KeyRound size={17} />
              <span>{isRTL ? 'دخول برمز PIN' : 'Enter with PIN'}</span>
            </button>
          </form>
        )}

        {/* Demo / Test Admin Quick Login for Vercel & Client Evaluation */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.85rem',
            borderRadius: '10px',
            background: 'rgba(37, 99, 235, 0.06)',
            border: '1px dashed rgba(37, 99, 235, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            {isRTL
              ? 'للتجربة السريعة: اضغط للدخول بحساب المدير التجريبي (صلاحيات كاملة)'
              : 'Quick Evaluation: Sign in with Demo Admin (full access to all modules)'}
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setErrorMessage('');
              setLoading(true);
              await loginAsDemoAdmin();
              setLoading(false);
            }}
            className="btn"
            style={{
              width: '100%',
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-main)',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <ShieldCheck size={16} style={{ color: '#2563EB' }} />
            <span>{isRTL ? 'دخول تجريبي كمدير النظام (Demo Admin)' : 'Demo Admin Login (1-Click)'}</span>
          </button>
        </div>

        {/* Security badge & Creator footer */}
        <div 
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.55rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={14} style={{ color: '#10B981' }} />
            <span>{isRTL ? 'حماية مشفرة ومصادقة جلسة آمنة (Role-Based Access)' : 'Protected Session & Encrypted Roles'}</span>
          </div>
          <div dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.9, fontSize: '0.72rem' }}>
            <img src={resolvedTheme === 'light' ? '/jinnworx-logo-light.png' : '/jinnworx-logo-dark.png'} alt="Jinnworx" style={{ height: 18, width: 'auto', objectFit: 'contain' }} />
            <span>Created by <strong style={{ color: '#f97316' }}>Jinnworx</strong> &bull; Developed by <strong style={{ color: 'var(--text-main)' }}>Amr Abdulshafy</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
