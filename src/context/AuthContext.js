"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db';
import { createClient } from '../lib/supabase/client';

const AuthContext = createContext(null);

const DEFAULT_ADMIN = {
  id: 'usr-001-admin',
  username: 'admin',
  role: 'ADMIN',
  password_hash: '',
  pin_code: '',
  is_active: 1,
  full_name: 'مدير النظام (Admin)'
};

export async function hashPassword(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(text));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function isSha256Hex(str) {
  return typeof str === 'string' && /^[0-9a-f]{64}$/i.test(str);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupError, setSetupError] = useState('');
  const [isSavingSetup, setIsSavingSetup] = useState(false);

  // Initialize and check if initial admin password setup is required
  useEffect(() => {
    async function initAuth() {
      try {
        if (typeof window !== 'undefined') {
          const existingAdmin = await db.users.get('usr-001-admin');
          if (!existingAdmin) {
            await db.users.put({
              ...DEFAULT_ADMIN,
              sync_status: 'SYNCED',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          } else if (existingAdmin.password_hash && !isSha256Hex(existingAdmin.password_hash)) {
            const migratedHash = await hashPassword(existingAdmin.password_hash);
            await db.users.update('usr-001-admin', {
              password_hash: migratedHash,
              updated_at: new Date().toISOString()
            });
          }

          const allUsers = await db.users.filter(u => !u.deleted_at).toArray();
          const hasAnyPassword = allUsers.some(
            u => u.password_hash && String(u.password_hash).trim() !== ''
          );

          // Check active Supabase Auth session first (when Supabase is configured)
          const supabase = createClient();
          if (supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const sbUser = session.user;
              const matchedDbUser = allUsers.find(
                u => (u.email && u.email.toLowerCase() === String(sbUser.email || '').toLowerCase()) ||
                     u.id === sbUser.id
              );
              const sessionUser = {
                id: matchedDbUser?.id || sbUser.id,
                username: matchedDbUser?.username || sbUser.email || 'admin',
                email: sbUser.email || matchedDbUser?.email || '',
                role: matchedDbUser?.role || sbUser.user_metadata?.role || 'ADMIN',
                full_name: matchedDbUser?.full_name || sbUser.user_metadata?.full_name || sbUser.email || 'Admin',
                loginAt: new Date().toISOString()
              };
              setNeedsInitialSetup(false);
              setUser(sessionUser);
              localStorage.setItem('jin_engine_auth_user', JSON.stringify(sessionUser));
              setIsLoading(false);
              return;
            }
          }

          if (!hasAnyPassword) {
            // Allow LoginScreen with Demo Admin button instead of blocking behind setup wall
            setNeedsInitialSetup(false);
            const savedSession = localStorage.getItem('jin_engine_auth_user') || sessionStorage.getItem('jin_engine_auth_user');
            if (savedSession) {
              try {
                const parsed = JSON.parse(savedSession);
                if (parsed?.id) {
                  setUser(parsed);
                }
              } catch {
                localStorage.removeItem('jin_engine_auth_user');
                sessionStorage.removeItem('jin_engine_auth_user');
              }
            }
          } else {
            setNeedsInitialSetup(false);
            const savedSession = localStorage.getItem('jin_engine_auth_user') || sessionStorage.getItem('jin_engine_auth_user');
            if (savedSession) {
              try {
                const parsed = JSON.parse(savedSession);
                let dbUser = parsed?.id ? await db.users.get(parsed.id) : null;
                if (!dbUser && parsed?.username) {
                  dbUser = allUsers.find(u => (u.username || '').toLowerCase() === String(parsed.username).toLowerCase()) || null;
                }
                if (!dbUser || dbUser.deleted_at || dbUser.is_active === 0 || dbUser.is_active === false) {
                  setUser(null);
                  localStorage.removeItem('jin_engine_auth_user');
                  sessionStorage.removeItem('jin_engine_auth_user');
                } else {
                  const defaultRole = (dbUser.id === 'usr-001-admin' || String(dbUser.username || '').toLowerCase() === 'admin') ? 'ADMIN' : 'ACCOUNTANT';
                  const verifiedSession = {
                    id: dbUser.id,
                    username: dbUser.username,
                    role: dbUser.role || defaultRole,
                    full_name: dbUser.full_name || dbUser.username,
                    loginAt: parsed.loginAt || new Date().toISOString()
                  };
                  setUser(verifiedSession);
                  if (localStorage.getItem('jin_engine_auth_user')) {
                    localStorage.setItem('jin_engine_auth_user', JSON.stringify(verifiedSession));
                  } else {
                    sessionStorage.setItem('jin_engine_auth_user', JSON.stringify(verifiedSession));
                  }
                }
              } catch (e) {
                console.error('Invalid saved auth session', e);
                setUser(null);
                localStorage.removeItem('jin_engine_auth_user');
                sessionStorage.removeItem('jin_engine_auth_user');
              }
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();

    // Re-verify active session user from DB whenever permissions or user records are updated
    const handleReverifySession = async () => {
      try {
        const savedSession = localStorage.getItem('jin_engine_auth_user') || sessionStorage.getItem('jin_engine_auth_user');
        if (!savedSession) return;
        const parsed = JSON.parse(savedSession);
        if (!parsed?.id) return;
        const dbUser = await db.users.get(parsed.id);
        if (!dbUser || dbUser.deleted_at || dbUser.is_active === 0 || dbUser.is_active === false) {
          setUser(null);
          localStorage.removeItem('jin_engine_auth_user');
          sessionStorage.removeItem('jin_engine_auth_user');
          return;
        }
        const defaultRole = (dbUser.id === 'usr-001-admin' || String(dbUser.username || '').toLowerCase() === 'admin') ? 'ADMIN' : 'ACCOUNTANT';
        const nextRole = dbUser.role || defaultRole;
        if (parsed.role !== nextRole || parsed.username !== dbUser.username) {
          const verifiedSession = {
            ...parsed,
            username: dbUser.username,
            role: nextRole,
            full_name: dbUser.full_name || dbUser.username
          };
          setUser(verifiedSession);
          if (localStorage.getItem('jin_engine_auth_user')) {
            localStorage.setItem('jin_engine_auth_user', JSON.stringify(verifiedSession));
          } else {
            sessionStorage.setItem('jin_engine_auth_user', JSON.stringify(verifiedSession));
          }
        }
      } catch (e) {
        console.error('Error re-verifying user session:', e);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('permission-matrix-updated', handleReverifySession);
      window.addEventListener('storage', handleReverifySession);
      return () => {
        window.removeEventListener('permission-matrix-updated', handleReverifySession);
        window.removeEventListener('storage', handleReverifySession);
      };
    }
  }, []);

  const handleInitialAdminSetup = async (e) => {
    e.preventDefault();
    setSetupError('');
    const pass = setupPassword.trim();
    const confirm = setupConfirm.trim();

    if (!pass) {
      setSetupError('يرجى إدخال كلمة سر للمدير.');
      return;
    }
    if (pass.length < 4) {
      setSetupError('يرجى اختيار كلمة سر مكونة من 4 أحرف أو أرقام على الأقل.');
      return;
    }
    if (pass !== confirm) {
      setSetupError('كلمتا السر غير متطابقتين.');
      return;
    }

    setIsSavingSetup(true);
    try {
      const hashed = await hashPassword(pass);
      const now = new Date().toISOString();
      const existingAdmin = await db.users.get('usr-001-admin');
      if (existingAdmin) {
        await db.users.update('usr-001-admin', {
          password_hash: hashed,
          is_active: 1,
          deleted_at: null,
          updated_at: now,
          sync_status: 'PENDING'
        });
      } else {
        await db.users.put({
          ...DEFAULT_ADMIN,
          password_hash: hashed,
          created_at: now,
          updated_at: now,
          sync_status: 'PENDING'
        });
      }
      setSetupPassword('');
      setSetupConfirm('');
      setNeedsInitialSetup(false);
    } catch (err) {
      console.error('Failed to set admin password:', err);
      setSetupError('حدث خطأ أثناء حفظ كلمة السر.');
    } finally {
      setIsSavingSetup(false);
    }
  };

  const login = async (username, password, remember = true) => {
    try {
      const trimmedUser = (username || '').trim().toLowerCase();
      const trimmedPass = (password || '').trim();

      // 1. Try Supabase Auth when input is an email and Supabase is configured
      const supabase = createClient();
      if (supabase && trimmedUser.includes('@')) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedUser,
          password: trimmedPass,
        });
        if (!error && data?.user) {
          const allUsers = await db.users.filter(u => !u.deleted_at).toArray();
          const matchedDbUser = allUsers.find(
            u => (u.email && u.email.toLowerCase() === trimmedUser.toLowerCase()) || u.id === data.user.id
          );
          const sessionUser = {
            id: matchedDbUser?.id || data.user.id,
            username: matchedDbUser?.username || data.user.email,
            email: data.user.email,
            role: matchedDbUser?.role || data.user.user_metadata?.role || 'ADMIN',
            full_name: matchedDbUser?.full_name || data.user.user_metadata?.full_name || data.user.email,
            loginAt: new Date().toISOString()
          };
          setUser(sessionUser);
          if (remember) {
            localStorage.setItem('jin_engine_auth_user', JSON.stringify(sessionUser));
          } else {
            sessionStorage.setItem('jin_engine_auth_user', JSON.stringify(sessionUser));
          }
          return { success: true, user: sessionUser };
        }
      }

      const allUsers = await db.users.filter(u => !u.deleted_at).toArray();
      const hasAnyPassword = allUsers.some(u => u.password_hash && String(u.password_hash).trim() !== '');
      if (!hasAnyPassword) {
        setNeedsInitialSetup(true);
        return { success: false, message: 'setup_required' };
      }

      const foundUser = allUsers.find(u => (u.username || '').toLowerCase() === trimmedUser);

      if (!foundUser) {
        return { success: false, message: 'username_not_found' };
      }

      if (foundUser.is_active === 0 || foundUser.is_active === false) {
        return { success: false, message: 'account_disabled' };
      }

      const storedHash = String(foundUser.password_hash || '');
      if (!storedHash) {
        return { success: false, message: 'invalid_password' };
      }

      const inputHash = await hashPassword(trimmedPass);
      let validPassword = false;

      if (isSha256Hex(storedHash)) {
        validPassword = storedHash.toLowerCase() === inputHash.toLowerCase();
      } else {
        // Legacy plain-text password check + automatic migration to SHA-256 on first successful login
        if (storedHash === trimmedPass) {
          validPassword = true;
          await db.users.update(foundUser.id, {
            password_hash: inputHash,
            updated_at: new Date().toISOString(),
            sync_status: 'PENDING'
          });
        }
      }

      if (!validPassword) {
        return { success: false, message: 'invalid_password' };
      }

      const defaultRole = (foundUser.id === 'usr-001-admin' || String(foundUser.username || '').toLowerCase() === 'admin') ? 'ADMIN' : 'ACCOUNTANT';
      const sessionUser = {
        id: foundUser.id,
        username: foundUser.username,
        role: foundUser.role || defaultRole,
        full_name: foundUser.full_name || foundUser.username,
        loginAt: new Date().toISOString()
      };

      setUser(sessionUser);
      if (remember) {
        localStorage.setItem('jin_engine_auth_user', JSON.stringify(sessionUser));
      } else {
        sessionStorage.setItem('jin_engine_auth_user', JSON.stringify(sessionUser));
      }

      return { success: true, user: sessionUser };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: 'login_error' };
    }
  };

  const loginWithPin = async (pin, remember = true) => {
    try {
      const trimmedPin = (pin || '').trim();
      if (!trimmedPin) {
        return { success: false, message: 'invalid_pin' };
      }

      const allUsers = await db.users.filter(u => !u.deleted_at && u.is_active !== 0).toArray();
      const hasAnyPassword = allUsers.some(u => u.password_hash && String(u.password_hash).trim() !== '');
      if (!hasAnyPassword) {
        setNeedsInitialSetup(true);
        return { success: false, message: 'setup_required' };
      }

      const matched = allUsers.find(
        u => u.pin_code && String(u.pin_code).trim() !== '' && String(u.pin_code) === trimmedPin
      );

      if (!matched) {
        return { success: false, message: 'invalid_pin' };
      }

      const defaultRole = (matched.id === 'usr-001-admin' || String(matched.username || '').toLowerCase() === 'admin') ? 'ADMIN' : 'ACCOUNTANT';
      const sessionUser = {
        id: matched.id,
        username: matched.username,
        role: matched.role || defaultRole,
        full_name: matched.full_name || matched.username,
        loginAt: new Date().toISOString()
      };

      setUser(sessionUser);
      if (remember) {
        localStorage.setItem('jin_engine_auth_user', JSON.stringify(sessionUser));
      } else {
        sessionStorage.setItem('jin_engine_auth_user', JSON.stringify(sessionUser));
      }

      return { success: true, user: sessionUser };
    } catch (err) {
      console.error('PIN Login error:', err);
      return { success: false, message: 'login_error' };
    }
  };

  const loginAsDemoAdmin = async () => {
    const demoUser = {
      id: 'usr-001-admin',
      username: 'admin',
      role: 'ADMIN',
      full_name: 'Demo Admin (Jin Engine)',
      isDemo: true,
      loginAt: new Date().toISOString()
    };
    setNeedsInitialSetup(false);
    setUser(demoUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jin_engine_auth_user', JSON.stringify(demoUser));
    }
    return { success: true, user: demoUser };
  };

  const logout = async () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jin_engine_auth_user');
      sessionStorage.removeItem('jin_engine_auth_user');
    }
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Supabase signOut warning:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: needsInitialSetup ? null : user,
        isAuthenticated: !needsInitialSetup && !!user,
        isLoading,
        needsInitialSetup,
        login,
        loginWithPin,
        loginAsDemoAdmin,
        logout
      }}
    >
      {!isLoading && needsInitialSetup ? (
        <div
          dir="rtl"
          style={{
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--background, #09090b)',
            color: 'var(--text-main, #fafafa)',
            padding: '1.5rem'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'var(--surface, #18181b)',
              border: '1px solid var(--border, #27272a)',
              borderRadius: '20px',
              padding: '2.25rem',
              boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.35)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <img
                src="/jin-engine-wordmark-dark.svg"
                alt="Jin Engine"
                style={{ height: '46px', width: 'auto', margin: '0 auto 1rem auto', display: 'block', objectFit: 'contain' }}
              />
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
                إنشاء كلمة سر المدير
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #a1a1aa)', margin: 0, lineHeight: 1.6 }}>
                أول تشغيل للنظام — يرجى تحديد كلمة سر خاصة لحساب المدير (<strong>admin</strong>) لتفعيل الدخول وتأمين البيانات.
              </p>
            </div>

            {setupError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  fontWeight: 600
                }}
              >
                {setupError}
              </div>
            )}

            <form onSubmit={handleInitialAdminSetup}>
              <div style={{ marginBottom: '1.1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.45rem' }}>
                  كلمة السر الجديدة
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="أدخل كلمة سر قوية..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border, #27272a)',
                    background: 'var(--background, #09090b)',
                    color: 'var(--text-main, #fafafa)',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.45rem' }}>
                  تأكيد كلمة السر
                </label>
                <input
                  type="password"
                  required
                  value={setupConfirm}
                  onChange={(e) => setSetupConfirm(e.target.value)}
                  placeholder="أعد كتابة كلمة السر..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border, #27272a)',
                    background: 'var(--background, #09090b)',
                    color: 'var(--text-main, #fafafa)',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSavingSetup}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: isSavingSetup ? 'not-allowed' : 'pointer'
                }}
              >
                {isSavingSetup ? 'جاري الحفظ...' : 'حفظ كلمة السر والمتابعة'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
