"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '../utils/format';

export default function PageMetricCards({ cards = [], printable = false }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  if (!cards || cards.length === 0) return null;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={printable ? 'metric-cards-grid' : 'metric-cards-grid hide-on-print'}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
        width: '100%',
        direction: isRTL ? 'rtl' : 'ltr',
        textAlign: isRTL ? 'right' : 'left'
      }}
    >
      {cards.map((card, idx) => {
        if (!card) return null;
        const Icon = card.icon;
        const isCur = card.isCurrency;
        const displayVal = isCur 
          ? `${formatAmount(card.value)} ${t('egp') || (isRTL ? 'ج.م' : 'EGP')}`
          : (card.value !== undefined && card.value !== null ? card.value : '—');

        return (
          <div
            key={idx}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="shadcn-stat-card modern-card-hover"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              direction: isRTL ? 'rtl' : 'ltr',
              textAlign: isRTL ? 'right' : 'left'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  letterSpacing: isRTL ? 'normal' : '0.01em'
                }}
              >
                {card.title}
              </span>
              {Icon && (
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: card.badgeBg || 'var(--surface-hover)',
                    color: card.badgeColor || 'var(--primary)',
                    border: '1px solid var(--border)',
                    flexShrink: 0
                  }}
                >
                  {React.isValidElement(Icon) ? Icon : Icon ? <Icon size={18} /> : null}
                </div>
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  letterSpacing: isRTL ? 'normal' : '-0.025em',
                  color: card.valueColor || 'var(--text-main)',
                  lineHeight: 1.2
                }}
              >
                {displayVal}
              </div>

              {card.subtitle && (
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    margin: '0.4rem 0 0',
                    lineHeight: 1.4
                  }}
                >
                  {card.subtitle}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
