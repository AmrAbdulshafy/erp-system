"use client";

import { useState, useRef, useEffect } from 'react';
import { 
  Printer, CheckCircle2, ShoppingBag, FileText, ShoppingCart, 
  Cog, Users, Truck, DollarSign, ShieldAlert, Video, Download, 
  Volume2, VolumeX, BookOpen, Layers, ArrowRight, ArrowDown,
  Calculator, Scale, Landmark, ShieldCheck, FileSpreadsheet,
  PieChart, GitCommit, Check, Clock, Calendar, HelpCircle,
  LayoutDashboard, Box, Receipt, Wallet, UserCheck, Shield,
  Settings, Server, PlugZap, Database, Globe, Search, Plus, Filter,
  ClipboardCheck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Authentic Full-Fidelity Jinn Worx System Screen Window Component
function SystemScreenMockup({ route, title, isRTL, imageSrc, metrics = [], tableHeaders = [], tableRows = [], actions = [] }) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imgError, setImgError] = useState(false);

  const navShortcuts = [
    { icon: LayoutDashboard, path: '/' },
    { icon: Box, path: '/inventory' },
    { icon: FileText, path: '/quotations' },
    { icon: ShoppingCart, path: '/sales' },
    { icon: ClipboardCheck, path: '/work-orders' },
    { icon: ShoppingBag, path: '/purchases' },
    { icon: Users, path: '/employees' },
    { icon: PieChart, path: '/reports' },
    { icon: Settings, path: '/settings' }
  ];

  return (
    <>
      <div className="system-preview-window" style={{ borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface)', boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.25)' }}>
        {/* Window OS Titlebar */}
        <div className="system-preview-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.85rem', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
          <div className="system-traffic-dots" style={{ display: 'flex', gap: '5px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <div className="system-preview-url" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.15rem 0.65rem', borderRadius: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <Globe size={11} style={{ opacity: 0.6 }} />
            <span>https://jin-engine-erp.local{route}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)' }}>
              Jin Engine
            </span>
          </div>
        </div>

        {/* Real App Screenshot Mode */}
        {imageSrc && !imgError ? (
          <div 
            style={{ 
              position: 'relative', 
              width: '100%', 
              background: 'var(--surface)', 
              cursor: 'zoom-in',
              overflow: 'hidden'
            }}
            onClick={() => setIsZoomed(true)}
            title={isRTL ? 'انقر لتكبير لقطة الشاشة الأصلية' : 'Click to zoom screenshot'}
          >
            <img 
              src={imageSrc} 
              alt={title} 
              onError={() => setImgError(true)}
              style={{ 
                width: '100%', 
                height: 'auto', 
                display: 'block',
                objectFit: 'contain'
              }} 
            />
            <div style={{ 
              position: 'absolute', 
              bottom: '10px', 
              left: isRTL ? '10px' : 'auto', 
              right: isRTL ? 'auto' : '10px', 
              background: 'rgba(15, 23, 42, 0.78)', 
              color: '#ffffff', 
              fontSize: '0.72rem', 
              padding: '0.25rem 0.65rem', 
              borderRadius: '6px',
              backdropFilter: 'blur(6px)',
              pointerEvents: 'none',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <span>📸</span>
              <span>{isRTL ? 'لقطة شاشة حقيقية من نظام Jin Engine (انقر للتكبير)' : 'Live Jin Engine Screen Capture (Click to expand)'}</span>
            </div>
          </div>
        ) : (
          /* Screen Body with Sidebar & Content */
          <div style={{ display: 'flex', minHeight: '320px', direction: isRTL ? 'rtl' : 'ltr' }}>
            {/* Authentic Mini-Sidebar */}
            <div style={{ width: '56px', background: 'var(--surface-hover)', borderInlineEnd: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.65rem 0', gap: '0.5rem', flexShrink: 0 }}>
          <div style={{ padding: '0 4px', marginBottom: '0.35rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--primary)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem' }}>
              U
            </div>
          </div>
          {navShortcuts.map((item, idx) => {
            const isActive = route === item.path || (item.path !== '/' && route?.startsWith(item.path));
            const Icon = item.icon;
            return (
              <div
                key={idx}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} />
              </div>
            );
          })}
        </div>

        {/* Main Work Area */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
          
          {/* Top Bar with Global Search & Badges */}
          <div style={{ height: '42px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '0 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, maxWidth: '280px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.2rem 0.55rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Search size={12} />
              <span>{isRTL ? 'بحث شامل في المنظومة...' : 'Search customers, items...'}</span>
              <kbd style={{ marginInlineStart: 'auto', fontSize: '0.62rem', padding: '0.05rem 0.25rem', borderRadius: '3px', border: '1px solid var(--border)', background: 'var(--surface)' }}>Ctrl+K</kbd>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                ● {isRTL ? 'متصل' : 'Online'}
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                Admin
              </span>
            </div>
          </div>

          {/* Screen Content Body */}
          <div style={{ padding: '1rem', flex: 1, overflowX: 'auto', textAlign: isRTL ? 'right' : 'left' }}>
            
            {/* Screen Header Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {isRTL ? 'شاشة النظام الحية — Jin Engine' : 'Live System View — Jin Engine'}
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', margin: '0.1rem 0 0 0' }}>
                  {title}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {actions.map((act, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      background: act.primary ? 'var(--primary)' : 'var(--surface)',
                      color: act.primary ? '#fff' : 'var(--text-main)',
                      border: '1px solid var(--border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: act.primary ? '0 2px 6px rgba(99, 102, 241, 0.25)' : 'none'
                    }}
                  >
                    {act.icon && <act.icon size={12} />}
                    {act.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Metric Cards Row */}
            {metrics.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${metrics.length}, minmax(110px, 1fr))`, gap: '0.65rem', marginBottom: '1rem' }}>
                {metrics.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>{m.label}</span>
                    <span style={{ fontSize: '0.98rem', fontWeight: 900, color: m.color || 'var(--text-main)' }}>{m.val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Data Table Preview */}
            {tableHeaders.length > 0 && (
              <div style={{ borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border)' }}>
                      {tableHeaders.map((h, idx) => (
                        <th key={idx} style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: isRTL ? 'right' : 'left' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: rIdx < tableRows.length - 1 ? '1px solid var(--border)' : 'none', background: rIdx % 2 === 1 ? 'var(--table-row-odd)' : 'var(--table-row-even)' }}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} style={{ padding: '0.5rem 0.75rem', verticalAlign: 'middle', textAlign: isRTL ? 'right' : 'left' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
          </div>
        </div>
      )}
      </div>

      {/* Lightbox Zoom Modal */}
      {isZoomed && imageSrc && (
        <div 
          onClick={() => setIsZoomed(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            cursor: 'zoom-out',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div style={{ maxWidth: '96vw', maxHeight: '96vh', overflow: 'auto', borderRadius: '14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1rem', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ fontSize: '0.9rem' }}>{title} — Jin Engine</strong>
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1.1rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>
            <img src={imageSrc} alt={title} style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        </div>
      )}
    </>
  );
}

export default function TutorialPage() {
  const { t, i18n } = useTranslation();
  
  // Explicit language state for tutorial: 'ar' (RTL) | 'en' (LTR)
  const [tutorialLang, setTutorialLang] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jin-engine-lang');
      if (saved === 'ar' || saved === 'en') return saved;
    }
    return i18n?.language === 'en' ? 'en' : 'ar';
  });
  const isRTL = tutorialLang === 'ar';
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPrintingAll, setIsPrintingAll] = useState(false);
  
  // Tabs: 'all' | 'screens_guide' | 'full_guide' | 'accounting' | 'payroll_law' | 'online_server'
  const [activeTab, setActiveTab] = useState('all');

  const isSectionVisible = (tabKey) => {
    return activeTab === 'all' || activeTab === tabKey || isPrintingAll;
  };

  // Synchronize language if global language changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('jin-engine-lang');
      if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
        setTutorialLang(savedLang);
      } else if (i18n?.language && (i18n.language === 'ar' || i18n.language === 'en')) {
        setTutorialLang(i18n.language);
      }
    }
  }, [i18n?.language]);

  const handlePrint = (scope = 'all') => {
    if (scope === 'all') {
      setIsPrintingAll(true);
      setTimeout(() => {
        window.print();
        const cleanup = () => {
          setIsPrintingAll(false);
          window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        setTimeout(cleanup, 2500);
      }, 200);
    } else {
      window.print();
    }
  };

  const switchLanguage = (lang) => {
    setTutorialLang(lang);
    if (i18n && typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(lang);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('jin-engine-lang', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
    if (isSpeaking && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const arabicNarration = `
    مرحباً بكم في الدليل التدريبي الشامل لنظام Jin Engine لإدارة مصانع التعبئة والتغليف والكرتون.
    يوضح هذا الدليل شرحاً تفصيلياً لكل شاشة وصفحة في النظام بالصور التوضيحية الحية من داخل النظام وكيفية استخدامها،
    ودورة العمل المتكاملة من الشراء حتى التسليم، الهيكل المحاسبي، معادلات الرواتب والغياب، وإعداد السيرفر السحابي.
  `;

  const englishNarration = `
    Welcome to the Jin Engine ERP comprehensive operational and financial manual for corrugated carton and packaging plants.
    This interactive manual covers detailed screen-by-screen system previews, step-by-step instructions,
    the complete manufacturing lifecycle, chart of accounts, payroll calculations with attendance deductions,
    and remote MySQL cloud server setup for seamless multi-device synchronization.
  `;

  const toggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(isRTL ? arabicNarration : englishNarration);
      utterance.lang = isRTL ? 'ar-SA' : 'en-US';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div 
      className="tutorial-container"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ 
        maxWidth: '1160px', 
        margin: '0 auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2rem',
        direction: isRTL ? 'rtl' : 'ltr',
        textAlign: isRTL ? 'right' : 'left'
      }}
    >
      <style jsx global>{`
        @media screen {
          .tutorial-print-cover {
            display: none !important;
          }
        }
        @media print {
          .hide-on-print,
          .navbar,
          .sidebar,
          header,
          aside,
          button:not(.allow-print) {
            display: none !important;
          }
          .tutorial-print-cover {
            display: block !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .tutorial-section {
            display: block !important;
            page-break-before: always !important;
            break-before: page !important;
            margin-bottom: 2rem !important;
          }
          .system-preview-window,
          .tutorial-card,
          table,
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      
      {/* Top Header & Export Controls */}
      <div className="glass-card hide-on-print" style={{ padding: '1.75rem', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="badge-pill badge-pill-primary">
              VERIFIED 2026 ERP MANUAL
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Jin Engine</span>
          </div>
          <h1 className="page-title" style={{ margin: '0 0 0.35rem 0', fontSize: '1.85rem', fontWeight: 900 }}>
            {isRTL ? 'الدليل التشغيلي والمحاسبي والربط السحابي (Illustrated Manual)' : 'Corrugated Packaging ERP: Illustrated Screen Manual & Architecture'}
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            {isRTL 
              ? 'دليل تفصيلي مدعوم بنماذج شاشات النظام الحية، الدورة التشغيلية، القيود المحاسبية، معادلات الرواتب والغياب، وطريقة ربط السيرفر السحابي.' 
              : 'Interactive screen mockups, complete production pipeline, chart of accounts, statutory payroll formulas, and cloud MySQL sync.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Language Switcher Button Group */}
          <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => switchLanguage('ar')}
              style={{
                padding: '0.5rem 0.85rem',
                border: 'none',
                background: tutorialLang === 'ar' ? 'var(--primary)' : 'var(--surface-hover)',
                color: tutorialLang === 'ar' ? '#fff' : 'var(--text-main)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>العربية (RTL)</span>
            </button>
            <button
              type="button"
              onClick={() => switchLanguage('en')}
              style={{
                padding: '0.5rem 0.85rem',
                border: 'none',
                background: tutorialLang === 'en' ? 'var(--primary)' : 'var(--surface-hover)',
                color: tutorialLang === 'en' ? '#fff' : 'var(--text-main)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Globe size={14} />
              <span>English (LTR)</span>
            </button>
          </div>

          <button 
            type="button"
            onClick={toggleSpeech}
            className="btn"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              backgroundColor: isSpeaking ? 'var(--primary)' : 'var(--surface-hover)', 
              color: isSpeaking ? 'var(--primary-foreground)' : 'var(--text-main)',
              border: '1px solid var(--border)',
              padding: '0.55rem 0.95rem', 
              fontSize: '0.85rem'
            }}
          >
            {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isSpeaking ? (isRTL ? 'إيقاف الصوت' : 'Stop Audio') : (isRTL ? 'استماع صوتي' : 'Listen Audio')}</span>
          </button>

          <a 
            href="/jin_engine_tutorial.mp4" 
            download="JinEngine_Tutorial_Video.mp4"
            className="btn"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              textDecoration: 'none', 
              backgroundColor: 'var(--surface-hover)', 
              border: '1px solid var(--border)', 
              color: 'var(--text-main)',
              padding: '0.55rem 0.95rem', 
              fontSize: '0.85rem'
            }}
          >
            <Download size={16} />
            <span>{isRTL ? 'تحميل الفيديو MP4' : 'Download Video MP4'}</span>
          </a>

          {/* Main PDF Export Button Group (Extracts All Tutorials) */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button 
              type="button"
              onClick={() => handlePrint('all')}
              className="btn btn-primary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.55rem 1.35rem', 
                fontWeight: 800, 
                fontSize: '0.88rem',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
              }}
              title={isRTL ? 'تصدير وطباعة كافة أقسام الدليل في ملف PDF واحد متكامل' : 'Export and print all manual sections into a single complete PDF'}
            >
              <Printer size={18} />
              <span>{isRTL ? 'تصدير الدليل الشامل كـ PDF (الكل)' : 'Export Complete Manual as PDF'}</span>
            </button>

            {activeTab !== 'all' && (
              <button 
                type="button"
                onClick={() => handlePrint('current')}
                className="btn"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  padding: '0.55rem 0.85rem', 
                  fontWeight: 700, 
                  fontSize: '0.8rem',
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)'
                }}
                title={isRTL ? 'طباعة القسم الحالي المعروض فقط' : 'Print currently active section only'}
              >
                <span>{isRTL ? 'القسم الحالي فقط' : 'Current Section Only'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', flexWrap: 'wrap' }} className="hide-on-print">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'all' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'all' ? '#fff' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <BookOpen size={17} />
          <span>{isRTL ? '📑 الدليل الشامل كاملاً (جميع الأقسام)' : '📑 Complete Manual (All Sections)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('screens_guide')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'screens_guide' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'screens_guide' ? '#fff' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={17} />
          <span>{isRTL ? 'دليل الشاشات وصور النظام' : 'Illustrated Screen Manual'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('full_guide')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'full_guide' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'full_guide' ? '#fff' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <CheckCircle2 size={17} />
          <span>{isRTL ? 'دورة حياة أمر الشغل والتصنيع' : 'End-to-End Operational Workflow'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('accounting')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'accounting' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'accounting' ? '#fff' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Landmark size={17} />
          <span>{isRTL ? 'الربط المحاسبي وهيكلة الحسابات' : 'Accounting Link & Chart of Accounts'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payroll_law')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'payroll_law' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'payroll_law' ? '#fff' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Scale size={17} />
          <span>{isRTL ? 'معادلات الرواتب وقوانين العمل' : 'Payroll, Deductions & Labor Law'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('online_server')}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'online_server' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'online_server' ? '#fff' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Server size={17} />
          <span>{isRTL ? 'الربط بسيرفر أونلاين والمزامنة' : 'Online Cloud Server Setup & Sync'}</span>
        </button>
      </div>

      {/* Printable Executive Cover Page (Visible When Printing / Exporting to PDF) */}
      <div 
        className="print-area tutorial-print-cover"
        style={{
          border: '2px solid var(--border)',
          borderRadius: '16px',
          padding: '3rem 2.5rem',
          background: '#ffffff',
          color: '#09090b',
          textAlign: 'center',
          marginBottom: '2rem',
          direction: isRTL ? 'rtl' : 'ltr'
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', borderRadius: '999px', background: '#f4f4f5', border: '1px solid #e4e4e7', fontSize: '0.78rem', fontWeight: 800, marginBottom: '1.5rem', letterSpacing: '0.5px' }}>
          <ShieldCheck size={16} color="#10b981" />
          <span>JIN ENGINE — ENTERPRISE PACKAGING SYSTEM 2026</span>
        </div>
        
        <h1 style={{ fontSize: '2.3rem', fontWeight: 900, margin: '0 0 1rem 0', lineHeight: 1.3, color: '#09090b' }}>
          {isRTL 
            ? 'الدليل التشغيلي والمحاسبي والتقني الشامل لمصانع الكرتون والتغليف'
            : 'Comprehensive Operational, Accounting & Cloud Manual for Packaging Plants'}
        </h1>
        
        <p style={{ fontSize: '1.05rem', color: '#52525b', maxWidth: '820px', margin: '0 auto 2rem auto', lineHeight: 1.7 }}>
          {isRTL
            ? 'دليل مرجعي معتمد يغطي كافة شاشات النظام بالصور والنماذج الحية، دورة التصنيع المتكاملة من الشراء حتى التسليم، القيود المحاسبية، معادلات الرواتب والإنتاجية، وربط السيرفر السحابي.'
            : 'Official factory reference manual covering live system screen mockups, end-to-end corrugation production lifecycle, automated journal entries, piece-work payroll formulas, and remote cloud database synchronization.'}
        </p>

        {/* Table of Contents Box */}
        <div style={{ maxWidth: '750px', margin: '0 auto 2.5rem auto', textAlign: isRTL ? 'right' : 'left', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '1.5rem', background: '#fafafa' }}>
          <div style={{ fontWeight: 900, fontSize: '0.95rem', marginBottom: '0.85rem', color: '#09090b', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.5rem' }}>
            {isRTL ? 'فهرس محتويات الدليل الشامل:' : 'Complete Manual Table of Contents:'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem', fontSize: '0.88rem', color: '#27272a' }}>
            <div><strong>1.</strong> {isRTL ? 'دليل الشاشات ونماذج النظام الحية' : 'Per-Screen Guide & Live UI Mockups'}</div>
            <div><strong>2.</strong> {isRTL ? 'دورة حياة أمر الشغل والتصنيع (خطوة بخطوة)' : 'Factory Production Lifecycle & Order Journey'}</div>
            <div><strong>3.</strong> {isRTL ? 'الربط المحاسبي وقيود اليومية الآلية' : 'Accounting Link & Automated Journal Entries'}</div>
            <div><strong>4.</strong> {isRTL ? 'معادلات الرواتب والغياب واليوميات' : 'Payroll, Deductions & Labor Law Formulas'}</div>
            <div><strong>5.</strong> {isRTL ? 'دليل إدخال وربط السيرفر السحابي والمزامنة' : 'Remote Cloud MySQL Server Setup & Sync'}</div>
            <div><strong>6.</strong> {isRTL ? 'قائمة التحقق وجاهزية التشغيل 100%' : '100% Production Readiness Verification'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e4e4e7', paddingTop: '1.25rem', fontSize: '0.85rem', color: '#71717a', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span>{isRTL ? 'نظام Jin Engine لإدارة المصانع (Jin Engine Enterprise ERP)' : 'Jin Engine ERP System'}</span>
          <span>{isRTL ? 'اللغة: العربية (المعتمدة)' : 'Language: English Edition'}</span>
          <span>{new Date().getFullYear()} © All Rights Reserved</span>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* SECTION 0: COMPREHENSIVE SCREEN-BY-SCREEN MANUAL WITH LIVE SYSTEM UI SCREENS */}
      {/* ========================================================================================= */}
      {(isSectionVisible('screens_guide') || typeof window === 'undefined') && (
        <div className="glass-card print-area tutorial-section" style={{ border: '1px solid var(--border)', padding: '2rem' }}>
          
          <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Layers size={26} style={{ color: 'var(--primary)' }} />
              <span>{isRTL ? 'دليل شاشات وصفحات النظام التفصيلي (مدعوم بنماذج الشاشات الحية)' : 'Detailed Per-Screen Operational Guide with Live UI Mockups'}</span>
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {isRTL 
                ? 'استعراض دقيق لكل صفحة في نظام Jin Engine متضمناً صورة حية طبق الأصل من الشاشة، طريقة إدخال البيانات، الأزرار التفاعلية، والأثر المحاسبي والتشغيلي.' 
                : 'Detailed operational breakdown for all system screens, paired with high-fidelity system UI previews, field explanations, and accounting integration.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

            {/* Screen 1: Dashboard */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '14px', border: '1px solid var(--border)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <LayoutDashboard size={24} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? '1. لوحة التحكم والقيادة التنفيذية (Dashboard - /)' : '1. Executive Plant Dashboard (Route: /)'}
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                <strong>{isRTL ? 'وظيفة الشاشة:' : 'Screen Purpose:'}</strong>{' '}
                {isRTL 
                  ? 'المركز القيادي اللحظي للمصنع. تجمع مؤشرات الإيرادات المحصلة، إجمالي المبيعات، مشتريات المواد الخام، المصروفات التشغيلية، وصافي الربح النقدي والتراكمي ونواقص المخزون.'
                  : 'The real-time operational and financial command center of the packaging plant. Aggregates revenue, gross sales, raw material purchases, operating expenses, and cash vs accrual profit.'}
              </p>

              {/* LIVE SCREEN PREVIEW FRAME */}
              <SystemScreenMockup
                route="/"
                imageSrc="/tutorials/screens/dashboard.png"
                title={isRTL ? 'لوحة التحكم والقيادة التنفيذية' : 'Executive Plant Dashboard'}
                isRTL={isRTL}
                actions={[
                  { label: isRTL ? 'تقرير معتمد' : 'Audit Report', primary: false, icon: Printer },
                  { label: isRTL ? 'مزامنة السيرفر' : 'Cloud Sync', primary: true, icon: PlugZap }
                ]}
                metrics={[
                  { label: isRTL ? 'صافي الربح النقدي' : 'Net Cash Profit', val: '+ 42,500 EGP', color: '#10b981' },
                  { label: isRTL ? 'إجمالي المبيعات' : 'Gross Sales', val: '128,000 EGP', color: '#2563eb' },
                  { label: isRTL ? 'مشتريات الخامات' : 'Raw Purchases', val: '65,200 EGP', color: '#d97706' },
                  { label: isRTL ? 'أوامر تصنيع جارية' : 'Active Orders', val: '6 Orders', color: '#8b5cf6' }
                ]}
                tableHeaders={[
                  isRTL ? 'رقم الطلب' : 'Order ID',
                  isRTL ? 'العميل' : 'Customer',
                  isRTL ? 'الكمية' : 'Quantity',
                  isRTL ? 'الإجمالي' : 'Total',
                  isRTL ? 'الحالة' : 'Status'
                ]}
                tableRows={[
                  ['#SO-1082', 'Delta Foods', '5,000 Pcs', '42,500 EGP', <span key="1" className="badge-pill badge-pill-success">DELIVERED</span>],
                  ['#SO-1083', 'Nile Beverage Co.', '12,000 Pcs', '96,000 EGP', <span key="2" className="badge-pill badge-pill-warning">PRODUCTION</span>],
                  ['#SO-1084', 'El Salam Logistics', '3,500 Pcs', '28,000 EGP', <span key="3" className="badge-pill badge-pill-primary">CONFIRMED</span>]
                ]}
              />

              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.84rem', lineHeight: 1.7, marginTop: '1rem' }}>
                <strong>{isRTL ? 'كيفية الاستخدام والأثر التشغيلي:' : 'How to Use & Operational Triggers:'}</strong>
                <ul style={{ margin: '0.4rem 0 0 0', paddingInlineStart: '1.2rem' }}>
                  <li>{isRTL ? 'مراقبة كروت الأداء الرئيسية (KPIs) ونقص الخامات في المخزن.' : 'Monitor key performance indicators (KPIs), gross margins, and low-stock raw material alerts.'}</li>
                  <li>{isRTL ? 'متابعة أوامر الشغل التي لا تزال قيد التنفيذ في خط الإنتاج والتكسير.' : 'Track pending factory work orders across corrugation, die-cutting, and printing machinery.'}</li>
                  <li>{isRTL ? 'متابعة مديونيات العملاء ومستحقات الموردين ومسحوبات المالكين لحظياً.' : 'Review accounts receivable (A/R), supplier payables (A/P), and owner withdrawals in real time.'}</li>
                </ul>
              </div>
            </div>

            {/* Screen 2: Inventory & Materials */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '14px', border: '1px solid var(--border)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <Box size={24} style={{ color: '#10b981' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? '2. المخزون والمواد الخام (Inventory - /inventory)' : '2. Warehouse & Raw Materials Inventory (Route: /inventory)'}
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                <strong>{isRTL ? 'وظيفة الشاشة:' : 'Screen Purpose:'}</strong>{' '}
                {isRTL 
                  ? 'إدارة مستودع المواد الخام ومتابعة أرصدة رولات الكرافت، الدوبلكس، الغراء، والأحبار، مع تطبيق نظام الخصم الآلي (BOM) عند إنهاء أوامر الإنتاج.'
                  : 'Manages raw material inventories: Kraft rolls, Duplex sheets, starch adhesives, and flexo printing inks, with automatic BOM deduction on completed work orders.'}
              </p>

              {/* LIVE SCREEN PREVIEW FRAME */}
              <SystemScreenMockup
                route="/inventory"
                imageSrc="/tutorials/screens/inventory.png"
                title={isRTL ? 'إدارة المخزن والمواد الخام' : 'Raw Materials & Warehouse Inventory'}
                isRTL={isRTL}
                actions={[
                  { label: isRTL ? 'تصدير كشف المخزن' : 'Export Stock', primary: false, icon: FileSpreadsheet },
                  { label: isRTL ? 'إضافة خامة جديدة' : 'Add Material', primary: true, icon: Plus }
                ]}
                metrics={[
                  { label: isRTL ? 'إجمالي أصناف الخامات' : 'Total Materials', val: '28 Items', color: '#2563eb' },
                  { label: isRTL ? 'رصيد ورق كرافت' : 'Kraft Rolls Stock', val: '45.2 Tons', color: '#10b981' },
                  { label: isRTL ? 'تنبيهات نقص المخزون' : 'Low Stock Alerts', val: '2 Alerts', color: '#ef4444' }
                ]}
                tableHeaders={[
                  isRTL ? 'اسم المادة الخام' : 'Material Name',
                  isRTL ? 'التصنيف' : 'Category',
                  isRTL ? 'الوحدة' : 'Unit',
                  isRTL ? 'الرصيد الحالي' : 'Current Stock',
                  isRTL ? 'حد الأمان' : 'Min Alert'
                ]}
                tableRows={[
                  ['Imported Kraft Roll 140 GSM', 'Kraft Paper', 'Ton', '14.50', <span key="1" className="badge-pill badge-pill-success">Normal</span>],
                  ['Fluting Paper Roll 120 GSM', 'Fluting', 'Ton', '18.20', <span key="2" className="badge-pill badge-pill-success">Normal</span>],
                  ['Corn Starch Glue (Industrial)', 'Adhesive', 'KG', '85.00', <span key="3" className="badge-pill badge-pill-danger">CRITICAL (Min 100)</span>],
                  ['Flexo Printing Ink (Black)', 'Printing Inks', 'Liter', '40.00', <span key="4" className="badge-pill badge-pill-warning">LOW (Min 50)</span>]
                ]}
              />

              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.84rem', lineHeight: 1.7, marginTop: '1rem' }}>
                <strong>{isRTL ? 'خطوات الاستخدام:' : 'Operational Workflow:'}</strong>
                <ul style={{ margin: '0.4rem 0 0 0', paddingInlineStart: '1.2rem' }}>
                  <li>{isRTL ? 'انقر زر "+ إضافة جديد" لتسجيل خامة جديدة، وتحديد الوحدة وحد التنبيه الأدنى.' : 'Click "+ Add New" to register materials, specify units (KG, Ton, Roll), and set minimum alert thresholds.'}</li>
                  <li>{isRTL ? 'أرصدة الخامات تزيد تلقائياً عند استلام أوامر الشراء، وتنقص تلقائياً عند اكتمال أوامر الشغل (BOM).' : 'Raw material stock increases on purchase orders and deducts automatically on work order completion via automated BOM.'}</li>
                </ul>
              </div>
            </div>

            {/* Screen 3: Quotations */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '14px', border: '1px solid var(--border)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <FileText size={24} style={{ color: '#3b82f6' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? '3. حاسبة وعروض الأسعار الهندسية (Quotations - /quotations)' : '3. Engineering Quotations & Packaging Estimator (Route: /quotations)'}
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                <strong>{isRTL ? 'وظيفة الشاشة:' : 'Screen Purpose:'}</strong>{' '}
                {isRTL 
                  ? 'حاسبة هندسية متطورة لتسعير كراتين التعبئة بناءً على الأبعاد الثلاثية (الطول × العرض × الارتفاع)، ونوع الفلوت (B/C/E/Double)، وحساب التكلفة والربحية بنقرة واحدة وتصدير عرض السعر كـ PDF فاخر.'
                  : 'Advanced packaging calculator pricing cartons based on 3D dimensions (L x W x H mm), fluting grade, and printing specs, featuring one-click PDF quotation exports and sales conversions.'}
              </p>

              {/* LIVE SCREEN PREVIEW FRAME */}
              <SystemScreenMockup
                route="/quotations"
                imageSrc="/tutorials/screens/quotations.png"
                title={isRTL ? 'عروض الأسعار الهندسية وحاسبة الكرتون' : 'Packaging Engineering Quotations'}
                isRTL={isRTL}
                actions={[
                  { label: isRTL ? 'طباعة عرض سعر PDF' : 'Print PDF', primary: false, icon: Printer },
                  { label: isRTL ? 'إنشاء عرض سعر جديد' : 'New Quote', primary: true, icon: Plus }
                ]}
                metrics={[
                  { label: isRTL ? 'إجمالي العروض الصادرة' : 'Issued Quotes', val: '46 Quotes', color: '#2563eb' },
                  { label: isRTL ? 'عروض معتمدة' : 'Accepted Proposals', val: '38 Approved', color: '#10b981' },
                  { label: isRTL ? 'معدل التحويل لأوامر بيع' : 'Conversion Rate', val: '82.6%', color: '#8b5cf6' }
                ]}
                tableHeaders={[
                  isRTL ? 'رقم العرض' : 'Quote #',
                  isRTL ? 'العميل' : 'Client',
                  isRTL ? 'المواصفات والأبعاد (مم)' : 'Specs & Dimensions (mm)',
                  isRTL ? 'الكمية' : 'Qty',
                  isRTL ? 'السعر / الكرتونة' : 'Unit Price',
                  isRTL ? 'الإجراء' : 'Action'
                ]}
                tableRows={[
                  ['#QT-2026-084', 'Delta Food Industries', '400 × 300 × 250 (B Flute)', '5,000', '8.50 EGP', <span key="1" className="badge-pill badge-pill-primary">Convert to Sales</span>],
                  ['#QT-2026-085', 'Alex Fresh Fruits', '500 × 400 × 180 (C Flute 3-Ply)', '10,000', '11.20 EGP', <span key="2" className="badge-pill badge-pill-success">APPROVED</span>],
                  ['#QT-2026-086', 'Modern Pharma Pack', '250 × 180 × 120 (E Flute Micro)', '20,000', '4.75 EGP', <span key="3" className="badge-pill badge-pill-warning">PENDING</span>]
                ]}
              />

              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.84rem', lineHeight: 1.7, marginTop: '1rem' }}>
                <strong>{isRTL ? 'خطوات التحويل الذكي:' : 'Smart Conversion Trigger:'}</strong>
                <ul style={{ margin: '0.4rem 0 0 0', paddingInlineStart: '1.2rem' }}>
                  <li>{isRTL ? 'بمجرد موافقة العميل، انقر على زر "تحويل إلى أمر بيع (Convert to Sales)" ليتم ترحيل كافة البيانات والمواصفات إلى عقد البيع فورياً.' : 'Click "Convert to Sales" upon approval to dispatch specifications into a contract without re-entry.'}</li>
                </ul>
              </div>
            </div>

            {/* Screen 4: Sales Orders */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '14px', border: '1px solid var(--border)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <ShoppingCart size={24} style={{ color: '#8b5cf6' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? '4. أوامر البيع والفواتير الضريبية (Sales - /sales)' : '4. Sales Contracts & Tax Invoices (Route: /sales)'}
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                <strong>{isRTL ? 'وظيفة الشاشة:' : 'Screen Purpose:'}</strong>{' '}
                {isRTL 
                  ? 'توثيق عقود البيع، تسجيل الدفعات المقدمة، احتساب الأرصدة المتبقية، تحويل الطلب إلى أمر تشغيل مصنعي، وإصدار الفاتورة الضريبية المعتمدة بالباركود.'
                  : 'Logs sales agreements, tracks deposit payments and accounts receivable, triggers factory work orders, and issues compliant tax invoices.'}
              </p>

              {/* LIVE SCREEN PREVIEW FRAME */}
              <SystemScreenMockup
                route="/sales"
                imageSrc="/tutorials/screens/sales.png"
                title={isRTL ? 'أوامر البيع وعقود التوريد' : 'Sales Orders & Invoicing'}
                isRTL={isRTL}
                actions={[
                  { label: isRTL ? 'طباعة فاتورة ضريبية' : 'Print Tax Invoice', primary: false, icon: Printer },
                  { label: isRTL ? 'أمر بيع جديد' : 'New Sales Order', primary: true, icon: Plus }
                ]}
                metrics={[
                  { label: isRTL ? 'إجمالي المبيعات' : 'Total Revenue', val: '320,000 EGP', color: '#2563eb' },
                  { label: isRTL ? 'المحصل نقداً' : 'Cash Collected', val: '240,000 EGP', color: '#10b981' },
                  { label: isRTL ? 'أرصدة آجلة (مدينون)' : 'A/R Receivables', val: '80,000 EGP', color: '#ef4444' }
                ]}
                tableHeaders={[
                  isRTL ? 'رقم الفاتورة' : 'Invoice #',
                  isRTL ? 'العميل' : 'Client',
                  isRTL ? 'الإجمالي' : 'Total',
                  isRTL ? 'المدفوع' : 'Paid',
                  isRTL ? 'المتبقي' : 'Balance',
                  isRTL ? 'حالة السداد' : 'Payment Status'
                ]}
                tableRows={[
                  ['#INV-2026-101', 'Delta Food Industries', '42,500 EGP', '42,500 EGP', '0.00 EGP', <span key="1" className="badge-pill badge-pill-success">PAID FULL</span>],
                  ['#INV-2026-102', 'Nile Beverage Co.', '96,000 EGP', '50,000 EGP', '46,000 EGP', <span key="2" className="badge-pill badge-pill-warning">PARTIAL</span>],
                  ['#INV-2026-103', 'Cairo Pack Trading', '35,000 EGP', '0.00 EGP', '35,000 EGP', <span key="3" className="badge-pill badge-pill-danger">UNPAID</span>]
                ]}
              />

              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.84rem', lineHeight: 1.7, marginTop: '1rem' }}>
                <strong>{isRTL ? 'الربط بالإنتاج:' : 'Production Dispatch Trigger:'}</strong>
                <ul style={{ margin: '0.4rem 0 0 0', paddingInlineStart: '1.2rem' }}>
                  <li>{isRTL ? 'انقر على "تحويل إلى أمر شغل (Convert to Work Order)" لإرسال مواصفات الكرتونة والكميات إلى صالة وماكينات الإنتاج.' : 'Click "Convert to Work Order" to dispatch the packaging specifications directly to factory machinery.'}</li>
                </ul>
              </div>
            </div>

            {/* Screen 5: Work Orders & Production */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '14px', border: '1px solid var(--border)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <Cog size={24} style={{ color: '#ec4899' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? '5. أوامر الشغل والإنتاج والـ BOM (Work Orders - /work-orders)' : '5. Factory Work Orders & Automated BOM (Route: /work-orders)'}
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                <strong>{isRTL ? 'وظيفة الشاشة:' : 'Screen Purpose:'}</strong>{' '}
                {isRTL 
                  ? 'إدارة خطوط إنتاج الكرتون (التضليع، الطباعة الفليكسو، ماكينات التكسير والدست، ولصق الغراء). تتضمن محرك الخصم التلقائي للخامات (BOM) عند إنهاء الأمر.'
                  : 'Controls machine floor execution across corrugation, die-cutting, slotting, and gluing. Triggers automated Bill of Materials (BOM) stock deduction upon completion.'}
              </p>

              {/* LIVE SCREEN PREVIEW FRAME */}
              <SystemScreenMockup
                route="/work-orders"
                imageSrc="/tutorials/screens/work_orders.png"
                title={isRTL ? 'أوامر الشغل وخطوط الإنتاج' : 'Factory Production Work Orders'}
                isRTL={isRTL}
                actions={[
                  { label: isRTL ? 'إذن صرف خامات' : 'Material Issue', primary: false, icon: FileSpreadsheet },
                  { label: isRTL ? 'أمر شغل جديد' : 'New Work Order', primary: true, icon: Plus }
                ]}
                metrics={[
                  { label: isRTL ? 'أوامر جارية بالصالة' : 'In Production', val: '4 Orders', color: '#2563eb' },
                  { label: isRTL ? 'أوامر مكتملة هذا الشهر' : 'Completed (BOM)', val: '26 Completed', color: '#10b981' },
                  { label: isRTL ? 'جاهز للتسليم' : 'Ready for Shipping', val: '3 Orders', color: '#8b5cf6' }
                ]}
                tableHeaders={[
                  isRTL ? 'رقم أمر الشغل' : 'Work Order #',
                  isRTL ? 'المنتج' : 'Product',
                  isRTL ? 'الماكينة / الخط' : 'Machine Station',
                  isRTL ? 'الكمية' : 'Quantity',
                  isRTL ? 'الخصم الآلي (BOM)' : 'BOM Status',
                  isRTL ? 'حالة الأمر' : 'Status'
                ]}
                tableRows={[
                  ['#WO-1092', 'Food Box 400x300', 'Die-Cutter Line #2', '5,000 Pcs', <span key="1" className="badge-pill badge-pill-success">✔ BOM Deducted</span>, <span key="1b" className="badge-pill badge-pill-success">COMPLETED</span>],
                  ['#WO-1093', 'Beverage Carton 5-Ply', 'Corrugator #1', '12,000 Pcs', <span key="2" className="badge-pill badge-pill-warning">Reserved</span>, <span key="2b" className="badge-pill badge-pill-warning">IN PROGRESS (75%)</span>],
                  ['#WO-1094', 'Pharma Box Printed', 'Flexo Printer #3', '20,000 Pcs', <span key="3" className="badge-pill badge-pill-primary">Queued</span>, <span key="3b" className="badge-pill badge-pill-primary">PENDING</span>]
                ]}
              />

              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.84rem', lineHeight: 1.7, marginTop: '1rem' }}>
                <strong>{isRTL ? 'المحرك الآلي للـ BOM:' : 'Automated BOM Deduction Logic:'}</strong>
                <ul style={{ margin: '0.4rem 0 0 0', paddingInlineStart: '1.2rem' }}>
                  <li>{isRTL ? 'بمجرد تغيير حالة أمر الشغل إلى "مكتمل (COMPLETED)"، يقوم النظام آلياً بخصم كميات رولات الكرافت والدوبلكس والغراء من المخزن بدون أي تدخل يدوي.' : 'When marked COMPLETED, Kraft paper, fluting, and adhesives are deducted immediately from raw inventory.'}</li>
                </ul>
              </div>
            </div>

            {/* Screen 6: HR & Payroll */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '14px', border: '1px solid var(--border)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <Users size={24} style={{ color: '#10b981' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? '6. شؤون الموظفين ومسيرات الرواتب وسلف العاملين (Payroll - /employees)' : '6. Employee Records, Automated Payroll & Loans (Route: /employees)'}
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                <strong>{isRTL ? 'وظيفة الشاشة:' : 'Screen Purpose:'}</strong>{' '}
                {isRTL 
                  ? 'احتساب رواتب موظفي المصنع والعمالة بالقطعة تلقائياً مع الخصم الآلي لأيام الغياب وسلف الموظفين، وإمكانية التعديل اليدوي عند الحاجة.'
                  : 'Automated multi-tier payroll engine calculating staff salaries and piece-rate operator bonuses, with automatic deduction of unexcused absences and loan installments.'}
              </p>

              {/* LIVE SCREEN PREVIEW FRAME */}
              <SystemScreenMockup
                route="/employees"
                imageSrc="/tutorials/screens/employees.png"
                title={isRTL ? 'شؤون الموظفين والرواتب وأجور المصنع' : 'Factory HR, Payroll & Operator Hub'}
                isRTL={isRTL}
                actions={[
                  { label: isRTL ? 'طباعة كشف الرواتب' : 'Print Payslips', primary: false, icon: Printer },
                  { label: isRTL ? 'إنشاء مسير راتب' : 'Generate Payroll', primary: true, icon: Plus }
                ]}
                metrics={[
                  { label: isRTL ? 'إجمالي الرواتب الشهرية' : 'Gross Payroll', val: '84,500 EGP', color: '#2563eb' },
                  { label: isRTL ? 'خصومات غياب وسلف' : 'Absence & Loans', val: '- 6,200 EGP', color: '#ef4444' },
                  { label: isRTL ? 'صافي الرواتب المستحقة' : 'Net Disbursed', val: '78,300 EGP', color: '#10b981' }
                ]}
                tableHeaders={[
                  isRTL ? 'الموظف' : 'Employee',
                  isRTL ? 'القسم' : 'Department',
                  isRTL ? 'الأساسي + حافز الإنتاج' : 'Base + Piece Bonus',
                  isRTL ? 'خصم الغياب' : 'Absence Deduction',
                  isRTL ? 'قسط السلفة' : 'Loan Deduction',
                  isRTL ? 'صافي الراتب' : 'Net Pay'
                ]}
                tableRows={[
                  ['Ahmed Mahmoud (Operator)', 'Die-Cutting', '6,000 + 1,200 EGP', '0.00 EGP', '- 500 EGP', <strong key="1" style={{ color: '#10b981' }}>6,700 EGP</strong>],
                  ['Mahmoud Hassan (Supervisor)', 'Plant Operations', '9,500 + 0 EGP', '- 633 EGP (2 Days)', '- 1,000 EGP', <strong key="2" style={{ color: '#10b981' }}>7,867 EGP</strong>],
                  ['Sara Adel (Accountant)', 'Finance & Auditing', '7,000 + 0 EGP', '0.00 EGP', '0.00 EGP', <strong key="3" style={{ color: '#10b981' }}>7,000 EGP</strong>]
                ]}
              />

              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.84rem', lineHeight: 1.7, marginTop: '1rem' }}>
                <strong>{isRTL ? 'المعادلة الرياضية المنفذة:' : 'Statutory Payroll Formula:'}</strong>
                <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', padding: '0.5rem', background: 'var(--surface-hover)', borderRadius: '6px', margin: '0.4rem 0' }}>
                  Net Pay = (Base Salary + Production Bonus) - (Absence Days × Daily Rate) - Monthly Loan Installments
                </div>
              </div>
            </div>

            {/* Screen 7: Settings & Online Cloud Server */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '14px', border: '1px solid var(--border)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <Settings size={24} style={{ color: '#64748b' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? '7. إعدادات المنظومة وهوية المصنع والسيرفر السحابي (Settings - /settings)' : '7. Enterprise Settings, Letterhead & Cloud MySQL Server (Route: /settings)'}
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                <strong>{isRTL ? 'وظيفة الشاشة:' : 'Screen Purpose:'}</strong>{' '}
                {isRTL 
                  ? 'إدارة هوية المصنع وشعار الفواتير والتقارير، ربط خادم MySQL السحابي، تصدير واستيراد قواعد البيانات بنقرة واحدة، ومحاكاة البيانات التجريبية.'
                  : 'Configures plant branding and official invoice stationery, manages remote MySQL cloud database credentials, and handles JSON backups.'}
              </p>

              {/* LIVE SCREEN PREVIEW FRAME */}
              <SystemScreenMockup
                route="/settings"
                imageSrc="/tutorials/screens/settings.png"
                title={isRTL ? 'إعدادات المنظومة وهوية المصنع' : 'Enterprise Administration & Branding'}
                isRTL={isRTL}
                actions={[
                  { label: isRTL ? 'فحص الاتصال بالسيرفر' : 'Test MySQL', primary: false, icon: PlugZap },
                  { label: isRTL ? 'حفظ وتطبيق الهوية' : 'Save Identity', primary: true, icon: Check }
                ]}
                metrics={[
                  { label: isRTL ? 'حالة السيرفر السحابي' : 'Cloud DB Status', val: 'Connected', color: '#10b981' },
                  { label: isRTL ? 'النسخ الاحتياطي' : 'Database Backups', val: 'IndexedDB + MySQL', color: '#2563eb' },
                  { label: isRTL ? 'مستوى الصلاحية' : 'Security Level', val: 'ADMIN (Full Access)', color: '#8b5cf6' }
                ]}
                tableHeaders={[
                  isRTL ? 'عنصر التكوين' : 'Configuration Item',
                  isRTL ? 'القيمة الحالية' : 'Current Value',
                  isRTL ? 'الأثر بالنظام' : 'System Scope'
                ]}
                tableRows={[
                  ['Official Plant Name', 'Jin Engine للتعبئة والتغليف', 'Printed on all invoices & quotes headers'],
                  ['Tax Registration (TRN)', '100-234-567', 'Included in legal tax invoice barcodes'],
                  ['Remote MySQL Server', 'localhost:3306 (packerp)', 'Multi-workstation real-time synchronization']
                ]}
              />
            </div>

            {/* Screen 8: Reports & Financial Analytics */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '14px', border: '1px solid var(--border)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <PieChart size={24} style={{ color: '#06b6d4' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? '8. التقارير المالية والتحليلات التنفيذية (Reports - /reports)' : '8. Executive Financial & Operational Reports (Route: /reports)'}
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                <strong>{isRTL ? 'وظيفة الشاشة:' : 'Screen Purpose:'}</strong>{' '}
                {isRTL 
                  ? 'مركز التدقيق المالي الشامل: استخراج الأرباح الصافية، التدفقات النقدية، تكاليف الإنتاج، وتصدير التقارير الرسمية بضغطة زر إلى Excel أو طباعة فورية.'
                  : 'Executive financial intelligence: Net profitability, cash flow velocity, COGS breakdown, and instant Excel / printable audit reports.'}
              </p>

              {/* LIVE SCREEN PREVIEW FRAME */}
              <SystemScreenMockup
                route="/reports"
                imageSrc="/tutorials/screens/reports.png"
                title={isRTL ? 'التقارير التنفيذية والمالية الشاملة' : 'Executive Financial Analytics & Audit'}
                isRTL={isRTL}
              />
            </div>

            {/* Screen 9: Purchasing & Raw Material Vendors */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '14px', border: '1px solid var(--border)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <ShoppingBag size={24} style={{ color: '#d97706' }} />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {isRTL ? '9. مشتريات المواد الخام وحسابات الموردين (Purchases - /purchases)' : '9. Raw Material Purchasing & Vendor Accounts (Route: /purchases)'}
                </h3>
              </div>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 1rem 0' }}>
                <strong>{isRTL ? 'وظيفة الشاشة:' : 'Screen Purpose:'}</strong>{' '}
                {isRTL 
                  ? 'تسجيل أوامر الشراء، تحديث رصيد المخزن تلقائياً، ومتابعة مدفوعات الموردين والأرصدة المستحقة (دائنون).'
                  : 'Manage raw material supply contracts, automatic stock increments, payment schedules, and accounts payable (A/P).'}
              </p>

              {/* LIVE SCREEN PREVIEW FRAME */}
              <SystemScreenMockup
                route="/purchases"
                imageSrc="/tutorials/screens/purchases.png"
                title={isRTL ? 'أوامر شراء الخامات وحسابات الموردين' : 'Purchasing Orders & Supplier Accounts'}
                isRTL={isRTL}
              />
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* SECTION 1: SYSTEM OVERVIEW & STEP-BY-STEP WORKFLOW */}
      {/* ========================================================================================= */}
      {(isSectionVisible('full_guide') || typeof window === 'undefined') && (
        <div className="glass-card print-area tutorial-section" style={{ border: '1px solid var(--border)', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BookOpen size={24} style={{ color: 'var(--primary)' }} />
            <span>{isRTL ? 'مراحل دورة حياة أمر الشغل والتصنيع (خطوة بخطوة)' : 'Factory Production Lifecycle & Order Journey (Step-by-Step)'}</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            {isRTL 
              ? 'المسار التسلسلي لكافة العمليات من تسجيل الموردين حتى تسليم الكرتون للعميل وتحصيل الأرباح.' 
              : 'Sequential operational pipeline from procurement to manufacturing, dispatch, and financial reconciliation.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Step 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(280px, 1fr)', gap: '1.5rem', background: 'var(--surface-hover)', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>1</span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {isRTL ? 'المخزون وأوامر شراء الخامات (Inventory & POs)' : '1. Raw Materials Procurement & Warehouse Stock'}
                  </h3>
                </div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 0.75rem 0' }}>
                  {isRTL 
                    ? 'شاشة المخزن والمشتريات: يتم تسجيل أصناف الخامات (رولات ورق كرافت، كرتون دوبلكس، غراء، أحبار فليكسو). وعند طلب خامات من المورد، يتم إنشاء أمر شراء (Purchase Order) يحدد الكمية وسعر الطن/الكيلو والدفعة المسددة للمورد.'
                    : 'Inventory & Purchases: Register raw material commodities (Kraft rolls, Duplex sheets, starch glue, flexo inks). Create Purchase Orders specifying tonnage, unit price, and vendor payments.'}
                </p>
                <ul style={{ margin: 0, paddingInlineStart: '1.2rem', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <li>{isRTL ? 'تحديث أرصدة الخامات آلياً عند الشراء.' : 'Automatic warehouse inventory increment upon receipt.'}</li>
                  <li>{isRTL ? 'تسجيل مستحقات الموردين ومتابعة الديون المتبقية.' : 'Tracks accounts payable and outstanding balances to vendors.'}</li>
                </ul>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                  <span>{isRTL ? 'شاشة المخزن: رولات ورق كرافت 140جم' : 'Inventory: Kraft Roll 140 GSM'}</span>
                  <span style={{ color: '#10b981' }}>{isRTL ? 'رصيد: 14.5 طن' : 'Stock: 14.5 Tons'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>{isRTL ? 'المورد: شركة الأهرام للورق' : 'Supplier: Al-Ahram Paper Mills'}</span>
                  <span>{isRTL ? 'سعر الطن: 22,000 ج.م' : 'Ton Price: 22,000 EGP'}</span>
                </div>
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '0.5rem', borderRadius: '6px', color: '#2563eb', fontWeight: 600 }}>
                  ✔ {isRTL ? 'عند الحفظ: ينشأ قيد مشتريات ويزيد رصيد المخزن تلقائياً.' : 'On Save: Journal entry created and stock replenished.'}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(280px, 1fr)', gap: '1.5rem', background: 'var(--surface-hover)', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>2</span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {isRTL ? 'العملاء وعروض الأسعار (Quotations & CRM)' : '2. Client Engineering Proposals & Quotations'}
                  </h3>
                </div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 0.75rem 0' }}>
                  {isRTL 
                    ? 'شاشة عروض الأسعار: يتم إنشاء عرض سعر تفصيلي للعميل متضمناً أبعاد الكرتونة (الطول × العرض × الارتفاع)، نوع الورق، ونوع الطباعة (سادة / ألوان). يمكن تصدير عرض السعر فورياً كـ PDF رسمي يحمل شعار المصنع.'
                    : 'Quotations: Draft comprehensive proposals with box 3D dimensions (L x W x H), paper flute grammage, and print choices. Export proposal PDFs directly with plant header.'}
                </p>
                <ul style={{ margin: 0, paddingInlineStart: '1.2rem', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <li>{isRTL ? 'زر بنقرة واحدة: "تحويل إلى أمر بيع" فور موافقة العميل.' : 'One-click "Convert to Sales Order" once client accepts.'}</li>
                </ul>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                  <span>{isRTL ? 'عرض سعر رقم: QT-2026-084' : 'Quote ID: QT-2026-084'}</span>
                  <span style={{ color: '#2563eb' }}>{isRTL ? 'الحالة: معتمد' : 'Status: APPROVED'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{isRTL ? 'العميل: شركة الدلتا للصناعات الغذائية' : 'Client: Delta Foods Industry'}</span>
                  <span>{isRTL ? 'الكمية: 5,000 كرتونة' : 'Quantity: 5,000 Boxes'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#10b981' }}>
                  <span>{isRTL ? 'إجمالي العرض:' : 'Total Proposal:'}</span>
                  <span>42,500 {isRTL ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(280px, 1fr)', gap: '1.5rem', background: 'var(--surface-hover)', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>3</span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {isRTL ? 'أمر البيع وأمر الشغل وتطبيق الـ BOM' : '3. Sales Contract, Work Order & BOM Deduction'}
                  </h3>
                </div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 0.75rem 0' }}>
                  {isRTL 
                    ? 'شاشة أوامر البيع وأوامر الشغل: يتم تحويل الطلب إلى أمر تشغيل في المصنع (Work Order). بمجرد انتهاء مراحل التصنيع وتغيير حالة الأمر إلى COMPLETED، يقوم محرك الـ (BOM) بخصم الخامات المستهلكة (الورق والغراء) آلياً من المخزن دون أي تدخل يدوي.'
                    : 'Sales & Work Orders: Generate factory manufacturing tickets linked to sales. When status switches to COMPLETED, the Bill of Materials (BOM) engine deducts paper and glue from warehouse inventory automatically.'}
                </p>
                <ul style={{ margin: 0, paddingInlineStart: '1.2rem', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <li>{isRTL ? 'ربط مباشر بين خط الإنتاج وتكلفة الخامات المستهلكة (COGS).' : 'Direct linkage between machine output and Cost of Goods Sold (COGS).'}</li>
                </ul>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                  <span>{isRTL ? 'أمر الشغل: WO-1092 (صالة الإنتاج)' : 'Work Order: WO-1092 (Machine Line)'}</span>
                  <span style={{ color: '#10b981', fontWeight: 800 }}>{isRTL ? 'مكتمل (COMPLETED)' : 'COMPLETED'}</span>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.5rem', borderRadius: '6px', color: '#059669', fontSize: '0.78rem' }}>
                  ⚡ {isRTL ? 'تم خصم تلقائي من المخزن: 850 كجم ورق كرافت + 45 كجم غراء نشا.' : 'Automated BOM deduction: 850 KG Kraft + 45 KG Starch Glue.'}
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(280px, 1fr)', gap: '1.5rem', background: 'var(--surface-hover)', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>4</span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {isRTL ? 'تسجيل الإنتاجية اليومية بالقطعة (Piece-Work)' : '4. Daily Piece-Work Operator Logging'}
                  </h3>
                </div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 0.75rem 0' }}>
                  {isRTL 
                    ? 'شاشة الإنتاج (Production Log): يقوم مشرف الصالة بتسجيل كميات القطعيات والكراتين التي أنجزها كل عامل في كل وردية بمعدل القطعة (Rate per Piece). يتم ترحيل هذه المبالغ فوراً إلى كشوف الرواتب الشهرية كـ حافز إنتاج (Production Bonus).'
                    : 'Production Log: Shift supervisors enter daily quantities produced per machine operator at the set piece-rate. These outputs pool directly into the employee payroll as production bonuses.'}
                </p>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                  <span>{isRTL ? 'العامل: أحمد محمود إبراهيم' : 'Operator: Ahmed Mahmoud'}</span>
                  <span>{isRTL ? 'ماكينة تكسير رقم 2' : 'Die-Cutter Line #2'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{isRTL ? 'الكمية المنجزة: 1,500 كرتونة' : 'Output: 1,500 Boxes'}</span>
                  <span>{isRTL ? 'سعر القطعة: 0.40 ج.م' : 'Piece Rate: 0.40 EGP'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#8b5cf6' }}>
                  <span>{isRTL ? 'حافز الوردية المكتسب:' : 'Shift Bonus Earned:'}</span>
                  <span>600 {isRTL ? 'ج.م يضاف للراتب' : 'EGP Added to Payroll'}</span>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(280px, 1fr)', gap: '1.5rem', background: 'var(--surface-hover)', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#06b6d4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>5</span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {isRTL ? 'الشحن والتوصيل وتحصيل المبيعات' : '5. Shipping Dispatch & Revenue Settlement'}
                  </h3>
                </div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-main)', margin: '0 0 0.75rem 0' }}>
                  {isRTL 
                    ? 'شاشة الشحن والتوصيل (Shipping): إنشاء إذن خروج شحنة وتحديد رقم السيارة واسم السائق وتكلفة النقل. وعند وصول السائق لمقر العميل، يتم تحصيل الدفعة الختامية وتحديث رصيد العميل إلى (مسدد بالكامل).'
                    : 'Shipping: Create dispatch note, assign driver and vehicle plate. Upon arrival at client warehouse, final payment is collected and client ledger is marked settled.'}
                </p>
              </div>
              <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>
                  <span>{isRTL ? 'إذن شحن رقم: SHP-2026-118' : 'Dispatch ID: SHP-2026-118'}</span>
                  <span style={{ color: '#10b981' }}>{isRTL ? 'تم التسليم (DELIVERED)' : 'DELIVERED'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{isRTL ? 'السائق: محمد صابر (سيارة نقل 432 أ ب ج)' : 'Driver: Mohamed Saber (Truck 432)'}</span>
                  <span>{isRTL ? 'الموقع: العاشر من رمضان' : 'Destination: 10th of Ramadan'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* SECTION 2: ACCOUNTING STRUCTURE & FINANCIAL LIFECYCLE */}
      {/* ========================================================================================= */}
      {(isSectionVisible('accounting') || typeof window === 'undefined') && (
        <div className="glass-card print-area tutorial-section" style={{ border: '1px solid var(--border)', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Landmark size={24} style={{ color: 'var(--primary)' }} />
            <span>{isRTL ? 'الهيكل المحاسبي ودورة القيود المالية للمصنع' : 'Chart of Accounts & Automated Journal Entry Cycle'}</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {isRTL 
              ? 'شرح متكامل لربط العمليات التشغيلية بالنظام المحاسبي، شجرة الحسابات، وقائمة الدخل والأرباح.' 
              : 'Complete financial mapping connecting manufacturing operations with double-entry ledgers and profit statements.'}
          </p>

          {/* Chart of Accounts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h4 style={{ margin: '0 0 0.4rem 0', color: '#2563eb', fontWeight: 800 }}>{isRTL ? '1. الأصول (Assets)' : '1. Assets (100)'}</h4>
              <ul style={{ margin: 0, paddingInlineStart: '1.1rem', fontSize: '0.825rem', lineHeight: 1.7 }}>
                <li>{isRTL ? '101 الصندوق والخزينة النقدية' : '101 Cash on Hand & Vault'}</li>
                <li>{isRTL ? '102 البنك والحسابات الجارية' : '102 Bank Accounts'}</li>
                <li>{isRTL ? '103 العملاء والمدينون (A/R)' : '103 Accounts Receivable (Clients)'}</li>
                <li>{isRTL ? '104 مخزون المواد الخام والورق' : '104 Raw Material Inventory (Kraft)'}</li>
                <li>{isRTL ? '105 مخزون الإنتاج التام' : '105 Finished Goods Inventory'}</li>
              </ul>
            </div>

            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h4 style={{ margin: '0 0 0.4rem 0', color: '#dc2626', fontWeight: 800 }}>{isRTL ? '2. الخصوم (Liabilities)' : '2. Liabilities (200)'}</h4>
              <ul style={{ margin: 0, paddingInlineStart: '1.1rem', fontSize: '0.825rem', lineHeight: 1.7 }}>
                <li>{isRTL ? '201 الموردون والدائنون (A/P)' : '201 Accounts Payable (Suppliers)'}</li>
                <li>{isRTL ? '202 أوراق الدفع والشيكات' : '202 Notes Payable'}</li>
                <li>{isRTL ? '203 مستحقات رواتب وأجور العمال' : '203 Accrued Payroll & Operator Dues'}</li>
                <li>{isRTL ? '204 التزامات ضريبية وتأمينات' : '204 Taxes & Social Insurance Dues'}</li>
              </ul>
            </div>

            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <h4 style={{ margin: '0 0 0.4rem 0', color: '#059669', fontWeight: 800 }}>{isRTL ? '3. الإيرادات (Revenue)' : '3. Revenue (300)'}</h4>
              <ul style={{ margin: 0, paddingInlineStart: '1.1rem', fontSize: '0.825rem', lineHeight: 1.7 }}>
                <li>{isRTL ? '301 إيرادات مبيعات الكرتون' : '301 Carton Box Sales Revenue'}</li>
                <li>{isRTL ? '302 إيرادات أطباق وأكواب التعبئة' : '302 Cup & Packaging Sales'}</li>
                <li>{isRTL ? '303 إيرادات خدمات الطباعة الخاصة' : '303 Custom Flexo Printing Services'}</li>
              </ul>
            </div>

            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <h4 style={{ margin: '0 0 0.4rem 0', color: '#d97706', fontWeight: 800 }}>{isRTL ? '4. التكاليف والمصروفات' : '4. Costs & Expenses (400)'}</h4>
              <ul style={{ margin: 0, paddingInlineStart: '1.1rem', fontSize: '0.825rem', lineHeight: 1.7 }}>
                <li>{isRTL ? '401 تكلفة البضاعة المباعة (COGS)' : '401 Cost of Goods Sold (BOM Kraft & Glue)'}</li>
                <li>{isRTL ? '402 أجور ورواتب عمال الإنتاج' : '402 Production Operator Wages'}</li>
                <li>{isRTL ? '403 كهرباء ومياه وصيانة الماكينات' : '403 Utilities & Machinery Maintenance'}</li>
                <li>{isRTL ? '404 مصاريف الشحن واللوجستيات' : '404 Logistics & Shipping Freight'}</li>
              </ul>
            </div>
          </div>

          {/* Standard ERP Accounting Journal Entries Table */}
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            {isRTL ? 'جدول القيود المحاسبية التلقائية لدورة الإنتاج (Accounting Journal Cycle)' : 'Automated Production & Sales Journal Entries Cycle'}
          </h3>
          
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRTL ? 'right' : 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>{isRTL ? 'العملية التشغيلية' : 'Operation'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isRTL ? 'الطرف المدين (Debit)' : 'Debit Account'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isRTL ? 'الطرف الدائن (Credit)' : 'Credit Account'}</th>
                  <th style={{ padding: '0.75rem 1rem' }}>{isRTL ? 'الأثر المالي' : 'Financial Impact'}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{isRTL ? '1. شراء ورق وخامات بالأجل' : '1. Credit Purchase of Raw Paper'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#2563eb' }}>{isRTL ? 'من حـ/ مخزون المواد الخام (104)' : 'Dr. Raw Material Inventory (104)'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#dc2626' }}>{isRTL ? 'إلى حـ/ الموردين (201)' : 'Cr. Accounts Payable (201)'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{isRTL ? 'زيادة رصيد المخزن وزيادة التزامات المورد' : 'Stock increases; Supplier liability recognized'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{isRTL ? '2. سداد دفعة للمورد نقدياً' : '2. Cash Payment to Supplier'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#2563eb' }}>{isRTL ? 'من حـ/ الموردين (201)' : 'Dr. Accounts Payable (201)'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#dc2626' }}>{isRTL ? 'إلى حـ/ الصندوق / البنك (101/102)' : 'Cr. Cash / Bank (101/102)'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{isRTL ? 'انخفاض مستحقات المورد وخروج نقدية' : 'Supplier liability drops; Cash outflow'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{isRTL ? '3. إتمام أمر الشغل واستهلاك الخامات (BOM)' : '3. Work Order Completed (BOM)'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#2563eb' }}>{isRTL ? 'من حـ/ تكلفة البضاعة المباعة COGS (401)' : 'Dr. Cost of Goods Sold COGS (401)'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#dc2626' }}>{isRTL ? 'إلى حـ/ مخزون المواد الخام (104)' : 'Cr. Raw Material Inventory (104)'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{isRTL ? 'خصم الخامات المحروقة وإثبات التكلفة المباشرة' : 'Inventory deducted; Direct cost recorded'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{isRTL ? '4. إصدار فاتورة بيع وتحصيل دفعة مقدمة' : '4. Sales Invoice & Deposit'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#2563eb' }}>{isRTL ? 'من مذكورين: حـ/ الصندوق + حـ/ العملاء' : 'Dr. Cash (101) + Accounts Receivable (103)'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#dc2626' }}>{isRTL ? 'إلى حـ/ إيرادات المبيعات (301)' : 'Cr. Sales Revenue (301)'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{isRTL ? 'إثبات دخل المبيعات ومطالبة العميل بالباقي' : 'Revenue recognized; Client balance established'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{isRTL ? '5. اعتماد مسير الرواتب الشهري' : '5. Monthly Payroll Accrual'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#2563eb' }}>{isRTL ? 'من حـ/ مصروف الرواتب والأجور (402)' : 'Dr. Payroll & Wages Expense (402)'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#dc2626' }}>{isRTL ? 'إلى حـ/ أجور مستحقة للعاملين (203)' : 'Cr. Accrued Payroll Payable (203)'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{isRTL ? 'إثبات الاستحقاق الشهري لكافة موظفي المصنع' : 'Accrues total monthly factory labor dues'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Profit Calculation Formula */}
          <div style={{ background: 'var(--surface-hover)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, color: 'var(--primary)' }}>
              {isRTL ? 'معادلة حساب صافي الأرباح في تقارير النظام (Net Profit Equation)' : 'Executive Net Profit Equation'}
            </h4>
            <div style={{ fontFamily: 'monospace', fontSize: '0.92rem', fontWeight: 700, padding: '0.75rem', background: 'var(--background)', borderRadius: '6px', border: '1px solid var(--border)', textAlign: 'center' }}>
              {isRTL 
                ? 'صافي الربح = إجمالي المبيعات المحصلة - (تكلفة الخامات المستهلكة COGS + إجمالي الرواتب والأجور + المصروفات التشغيلية + مصاريف الشحن)'
                : 'Net Profit = Collected Revenue - (COGS Raw Materials + Total Payroll & Wages + Operating Overheads + Freight)'}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* SECTION 3: PAYROLL CALCULATION, ATTENDANCE DEDUCTIONS & LABOR LAWS */}
      {/* ========================================================================================= */}
      {(isSectionVisible('payroll_law') || typeof window === 'undefined') && (
        <div className="glass-card print-area tutorial-section" style={{ border: '1px solid var(--border)', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Scale size={24} style={{ color: 'var(--primary)' }} />
            <span>{isRTL ? 'نظام الرواتب، خصم الحضور والغياب، وتطبيق قوانين العمل المنظمة' : 'Payroll Engine, Attendance Deductions & Labor Law Compliance'}</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            {isRTL 
              ? 'المعادلات الرياضية والبرمجية المطبقة في النظام لاحتساب رواتب الموظفين والعمالة بالقطعة بدقة قانونية تامة.' 
              : 'Mathematical formulas and statutory payroll computations for salaried staff and piece-rate operators.'}
          </p>

          {/* Main Formula Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            
            <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#3b82f6', marginBottom: '0.5rem' }}>
                <Calculator size={20} />
                <span>{isRTL ? '1. الراتب الشهري الثابت (Monthly Salary)' : '1. Fixed Monthly Salary Staff'}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 0.75rem 0' }}>
                {isRTL ? 'يطبق على الإداريين والمحاسبين والمشرفين:' : 'Applies to administrative, accounting, and plant supervisory personnel:'}
              </p>
              <div style={{ background: 'var(--background)', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700 }}>
                {isRTL ? (
                  <>
                    أجر اليوم = الراتب الأساسي ÷ 30 يوماً
                    <br />
                    الخصومات = عدد أيام الغياب × أجر اليوم
                    <br />
                    صافي الراتب = الراتب الأساسي + الحوافز - الخصومات
                  </>
                ) : (
                  <>
                    Daily Rate = Base Salary ÷ 30 Days
                    <br />
                    Absence Deductions = Absent Days × Daily Rate
                    <br />
                    Net Pay = Base Salary + Bonuses - Deductions
                  </>
                )}
              </div>
            </div>

            <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#10b981', marginBottom: '0.5rem' }}>
                <Cog size={20} />
                <span>{isRTL ? '2. أجور العمالة بالقطعة (Piece-Work Operators)' : '2. Piece-Work Machine Operators'}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 0.75rem 0' }}>
                {isRTL ? 'يطبق على مشغلي ماكينات التكسير والدست والطباعة:' : 'Applies to die-cutting, gluing, and flexo printer operators:'}
              </p>
              <div style={{ background: 'var(--background)', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700 }}>
                {isRTL ? (
                  <>
                    الراتب الأساسي = 0 (أو راتب رمزي كحد أدنى)
                    <br />
                    حافز الإنتاج = مجموع (الكمية المنجزة × سعر القطعة)
                    <br />
                    صافي الراتب = إجمالي قيمة الإنتاجية المنجزة
                  </>
                ) : (
                  <>
                    Base Salary = 0 (or statutory base)
                    <br />
                    Production Bonus = Sum(Completed Qty × Rate Per Piece)
                    <br />
                    Net Pay = Total Piece Output Value
                  </>
                )}
              </div>
            </div>

            <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.5rem' }}>
                <Clock size={20} />
                <span>{isRTL ? '3. اليومية والعمالة الأسبوعية (Daily / Weekly)' : '3. Daily & Weekly Labor'}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 0.75rem 0' }}>
                {isRTL ? 'يطبق على العمالة المساعدة وعمال التحميل والعتالة:' : 'Applies to helper crews, material loaders, and warehouse handlers:'}
              </p>
              <div style={{ background: 'var(--background)', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700 }}>
                {isRTL ? (
                  <>
                    صافي الراتب = عدد الأيام الفعلية المسجلة (حاضر) × سعر اليومية
                    <br />
                    (لا يحتسب أي أجر عن أيام الغياب تلقائياً)
                  </>
                ) : (
                  <>
                    Net Pay = Verified Present Days × Daily Rate
                    <br />
                    (Zero pay is accrued for unexcused absent days)
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* SECTION 4: ONLINE CLOUD SERVER SETUP & REAL-TIME MULTI-DEVICE SYNC */}
      {/* ========================================================================================= */}
      {(isSectionVisible('online_server') || typeof window === 'undefined') && (
        <div className="glass-card print-area tutorial-section" style={{ border: '1px solid var(--border)', padding: '2rem' }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Server size={24} style={{ color: 'var(--primary)' }} />
              <span>{isRTL ? 'دليل إدخال وربط النظام بسيرفر أونلاين / سحابي خارجي (Online Server Setup)' : 'Remote & Cloud MySQL Online Server Connection Guide'}</span>
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isRTL 
                ? 'خطوات ربط أجهزة المصنع (أجهزة الإدارة، خط الإنتاج، والمخزن) بقاعدة بيانات MySQL مركزية سحابية عبر الإنترنت.' 
                : 'Connect factory devices (Admin, Production, Warehouse) to a centralized cloud MySQL database.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Architecture Overview */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#3b82f6' }}>
                {isRTL ? '1. كيف تعمل المزامنة المعمارية (Offline-First + Cloud Sync)' : '1. Hybrid Offline-First Architecture & Cloud Sync'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-main)' }}>
                {isRTL 
                  ? 'يعتمد النظام على معمارية Local-First Hybrid: يعمل كل جهاز في المصنع بسرعة فائقة على قاعدة بياناته المحلية (IndexedDB / Dexie) حتى في حال انقطاع الإنترنت تماماً. وعند توفر الاتصال، يقوم زر (مزامنة الآن / Sync Now) أو المزامنة التلقائية برفع وتنزيل البيانات من وإلى خادم MySQL المركزي السحابي.'
                  : 'Jin Engine employs a Local-First Hybrid design: every device works at lightning speed using its local database (IndexedDB via Dexie) even during internet blackouts. When connection is established, the "Sync Now" button or auto-sync handles bi-directional data exchange with the remote MySQL master.'}
              </p>
            </div>

            {/* Input steps for online server */}
            <div style={{ background: 'var(--surface-hover)', borderRadius: '12px', border: '1px solid var(--border)', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.6rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
                {isRTL ? '2. خطوات إدخال بيانات السيرفر الأونلاين من شاشة الإعدادات' : '2. Steps to Configure Online Server in Settings (/settings)'}
              </h3>
              <ol style={{ margin: 0, paddingInlineStart: '1.3rem', fontSize: '0.875rem', lineHeight: 1.8 }}>
                <li>{isRTL ? 'انتقل إلى شاشة الإعدادات (Settings - /settings) من القائمة الجانبية.' : 'Navigate to Settings (/settings) from the sidebar menu.'}</li>
                <li>{isRTL ? 'انقر على تبويب "السيرفر وقاعدة البيانات الأونلاين (Cloud Server & MySQL)".' : 'Click the "Cloud Server & MySQL Sync" tab.'}</li>
                <li>{isRTL ? 'أدخل بيانات خادم MySQL الخاص بك:' : 'Enter your remote MySQL credentials:'}
                  <ul style={{ margin: '0.3rem 0', paddingInlineStart: '1.2rem' }}>
                    <li><strong>{isRTL ? 'عنوان السيرفر (Host):' : 'Host / Server IP:'}</strong> {isRTL ? 'مثل عنوان IP السيرفر (192.168.1.100) أو دومين قاعدة البيانات (db.mycompany.com).' : 'e.g. Server IP (192.168.1.100) or DB domain (db.mycompany.com).'}</li>
                    <li><strong>{isRTL ? 'المنفذ (Port):' : 'Port:'}</strong> {isRTL ? 'المنفذ الافتراضي لـ MySQL هو 3306.' : 'Default MySQL port is 3306.'}</li>
                    <li><strong>{isRTL ? 'اسم قاعدة البيانات (Database):' : 'Database Name:'}</strong> {isRTL ? 'اسم قاعدة بيانات المصنع (مثل packerp).' : 'Plant database name (e.g. packerp).'}</li>
                    <li><strong>{isRTL ? 'اسم المستخدم (DB User):' : 'DB User:'}</strong> {isRTL ? 'مستخدم قاعدة البيانات المصرح له.' : 'Authorized MySQL user.'}</li>
                    <li><strong>{isRTL ? 'كلمة المرور (Password):' : 'Password:'}</strong> {isRTL ? 'كلمة سر قاعدة البيانات.' : 'MySQL database password.'}</li>
                  </ul>
                </li>
                <li>{isRTL ? 'انقر على زر "فحص الاتصال بالسيرفر (Test Connection)" للتأكد من استجابة السيرفر.' : 'Click "Test Connection" to verify server reachability and MySQL version.'}</li>
                <li>{isRTL ? 'انقر على زر "حفظ إعدادات السيرفر الأونلاين (Save & Connect Server)" لحفظ التكوين والربط التلقائي.' : 'Click "Save & Connect Server" to securely store credentials into api/.env.'}</li>
              </ol>
            </div>

          </div>
        </div>
      )}

      {/* Production Readiness & Hardening Checklist */}
      <div className="glass-card print-area tutorial-section" style={{ border: '1px solid var(--border)', padding: '1.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0' }}>
          <CheckCircle2 size={22} color="#10B981" />
          <span>{isRTL ? 'ملخص جاهزية النظام للتشغيل الفعلي 100% (Checklist)' : 'System 100% Production Readiness Checklist'}</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontWeight: 800, color: '#10b981', marginBottom: '0.25rem' }}>✔ {isRTL ? 'أمان الدخول والمصفوفة' : 'RBAC & Mandatory Authentication'}</div>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {isRTL ? 'مصفوفة الصلاحيات (RBAC) تتحكم في الشاشات وحجب الصفحات غير المصرح بها وإلزام تسجيل الدخول.' : 'Role-based access matrix blocks unauthorized screens with mandatory login guards.'}
            </p>
          </div>

          <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontWeight: 800, color: '#10b981', marginBottom: '0.25rem' }}>✔ {isRTL ? 'محرك استهلاك الخامات (BOM)' : 'Automated BOM Inventory Deduction'}</div>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {isRTL ? 'خصم آلي للورق والغراء عند إنهاء أوامر الشغل لحساب تكلفة التصنيع وتحديث رصيد المخزن فورياً.' : 'Automatic deduction of Kraft paper and adhesives upon work order completion.'}
            </p>
          </div>

          <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontWeight: 800, color: '#10b981', marginBottom: '0.25rem' }}>✔ {isRTL ? 'السيرفر الأونلاين والمزامنة' : 'Cloud MySQL Server & Real-time Sync'}</div>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {isRTL ? 'واجهة إدخال وحفظ بيانات MySQL السحابية مع فحص الاتصال التلقائي والمزامنة المباشرة.' : 'Remote database configuration UI with connection testing and auto-sync.'}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
