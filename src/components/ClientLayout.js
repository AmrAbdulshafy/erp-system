"use client";

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, Package, Clock, Box, Briefcase, 
  ShoppingCart, Receipt, Truck, ShoppingBag, Shield, 
  FileText, ClipboardCheck, Banknote, Search, Database, Settings, MapPin, BookOpen, Wallet, LogOut, UserCircle, UserCheck, Building2, HandCoins, Globe, RotateCcw, Menu, X 
} from 'lucide-react';
import SyncButton from './SyncButton';
import { ModeToggle } from './mode-toggle';
import GlobalSearchModal from './GlobalSearchModal';
import PWAInstallPrompt from './PWAInstallPrompt';
import '../i18n';
import { db } from '../db';
import { useDialog } from './DialogProvider';
import { syncAllLinkedExpenses } from '../utils/syncExpenses';
import { useAuth } from '../context/AuthContext';
import { useCompanyProfile } from '../utils/companyProfile';
import { clearAppCache } from '../utils/cacheManager';
import LoginScreen from './LoginScreen';
import { canAccessScreen, canManageDatabase } from '../utils/permissionMatrix';
import { useTheme } from 'next-themes';
import AccessDenied from './AccessDenied';

export default function ClientLayout({ children }) {
  const { resolvedTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  const dialog = useDialog();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const pathname = usePathname();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [, setMatrixRevision] = useState(0);
  const { profile, getDisplayName, getTagline } = useCompanyProfile();

  const handleBackup = async () => {
    if (!canManageDatabase(user?.role)) {
      dialog.alert({
        variant: 'warning',
        message: isRTL ? 'غير مصرح: تصدير النسخة الاحتياطية يتطلب صلاحية إدارة قواعد البيانات.' : 'Access Denied: Exporting database backup requires database management privileges.'
      });
      return;
    }
    try {
      const counts = {};
      const tableData = {};
      for (const table of db.tables) {
        const rows = await table.toArray();
        tableData[table.name] = rows;
        counts[table.name] = rows.length;
      }

      const safeParse = (raw) => {
        if (raw === null || raw === undefined) return null;
        try { return JSON.parse(raw); } catch { return raw; }
      };

      const data = {
        _meta: {
          app: 'jin-engine',
          schemaVersion: 1,
          exported_at: new Date().toISOString(),
          counts
        },
        settings: {
          jin_engine_company_profile: safeParse(localStorage.getItem('jin_engine_company_profile')),
          permissionMatrix: safeParse(localStorage.getItem('jin_engine_permission_matrix') ?? localStorage.getItem('permissionMatrix')),
          'jin-engine-lang': localStorage.getItem('jin-engine-lang') || 'ar'
        },
        ...tableData
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JinEngine_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Backup failed:', error);
      dialog.alert({ variant: 'error', message: t('backup_failed') });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('jin-engine-lang') || 'ar';
      if (i18n.language !== savedLang) {
        i18n.changeLanguage(savedLang);
      }
      document.documentElement.lang = savedLang;
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
      if (document.body) document.body.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    }
    syncAllLinkedExpenses();

    // Re-render when permission matrix is updated
    const handleMatrixUpdate = () => setMatrixRevision(prev => prev + 1);
    window.addEventListener('permission-matrix-updated', handleMatrixUpdate);
    return () => window.removeEventListener('permission-matrix-updated', handleMatrixUpdate);
  }, []);

  useEffect(() => {
    if (mounted) {
      const isRTL = i18n.language === 'ar';
      document.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = i18n.language;
      if (document.body) document.body.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [i18n.language, mounted]);

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!mounted) return null; // Prevent SSR hydration mismatch

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3rem 1.5rem 2rem',
        background: 'radial-gradient(circle at 50% 25%, rgba(37, 99, 235, 0.12) 0%, var(--background) 70%)',
        color: 'var(--text-main)'
      }}>
        <div />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.15rem', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 92, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spin" style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3px solid rgba(249, 115, 22, 0.18)',
              borderTopColor: '#f97316',
              borderRightColor: 'var(--primary)'
            }} />
            <img
              src="/jin-engine-logo.svg"
              alt="Jin Engine"
              style={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(37, 99, 235, 0.3)',
                display: 'block'
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '0.5px' }}>
              JIN ENGINE ERP SYSTEM
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontWeight: 600 }}>
              {i18n.language === 'ar' ? 'جاري التحقق من الجلسة وتجهيز النظام...' : 'Initializing Jin Engine ERP & Checking Session...'}
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.75rem 1.35rem',
          borderRadius: '14px',
          background: 'var(--surface)',
          border: '1px solid var(--border)'
        }}>
          <img src={resolvedTheme === 'light' ? '/jinnworx-logo-light.png' : '/jinnworx-logo-dark.png'} alt="Jinnworx" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
          <div dir="ltr" style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Created by <strong style={{ color: '#f97316' }}>Jinnworx</strong> &bull; Developed by <strong style={{ color: 'var(--text-main)' }}>Amr Abdulshafy</strong>
          </div>
        </div>
      </div>
    );
  }

  // Enforce mandatory login guard across ALL screens
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jin-engine-lang', nextLang);
      document.documentElement.lang = nextLang;
      if (document.body) document.body.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    }
  };

  const rawNavItems = [
    { name: t('dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('reports') || 'Reports', path: '/reports', icon: FileText },
    { name: i18n.language === 'ar' ? 'الملفات الشاملة (بروفايل)' : 'Entity Profiles', path: '/profile', icon: UserCheck },
    { name: t('quotations'), path: '/quotations', icon: FileText },
    { name: t('sales_orders'), path: '/sales', icon: ShoppingCart },
    { name: t('work_orders'), path: '/work-orders', icon: ClipboardCheck },
    { name: t('purchase_orders'), path: '/purchases', icon: ShoppingBag },
    { name: t('shipping'), path: '/shipping', icon: MapPin },
    { name: t('expenses'), path: '/expenses', icon: Receipt },
    { name: t('owner_withdrawals') || (i18n.language === 'ar' ? 'مسحوبات المالك' : 'Owner Withdrawals'), path: '/owner-withdrawals', icon: Wallet },
    { name: t('customers'), path: '/customers', icon: Briefcase },
    { name: t('suppliers'), path: '/suppliers', icon: Truck },
    { name: t('employees'), path: '/employees', icon: Users },
    { name: t('payroll'), path: '/payroll', icon: Banknote },
    { name: t('employee_loans') || (i18n.language === 'ar' ? 'سلف وقروض الموظفين' : 'Employee Loans'), path: '/loans', icon: HandCoins },
    { name: t('users'), path: '/users', icon: Shield },
    { name: t('production'), path: '/production', icon: Package },
    { name: t('attendance'), path: '/attendance', icon: Clock },
    { name: t('inventory'), path: '/inventory', icon: Box },
    { name: i18n.language === 'ar' ? 'دليل التشغيل (PDF)' : 'Tutorial (PDF)', path: '/tutorial', icon: BookOpen },
    { name: t('settings') || 'Settings', path: '/settings', icon: Settings },
  ];

  // Filter navigation items by role permissions
  const navItems = rawNavItems.filter(item => canAccessScreen(user?.role, item.path));

  // Enforce screen authorization guard on current route
  const isAuthorized = canAccessScreen(user?.role, pathname);


  return (
    <div 
      className="app-layout" 
      style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        height: '100dvh', 
        maxHeight: '100dvh', 
        width: '100%', 
        maxWidth: '100vw', 
        overflow: 'hidden' 
      }}
    >
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 55,
          }}
        />
      )}

      {/* Isolated Scrollable Sidebar */}
      <aside 
        className={`sidebar ${isMobileMenuOpen ? 'sidebar-mobile-open' : ''}`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        style={{ 
          width: (isSidebarHovered || isMobileMenuOpen) ? '240px' : '68px', 
          height: '100dvh',
          maxHeight: '100dvh',
          flexShrink: 0,
          backgroundColor: 'var(--surface)', 
          borderInlineEnd: '1px solid var(--border)', 
          display: 'flex', 
          flexDirection: 'column', 
          transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s ease',
          overflow: 'hidden',
          zIndex: 60
        }}
      >
        {/* Brand / Logo (Sticky Top of Sidebar) */}
        <Link
          href={canAccessScreen(user?.role, '/profile') ? '/profile' : '/'}
          style={{ 
            height: '70px',
            padding: '0 1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            borderBottom: '1px solid var(--border)', 
            whiteSpace: 'nowrap',
            flexShrink: 0,
            textDecoration: 'none',
            color: 'inherit'
          }}
          title={i18n.language === 'ar' ? 'الملفات الشاملة وإعدادات الشركة' : 'Entity Profiles & Company Management'}
        >
          {profile.logo && profile.logo.startsWith('data:') ? (
            <img 
              src={profile.logo} 
              alt={getDisplayName(i18n.language === 'ar')} 
              style={{ 
                height: 36, 
                width: 'auto', 
                maxWidth: 115, 
                objectFit: 'contain', 
                background: 'transparent',
                flexShrink: 0 
              }}
            />
          ) : (
            <img
              src="/jin-engine-logo.svg"
              alt="Jin Engine"
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                flexShrink: 0,
                display: 'block'
              }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', opacity: (isSidebarHovered || isMobileMenuOpen) ? 1 : 0, transition: 'opacity 0.2s', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {getDisplayName(i18n.language === 'ar')}
            </h2>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: i18n.language === 'ar' ? 'normal' : '0.4px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              ( {getTagline(i18n.language === 'ar')} )
            </div>
          </div>
        </Link>

        {/* Navigation list (Independently Scrollable without page scroll) */}
        <nav 
          className="sidebar-nav"
          style={{ 
            padding: '0.75rem 0', 
            flex: 1, 
            minHeight: 0,
            overflowY: 'auto', 
            overflowX: 'hidden',
            overscrollBehavior: 'contain'
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                className="sidebar-link"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0.75rem 1.25rem',
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--surface-hover)' : 'transparent',
                  borderLeft: isActive && i18n.language !== 'ar' ? '4px solid var(--primary)' : 'none',
                  borderRight: isActive && i18n.language === 'ar' ? '4px solid var(--primary)' : 'none',
                  textDecoration: 'none', 
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: 'nowrap',
                  fontSize: '0.9rem',
                  transition: 'background-color 0.15s ease, color 0.15s ease'
                }}
              >
                <item.icon size={20} style={{ flexShrink: 0, marginRight: i18n.language === 'ar' ? 0 : '0.85rem', marginLeft: i18n.language === 'ar' ? '0.85rem' : 0 }} />
                <span style={{ opacity: (isSidebarHovered || isMobileMenuOpen) ? 1 : 0, transition: 'opacity 0.2s' }}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area (Independently Scrollable) */}
      <div 
        style={{ 
          flex: 1, 
          minWidth: 0, 
          height: '100dvh', 
          maxHeight: '100dvh', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}
      >
        {/* Top Header */}
        <header 
          className="header" 
          style={{ 
            position: 'relative', 
            flexShrink: 0, 
            minHeight: '64px', 
            height: 'auto', 
            padding: '0.5rem clamp(1rem, 2vw, 2rem)', 
            gap: '0.75rem', 
            flexWrap: 'wrap' 
          }}
        >
          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="btn mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isRTL ? 'القائمة' : 'Menu'}
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.45rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface-hover)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Global Search Trigger (Ctrl+K) */}
          <button 
            type="button"
            onClick={() => setIsSearchOpen(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.65rem', 
              flex: '1 1 200px',
              maxWidth: '320px', 
              minWidth: '180px',
              padding: '0.45rem 0.85rem', 
              borderRadius: '8px', 
              border: '1px solid var(--border)', 
              background: 'var(--surface)', 
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, background-color 0.15s ease'
            }}
            title={t('search_global_title')}
          >
            <Search size={16} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: i18n.language === 'ar' ? 'right' : 'left', fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {t('search_globally')}
            </span>
            <kbd 
              className="hide-on-mobile"
              style={{ 
                padding: '0.15rem 0.4rem', 
                fontSize: '0.68rem', 
                fontWeight: 600, 
                borderRadius: '4px', 
                border: '1px solid var(--border)', 
                background: 'var(--surface-hover)', 
                color: 'var(--text-muted)', 
                fontFamily: 'monospace',
                flexShrink: 0
              }}
            >
              Ctrl K
            </kbd>
          </button>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {canManageDatabase(user?.role) && (
              <button 
                type="button"
                className="btn" 
                onClick={handleBackup} 
                title={isRTL ? 'تصدير نسخة احتياطية محلية' : 'Quick Local Backup'}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-hover)',
                  color: 'var(--text-main)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <Database size={16} />
                </div>
                <span>{t('backup') || 'Backup'}</span>
              </button>
            )}

            <PWAInstallPrompt />

            <SyncButton />

            {/* Clear Cache Quick Action (Web & Desktop) */}
            <button
              type="button"
              className="btn"
              onClick={async () => {
                const isDesktop = typeof window !== 'undefined' && !!window.jinnworxDesktop;
                const ok = await dialog.confirm({
                  title: isRTL ? 'تفريغ ومسح الذاكرة المؤقتة (Clear Cache)' : 'Clear System Cache',
                  message: isRTL 
                    ? `هل تريد مسح وتفريغ الذاكرة المؤقتة بالكامل؟\n\n• تفريغ كاش المتصفح والملفات المؤقتة (Web CacheStorage).\n${isDesktop ? '• تفريغ كاش جلسة سطح المكتب ومحرك V8 (Desktop Session Cache).\n' : ''}• إعادة تحميل وتحديث الواجهة فوراً.\n• ملاحظة: بياناتك المخزنة محلياً وقواعد البيانات لن تتأثر إطلاقاً.`
                    : `Are you sure you want to clear system cache?\n\n• Purge browser CacheStorage and HTTP memory.\n${isDesktop ? '• Purge Electron desktop V8 session caches.\n' : ''}• Refresh all application assets.\n• Notice: Database records remain completely safe.`,
                  confirmText: isRTL ? 'تفريغ الكاش وتحديث' : 'Clear Cache & Reload'
                });
                if (ok) {
                  await clearAppCache({ reload: true });
                }
              }}
              title={isRTL ? 'تفريغ الذاكرة المؤقتة ومسح الكاش' : 'Clear Cache & Hard Reload'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-hover)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
                <RotateCcw size={15} />
              </div>
              <span className="hide-on-mobile">{isRTL ? 'مسح الكاش' : 'Clear Cache'}</span>
            </button>

            <ModeToggle />

            <button 
              type="button"
              className="btn" 
              onClick={toggleLanguage}
              title={isRTL ? 'التحويل إلى اللغة الإنجليزية' : 'Switch to Arabic'}
              aria-label={isRTL ? 'التحويل إلى اللغة الإنجليزية' : 'Switch to Arabic'}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-hover)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <Globe size={16} />
              </div>
              <span>{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Logged in User Profile & Sign Out */}
            {user && (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.6rem', 
                  padding: '0.35rem 0.65rem', 
                  borderRadius: '10px', 
                  background: 'var(--surface-hover)', 
                  border: '1px solid var(--border)' 
                }}
              >
                <div 
                  style={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--primary), #1d4ed8)', 
                    color: '#ffffff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '0.75rem', 
                    fontWeight: 800,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                  }}
                >
                  {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {user.username}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {user.role || 'ADMIN'}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={async () => {
                    const ok = await dialog.confirm({
                      title: i18n.language === 'ar' ? 'تسجيل الخروج' : 'Sign Out',
                      message: i18n.language === 'ar' ? 'هل تريد إنهاء الجلسة الحالية وتسجيل الخروج؟' : 'Are you sure you want to log out?',
                      confirmText: i18n.language === 'ar' ? 'تسجيل الخروج' : 'Sign Out',
                      cancelText: i18n.language === 'ar' ? 'إلغاء' : 'Cancel',
                      variant: 'logout',
                      icon: 'logout'
                    });
                    if (ok) logout();
                  }}
                  className="icon-btn" 
                  title={i18n.language === 'ar' ? 'تسجيل الخروج' : 'Logout'} 
                  style={{ 
                    color: '#ef4444', 
                    marginInlineStart: '0.25rem',
                    padding: '0.3rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Page Scroll Container */}
        <main 
          className="main-content" 
          style={{ 
            flex: 1, 
            minHeight: 0, 
            width: '100%',
            padding: 'clamp(1rem, 2vw, 1.75rem)', 
            overflowY: 'auto', 
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            boxSizing: 'border-box'
          }}
        >
          {isAuthorized ? children : <AccessDenied path={pathname} role={user?.role} />}
        </main>
      </div>

      {/* Global Search Palette Modal (Ctrl+K) */}
      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </div>
  );
}

