"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const isRTL = i18n?.language === 'ar';

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  // Reflected icon & action label:
  // When in Dark mode: show Sun (click to turn on Light)
  // When in Light mode: show Moon (click to turn on Dark)
  const targetLabel = isDark 
    ? (isRTL ? 'الوضع النهاري' : 'Light Mode') 
    : (isRTL ? 'الوضع الليلي' : 'Dark Mode');

  const tooltip = isDark 
    ? (isRTL ? 'التبديل إلى الوضع النهاري' : 'Switch to Light Mode') 
    : (isRTL ? 'التبديل إلى الوضع الليلي' : 'Switch to Dark Mode');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={tooltip}
      aria-label={tooltip}
      className="btn"
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
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: isDark ? '#f59e0b' : '#818cf8',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </div>
      <span>{targetLabel}</span>
    </button>
  );
}
