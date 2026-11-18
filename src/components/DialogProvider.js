"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Trash2, CheckCircle2, XCircle, Info, HelpCircle, LogOut, X } from 'lucide-react';
import '../i18n';

/**
 * App-wide replacement for window.confirm / window.alert.
 *
 * Usage:
 *   const { confirm, alert } = useDialog();
 *   if (await confirm({ message: '...', variant: 'danger' })) { ... }
 *   await alert({ message: '...', variant: 'success' });
 *
 * Variants: 'question' | 'danger' | 'logout' | 'warning' | 'success' | 'error' | 'info'
 */

const DialogContext = createContext(null);

const ICONS = {
  question: HelpCircle,
  danger: Trash2,
  logout: LogOut,
  warning: AlertTriangle,
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const EXIT_MS = 160;

const normalize = (opts) => (typeof opts === 'string' ? { message: opts } : opts || {});

export function DialogProvider({ children }) {
  const { t } = useTranslation();
  const [queue, setQueue] = useState([]);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const current = queue[0];

  const open = useCallback(
    (options) =>
      new Promise((resolve) => {
        setQueue((q) => [...q, { ...options, resolve, key: `${Date.now()}-${Math.random()}` }]);
      }),
    []
  );

  const confirm = useCallback(
    (opts) => open({ variant: 'question', ...normalize(opts), kind: 'confirm' }),
    [open]
  );

  const alert = useCallback(
    (opts) => open({ variant: 'info', ...normalize(opts), kind: 'alert' }),
    [open]
  );

  const close = useCallback(
    (result) => {
      if (!current || closing) return;
      setClosing(true);
      setTimeout(() => {
        current.resolve(result);
        setQueue((q) => q.slice(1));
        setClosing(false);
      }, EXIT_MS);
    },
    [current, closing]
  );

  const dismissValue = current?.kind === 'confirm' ? false : undefined;

  // Focus management: remember the trigger, focus the safest button, restore on close.
  useEffect(() => {
    if (!current) {
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
        lastFocusedRef.current.focus();
        lastFocusedRef.current = null;
      }
      return;
    }
    if (!lastFocusedRef.current) lastFocusedRef.current = document.activeElement;
    const target =
      current.variant === 'danger' && cancelBtnRef.current ? cancelBtnRef.current : confirmBtnRef.current;
    target?.focus();
  }, [current]);

  // Keyboard: Escape dismisses, Tab is trapped inside the dialog.
  useEffect(() => {
    if (!current) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(dismissValue);
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll('button:not([disabled])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current, close, dismissValue]);

  const renderDialog = () => {
    if (!current) return null;

    const variant = ICONS[current.variant] ? current.variant : 'info';
    const Icon = ICONS[current.icon] || ICONS[variant];
    const isConfirm = current.kind === 'confirm';

    const defaultTitles = {
      question: t('dialog_confirm_title'),
      danger: t('dialog_danger_title'),
      logout: t('logout') || 'Sign Out',
      warning: t('dialog_warning_title'),
      success: t('success'),
      error: t('error'),
      info: t('dialog_info_title'),
    };

    const title = current.title ?? defaultTitles[variant];
    const confirmText =
      current.confirmText ??
      (isConfirm
        ? variant === 'logout'
          ? t('logout') || 'Sign Out'
          : variant === 'danger'
          ? t('delete')
          : t('confirm')
        : t('ok'));
    const cancelText = current.cancelText ?? t('cancel');
    const styleVariant = variant === 'logout' ? 'danger' : variant;

    return (
      <div
        className={`dialog-overlay${closing ? ' is-closing' : ''}`}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close(dismissValue);
        }}
      >
        <div
          key={current.key}
          ref={dialogRef}
          className={`dialog dialog--${styleVariant}`}
          role={isConfirm || variant === 'error' || variant === 'danger' || variant === 'logout' ? 'alertdialog' : 'dialog'}
          aria-modal="true"
          aria-labelledby="app-dialog-title"
          aria-describedby="app-dialog-message"
        >
          <button
            type="button"
            id="app-dialog-close-btn"
            className="dialog-close"
            aria-label={t('close')}
            onClick={() => close(dismissValue)}
          >
            <X size={18} />
          </button>

          <div className="dialog-icon" aria-hidden="true">
            <Icon size={26} strokeWidth={2.2} />
          </div>

          <h2 id="app-dialog-title" className="dialog-title">{title}</h2>
          {current.message && (
            <p id="app-dialog-message" className="dialog-message">{current.message}</p>
          )}

          <div className="dialog-actions">
            {isConfirm && (
              <button
                ref={cancelBtnRef}
                type="button"
                id="app-dialog-cancel-btn"
                className="dialog-btn dialog-btn--ghost"
                onClick={() => close(false)}
              >
                {cancelText}
              </button>
            )}
            <button
              ref={confirmBtnRef}
              type="button"
              id="app-dialog-confirm-btn"
              className="dialog-btn dialog-btn--solid"
              onClick={() => close(isConfirm ? true : undefined)}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {renderDialog()}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>');
  return ctx;
}
