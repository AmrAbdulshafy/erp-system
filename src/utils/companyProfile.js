/**
 * Jin Engine ERP - Company & Organization Profile Management
 * 
 * Provides centralized storage and real-time subscription for company metadata:
 * - Company Name (Arabic & English)
 * - Slogan / Activity (e.g., Packaging Solutions System)
 * - Logo (Base64 image or vector symbol)
 * - Contact Information: Phone, Mobile, Email, Website
 * - Physical Address / Factory Location
 * - Tax Registration & Commercial Registry (CR) numbers
 * - Currency Symbol & Preferred Currency
 * - Bank Details for invoices
 */

export const DEFAULT_COMPANY_PROFILE = {
  company_name_ar: 'Jin Engine',
  company_name_en: 'Jin Engine',
  tagline_ar: 'نظام متكامل لإدارة وتخطيط مصانع الكرتون والتعبئة والتغليف',
  tagline_en: 'Packaging Solutions & Factory Management ERP',
  logo: '',
  logo_symbol: 'U',
  phone: '',
  mobile: '',
  email: '',
  website: '',
  address_ar: 'المنطقة الصناعية - العاشر من رمضان - جمهورية مصر العربية',
  address_en: 'Industrial Zone, 10th of Ramadan City, Egypt',
  tax_number: '',
  commercial_reg: '',
  currency_ar: 'ج.م',
  currency_en: 'EGP',
  bank_name: '',
  bank_account: '',
  consumption_per_unit: '',
  late_deduction_days: 0.5,
  notes_terms_ar: 'البضاعة المباعة لا ترد بعد مرور 14 يوماً من تاريخ الفاتورة. تسليم مصانعنا.',
  notes_terms_en: 'Goods cannot be returned after 14 days from invoice date. Ex-Factory delivery.',
  updated_at: new Date().toISOString()
};

const STORAGE_KEY = 'jin_engine_company_profile';
const EVENT_NAME = 'jin-engine-company-profile-updated';

const LEGACY_PLACEHOLDERS = {
  phone: '01000000000',
  mobile: '01100000000',
  email: 'info@jinengine.com',
  website: 'www.jinengine.com',
  tax_number: '100-234-567',
  commercial_reg: '89421',
  bank_name: 'البنك الأهلي المصري (NBE)',
  bank_account: 'EG5000020001000000123456789'
};

/**
 * Retrieves the stored company profile or returns defaults.
 */
export function getCompanyProfile() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_COMPANY_PROFILE };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('jinnworx_company_profile');
    if (!raw) return { ...DEFAULT_COMPANY_PROFILE };
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_COMPANY_PROFILE, ...parsed };
    if (!merged.company_name_en || merged.company_name_en.includes('Jinn Worx')) {
      merged.company_name_en = 'Jin Engine';
      merged.company_name_ar = 'Jin Engine';
      merged.logo = '';
      merged.logo_symbol = 'U';
    }
    if (merged.logo && String(merged.logo).includes('jinnworx-logo')) {
      merged.logo = '';
    }
    for (const [k, dummyVal] of Object.entries(LEGACY_PLACEHOLDERS)) {
      if (merged[k] === dummyVal) {
        merged[k] = '';
      }
    }
    return merged;
  } catch (err) {
    console.error('Failed to parse company profile:', err);
    return { ...DEFAULT_COMPANY_PROFILE };
  }
}

/**
 * Saves company profile to localStorage and notifies all listening components.
 */
export function saveCompanyProfile(profile) {
  if (typeof window === 'undefined') return profile;
  try {
    const merged = {
      ...DEFAULT_COMPANY_PROFILE,
      ...profile,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    
    // Dispatch asynchronous notification to avoid React render cycle conflicts
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: merged }));
    }, 0);

    return merged;
  } catch (err) {
    console.error('Failed to save company profile:', err);
    return profile;
  }
}

/**
 * React Hook for real-time reactivity to company profile updates across all pages.
 */
import { useState, useEffect } from 'react';

export function useCompanyProfile() {
  const [profile, setProfile] = useState(() => getCompanyProfile());

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e?.detail) {
        setProfile(e.detail);
      } else {
        setProfile(getCompanyProfile());
      }
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    profile,
    updateProfile: saveCompanyProfile,
    getDisplayName: (isRTL = false) => {
      if (isRTL) {
        return profile.company_name_ar || profile.company_name_en || 'Jin Engine';
      }
      return profile.company_name_en || profile.company_name_ar || 'Jin Engine';
    },
    getTagline: (isRTL = false) => {
      if (isRTL) {
        return profile.tagline_ar || profile.tagline_en || 'حلول التعبئة والتغليف';
      }
      return profile.tagline_en || profile.tagline_ar || 'Packaging Solutions System';
    },
    getAddress: (isRTL = false) => {
      if (isRTL) {
        return profile.address_ar || profile.address_en || '';
      }
      return profile.address_en || profile.address_ar || '';
    }
  };
}
