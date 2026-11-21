"use client";

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '../utils/format';
import ImageModal from './ImageModal';
import { useCompanyProfile } from '../utils/companyProfile';

// Parses image_data which is either a JSON array of base64 strings or a single base64 string
function parseImages(imageData) {
  if (!imageData) return [];
  try {
    const parsed = JSON.parse(imageData);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    return [imageData];
  }
}

export default function DocumentPrint({
  docRef,
  docType = 'QUOTATION', // 'QUOTATION' | 'INVOICE'
  docNumber,
  docDate,
  status,
  billTo,
  preparedBy,
  items = [],
  notes,
  discountAmount = 0,
  discountPercent = 0,
  amountPaid,
  remainingAmount,
  onBack,
  onPrint,
  onPDF,
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [previewImage, setPreviewImage] = useState(null);
  const [imageScale, setImageScale] = useState('big'); // 'big' (380px) | 'xlarge' (540px) | 'standard' (240px)
  const [showBigImages, setShowBigImages] = useState(true);

  const subtotal = items.reduce((s, i) => s + (Number(i.total_price) || 0), 0);
  const discountVal = Number(discountAmount) || 0;
  const finalGrandTotal = Math.max(0, subtotal - discountVal);
  const { profile, getDisplayName, getTagline } = useCompanyProfile();
  const companyName = getDisplayName(isRTL);
  const companyTagline = getTagline(isRTL);

  // Extract all items that carry quotation/product images
  const itemsWithImages = items
    .map((item, idx) => ({
      itemNumber: idx + 1,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      images: parseImages(item.image_data).filter(Boolean)
    }))
    .filter(it => it.images.length > 0);
  const hasAnyItemImages = itemsWithImages.length > 0;

  return (
    <div className="document-print-page" style={{ minHeight: '100vh', background: 'var(--background, #f4f4f5)', padding: '1.5rem', direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Action Bar */}
      <div className="hide-on-print" style={{
        maxWidth: '860px', margin: '0 auto 1.5rem',
        display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'
      }}>
        {/* Left Side: Back + Image Scale Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button onClick={onBack} style={{
            padding: '0.6rem 1.2rem', borderRadius: '8px',
            border: '1px solid #d4d4d8', background: '#ffffff',
            color: '#18181b', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', gap: '0.35rem'
          }}>
            {isRTL ? '→ ' + (t('back') || 'رجوع') : '← ' + (t('back') || 'Back')}
          </button>

          {itemsWithImages.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: '#ffffff', padding: '0.3rem 0.55rem', borderRadius: '8px',
              border: '1px solid #e4e4e7', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <span style={{ fontWeight: 700, color: '#3f3f46', fontSize: '0.8rem', marginRight: isRTL ? 0 : '0.2rem', marginLeft: isRTL ? '0.2rem' : 0 }}>
                🖼️ {isRTL ? 'حجم الصور أسفل الفاتورة:' : 'Image Scale:'}
              </span>
              <button
                type="button"
                onClick={() => setImageScale('standard')}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                  border: imageScale === 'standard' ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                  background: imageScale === 'standard' ? '#09090b' : '#f4f4f5',
                  color: imageScale === 'standard' ? '#ffffff' : '#52525b',
                  cursor: 'pointer'
                }}
              >
                {isRTL ? 'متوسط (240px)' : 'Medium (240px)'}
              </button>
              <button
                type="button"
                onClick={() => setImageScale('big')}
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700,
                  border: imageScale === 'big' ? '1.5px solid #2563eb' : '1px solid #e4e4e7',
                  background: imageScale === 'big' ? '#2563eb' : '#f4f4f5',
                  color: imageScale === 'big' ? '#ffffff' : '#1d4ed8',
                  cursor: 'pointer',
                  boxShadow: imageScale === 'big' ? '0 1px 4px rgba(37,99,235,0.25)' : 'none'
                }}
              >
                ★ {isRTL ? 'كبير جداً (390px)' : 'Big Scale (390px)'}
              </button>
              <button
                type="button"
                onClick={() => setImageScale('xlarge')}
                style={{
                  padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                  border: imageScale === 'xlarge' ? '1.5px solid #09090b' : '1px solid #e4e4e7',
                  background: imageScale === 'xlarge' ? '#09090b' : '#f4f4f5',
                  color: imageScale === 'xlarge' ? '#ffffff' : '#52525b',
                  cursor: 'pointer'
                }}
              >
                {isRTL ? 'أقصى عرض (540px)' : 'Full / X-Large (540px)'}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Print & PDF */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={onPrint} style={{
            padding: '0.6rem 1.4rem', borderRadius: '8px', border: '1px solid #1d4ed8',
            background: '#2563eb', color: '#ffffff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
            transition: 'all 0.15s ease'
          }}>
            🖨️ {t('print') || 'Print'}
          </button>
          <button onClick={onPDF} style={{
            padding: '0.6rem 1.4rem', borderRadius: '8px', border: '1px solid #1d4ed8',
            background: '#2563eb', color: '#ffffff', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
            transition: 'all 0.15s ease'
          }}>
            📄 {t('export_pdf') || 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Document */}
      <div ref={docRef} className="print-doc print-area" dir={isRTL ? 'rtl' : 'ltr'} style={{
        maxWidth: '860px', margin: '0 auto', background: '#ffffff',
        borderRadius: '12px', overflow: 'hidden',
        border: '1px solid #d4d4d8',
        boxShadow: '0 6px 28px rgba(0,0,0,0.08)',
        color: '#09090b',
        direction: isRTL ? 'rtl' : 'ltr',
        textAlign: isRTL ? 'right' : 'left',
        fontFamily: isRTL ? "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"
      }}>
        {/* ── Header Band (All Orders 2-Column Side-by-Side Layout) ── */}
        <div className="doc-header-band" style={{
          background: '#ffffff',
          borderBottom: '2px solid #e4e4e7',
          padding: '1rem 1.5rem 0.85rem',
          color: '#09090b',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 265px',
          alignItems: 'start',
          gap: '1rem'
        }}>
          {/* Start Side: Brand Logo + Document Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {profile.logo && profile.logo.startsWith('data:') ? (
                <img
                  src={profile.logo}
                  alt={companyName}
                  style={{ height: 48, width: 'auto', maxWidth: 170, objectFit: 'contain' }}
                />
              ) : (
                <img
                  src="/all-orders-logo-light.png"
                  alt="All Orders for Packaging"
                  style={{ height: 54, width: 'auto', maxWidth: 200, objectFit: 'contain' }}
                />
              )}
            </div>
            <div style={{ display: 'inline-block', alignSelf: 'flex-start', borderBottom: '2.5px solid #18181b', paddingBottom: '0.2rem', marginTop: '0.1rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: '#09090b', lineHeight: 1.2 }}>
                {docType === 'QUOTATION'
                  ? (isRTL ? 'عرض سعر' : 'QUOTATION')
                  : (isRTL ? 'فاتورة' : 'INVOICE')}
              </h1>
            </div>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', fontWeight: 700, color: '#3f3f46' }}>
              {isRTL ? 'حلول تغليف وطباعة احترافية' : (companyTagline || 'Professional Packaging & Printing Solutions')}
            </p>
          </div>

          {/* End Side: Tagline + Red Metadata Table */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.45rem', width: '100%' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#18181b', textAlign: 'center', lineHeight: 1.35 }}>
              {isRTL ? 'حلول تغليف وطباعة احترافية للمطاعم والكافيهات' : 'Packaging & Printing for Restaurants & Cafes'}
            </div>
            <div style={{ border: '1px solid #d4d4d8', borderRadius: '8px', overflow: 'hidden', width: '100%' }}>
              <table className="doc-meta-table" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.76rem', margin: 0 }}>
                <tbody>
                  <tr>
                    <td style={{ background: '#dc2626', color: '#ffffff', fontWeight: 800, padding: '0.32rem 0.65rem', borderBottom: '1px solid rgba(255,255,255,0.25)', width: '42%', textAlign: 'center' }}>
                      {docType === 'QUOTATION' ? (isRTL ? 'رقم العرض' : 'Quote #') : (isRTL ? 'رقم الفاتورة' : 'Invoice #')}
                    </td>
                    <td style={{ background: '#f4f4f5', color: '#09090b', fontWeight: 800, padding: '0.32rem 0.65rem', borderBottom: '1px solid #e4e4e7', textAlign: 'center', fontFamily: 'monospace' }}>
                      {docNumber}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ background: '#dc2626', color: '#ffffff', fontWeight: 800, padding: '0.32rem 0.65rem', borderBottom: '1px solid rgba(255,255,255,0.25)', textAlign: 'center' }}>
                      {t('date') || (isRTL ? 'التاريخ' : 'Date')}
                    </td>
                    <td style={{ background: '#f4f4f5', color: '#09090b', fontWeight: 700, padding: '0.32rem 0.65rem', borderBottom: '1px solid #e4e4e7', textAlign: 'center' }}>
                      {docDate}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ background: '#dc2626', color: '#ffffff', fontWeight: 800, padding: '0.32rem 0.65rem', textAlign: 'center' }}>
                      {t('status') || (isRTL ? 'الحالة' : 'Status')}
                    </td>
                    <td style={{ background: '#f4f4f5', color: '#09090b', fontWeight: 800, padding: '0.32rem 0.65rem', textAlign: 'center' }}>
                      {t(status?.toLowerCase()) || status}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {(profile.tax_number || profile.commercial_reg) && (
              <div style={{ fontSize: '0.68rem', color: '#52525b', textAlign: 'center' }}>
                {[
                  profile.tax_number ? `${isRTL ? 'الرقم الضريبي' : 'Tax'}: ${profile.tax_number}` : '',
                  profile.commercial_reg ? `${isRTL ? 'س.ت' : 'C.R.'}: ${profile.commercial_reg}` : ''
                ].filter(Boolean).join(' • ')}
              </div>
            )}
          </div>
        </div>

        {/* ── Two Info Cards: بيانات البراند & تفاصيل الطلب والتسليم ── */}
        <div className="doc-meta-grid" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          padding: '0.6rem 1.5rem 0.75rem', gap: '1rem',
          background: '#ffffff'
        }}>
          {/* Card 1: بيانات البراند */}
          <div style={{ border: '1px solid #d4d4d8', borderRadius: '8px', overflow: 'hidden', background: '#fafafa' }}>
            <div style={{ background: '#18181b', color: '#ffffff', padding: '0.32rem 0.75rem', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>👤</span>
              <span>{isRTL ? 'بيانات البراند' : (t('bill_to') || 'Brand / Client Info')}</span>
            </div>
            <div style={{ padding: '0.42rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.18rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.16rem' }}>
                <span style={{ color: '#27272a', fontWeight: 700 }}>{isRTL ? 'اسم البراند :' : 'Brand Name :'}</span>
                <span style={{ color: '#09090b', fontWeight: 900 }}>{billTo?.name || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.16rem' }}>
                <span style={{ color: '#27272a', fontWeight: 700 }}>{isRTL ? 'رقم الهاتف :' : 'Phone :'}</span>
                <span style={{ color: '#09090b', fontWeight: 600 }} dir="ltr">{billTo?.phone || ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.16rem' }}>
                <span style={{ color: '#27272a', fontWeight: 700 }}>{isRTL ? 'العنوان :' : 'Address :'}</span>
                <span style={{ color: '#09090b', fontWeight: 600 }}>{billTo?.address || ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#27272a', fontWeight: 700 }}>{isRTL ? 'الشخص المسئول :' : 'Contact Person :'}</span>
                <span style={{ color: '#09090b', fontWeight: 600 }}>{billTo?.contactPerson || ''}</span>
              </div>
            </div>
          </div>

          {/* Card 2: تفاصيل الطلب والتسليم */}
          <div style={{ border: '1px solid #d4d4d8', borderRadius: '8px', overflow: 'hidden', background: '#fafafa' }}>
            <div style={{ background: '#18181b', color: '#ffffff', padding: '0.32rem 0.75rem', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🚚</span>
              <span>{isRTL ? 'تفاصيل الطلب والتسليم' : 'Order & Delivery Details'}</span>
            </div>
            <div style={{ padding: '0.42rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.18rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.16rem' }}>
                <span style={{ color: '#27272a', fontWeight: 700 }}>{isRTL ? 'تاريخ التسليم :' : 'Delivery Date :'}</span>
                <span style={{ color: '#09090b', fontWeight: 700 }}>{docDate || ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.16rem' }}>
                <span style={{ color: '#27272a', fontWeight: 700 }}>{isRTL ? 'طريقة الدفع :' : 'Payment Method :'}</span>
                <span style={{ color: '#09090b', fontWeight: 600 }}>{preparedBy?.name || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e4e4e7', paddingBottom: '0.16rem' }}>
                <span style={{ color: '#27272a', fontWeight: 700 }}>{isRTL ? 'عنوان التسليم :' : 'Delivery Address :'}</span>
                <span style={{ color: '#09090b', fontWeight: 600 }}>{billTo?.address || ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#27272a', fontWeight: 700 }}>{isRTL ? 'ملاحظات :' : 'Notes :'}</span>
                <span style={{ color: '#09090b', fontWeight: 600 }}>{notes ? String(notes).slice(0, 35) : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Line Items Table (Red # Header + Black Column Headers) ── */}
        <div className="doc-items-section" style={{ padding: '0 1.5rem' }}>
          <div className="doc-table-scroll">
          <table className="doc-items-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: isRTL ? 'right' : 'left', border: '1px solid #d4d4d8' }}>
            <thead>
              <tr style={{ background: '#18181b', color: '#ffffff' }}>
                <th style={{ padding: '0.42rem 0.5rem', fontWeight: 800, fontSize: '0.74rem', width: '36px', textAlign: 'center', background: '#dc2626', color: '#ffffff', borderInlineEnd: '1px solid rgba(255,255,255,0.2)' }}>{isRTL ? 'م' : '#'}</th>
                <th style={{ padding: '0.42rem 0.7rem', fontWeight: 800, fontSize: '0.74rem', textAlign: isRTL ? 'center' : 'left', color: '#ffffff' }}>{isRTL ? 'الصنف / الوصف التفصيلي' : (t('product_name') || 'Item / Description')}</th>
                {hasAnyItemImages && (
                  <th style={{ padding: '0.42rem 0.5rem', textAlign: 'center', fontWeight: 800, fontSize: '0.74rem', color: '#ffffff' }}>{t('image') || (isRTL ? 'الصورة' : 'Image')}</th>
                )}
                <th style={{ padding: '0.42rem 0.5rem', fontWeight: 800, fontSize: '0.74rem', textAlign: 'center', color: '#ffffff', width: '74px' }}>{t('quantity') || (isRTL ? 'الكمية' : 'Qty')}</th>
                <th style={{ padding: '0.42rem 0.5rem', fontWeight: 800, fontSize: '0.74rem', textAlign: 'center', color: '#ffffff', lineHeight: 1.15, width: '84px' }}>
                  {isRTL ? <>سعر الوحدة<br /><span style={{ fontSize: '0.64rem', fontWeight: 500 }}>(جنية)</span></> : (t('unit_price') || 'Unit Price')}
                </th>
                <th style={{ padding: '0.42rem 0.6rem', fontWeight: 800, fontSize: '0.74rem', textAlign: 'center', color: '#ffffff', lineHeight: 1.15, width: '92px' }}>
                  {isRTL ? <>الإجمالي<br /><span style={{ fontSize: '0.64rem', fontWeight: 500 }}>(جنية)</span></> : (t('total_price') || 'Total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const images = parseImages(item.image_data);
                const qtyNum = Number(item.quantity) || 0;
                const unitNum = Number(item.unit_price) || 0;
                const totalNum = Number(item.total_price) || 0;
                return (
                  <tr key={item.id || idx} style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f4f4f5',
                    borderBottom: '1px solid #d4d4d8'
                  }}>
                    <td style={{ padding: '0.26rem 0.45rem', color: '#09090b', fontWeight: 800, textAlign: 'center', borderInlineEnd: '1px solid #e4e4e7' }}>{idx + 1}</td>
                    <td style={{ padding: '0.26rem 0.65rem', fontWeight: 700, color: '#09090b', borderInlineEnd: '1px solid #e4e4e7', lineHeight: 1.3 }}>{item.product_name}</td>
                    {hasAnyItemImages && (
                      <td style={{ padding: '0.25rem 0.45rem', textAlign: 'center', borderInlineEnd: '1px solid #e4e4e7' }}>
                        {images.length > 0 ? (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                            gap: '4px',
                            width: images.length === 1 ? '50px' : '90px',
                            margin: '0 auto'
                          }}>
                            {images.map((src, i) => (
                              <img
                                key={i}
                                src={src}
                                alt={`${item.product_name} ${i + 1}`}
                                onClick={() => {
                                  const target = document.getElementById(`doc-item-image-${idx + 1}`);
                                  if (target) {
                                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  } else {
                                    setPreviewImage(src);
                                  }
                                }}
                                title={isRTL ? 'انقر للانتقال للمعاينة الكبيرة أدناه' : 'Click to jump to big scale preview below'}
                                style={{
                                  width: '100%',
                                  height: images.length === 1 ? '50px' : '40px',
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                  border: '1px solid #d4d4d8',
                                  cursor: 'pointer'
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>—</span>
                        )}
                      </td>
                    )}
                    <td style={{ padding: '0.26rem 0.45rem', color: '#18181b', fontWeight: 700, textAlign: 'center', borderInlineEnd: '1px solid #e4e4e7' }}>
                      {qtyNum > 0 ? qtyNum.toLocaleString('en-US') : '—'}
                    </td>
                    <td style={{ padding: '0.26rem 0.45rem', color: '#18181b', fontWeight: 700, textAlign: 'center', borderInlineEnd: '1px solid #e4e4e7' }}>
                      {unitNum > 0 ? formatAmount(unitNum) : '—'}
                    </td>
                    <td style={{ padding: '0.26rem 0.55rem', fontWeight: 800, color: '#09090b', textAlign: 'center' }}>
                      {totalNum > 0 ? formatAmount(totalNum) : '—'}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={hasAnyItemImages ? 6 : 5} style={{ padding: '1.5rem', textAlign: 'center', color: '#71717a' }}>{t('no_items') || 'No items.'}</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* ── Notes & Financial Summary (Compact Single-Page Proportions) ── */}
        <div className="doc-meta-grid" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          padding: '0.65rem 1.5rem', gap: '1rem', alignItems: 'stretch'
        }}>
          {/* Notes Box */}
          <div style={{ border: '1px solid #d4d4d8', borderRadius: '8px', overflow: 'hidden', background: '#fafafa', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#18181b', color: '#ffffff', padding: '0.32rem 0.75rem', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📝</span>
              <span>{t('notes') || (isRTL ? 'ملاحظات إضافية' : 'Additional Notes')}</span>
            </div>
            <div style={{ padding: '0.55rem 0.75rem', fontSize: '0.76rem', color: '#18181b', flex: 1, lineHeight: 1.5 }}>
              {notes || ''}
            </div>
          </div>

          {/* Financial Summary Box */}
          <div style={{ border: '1px solid #d4d4d8', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
            <div style={{ background: '#dc2626', color: '#ffffff', padding: '0.32rem 0.75rem', fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>💰</span>
              <span>{isRTL ? 'الملخص المالي' : 'Financial Summary'}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                  <td style={{ padding: '0.24rem 0.65rem', fontWeight: 700, color: '#27272a' }}>{isRTL ? 'إجمالي الأصناف' : 'Subtotal'}</td>
                  <td style={{ padding: '0.24rem 0.55rem', fontWeight: 800, color: '#09090b', textAlign: 'center', borderInlineStart: '1px solid #e4e4e7' }}>{formatAmount(subtotal)}</td>
                  <td style={{ padding: '0.24rem 0.45rem', fontWeight: 600, color: '#52525b', textAlign: 'center', width: '44px', borderInlineStart: '1px solid #e4e4e7' }}>{isRTL ? 'جنية' : 'EGP'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                  <td style={{ padding: '0.24rem 0.65rem', fontWeight: 700, color: '#27272a' }}>{isRTL ? 'خصم (إن وجد)' : 'Discount'}</td>
                  <td style={{ padding: '0.24rem 0.55rem', fontWeight: 800, color: discountVal > 0 ? '#dc2626' : '#09090b', textAlign: 'center', borderInlineStart: '1px solid #e4e4e7' }}>{discountVal > 0 ? `-${formatAmount(discountVal)}` : '—'}</td>
                  <td style={{ padding: '0.24rem 0.45rem', fontWeight: 600, color: '#52525b', textAlign: 'center', borderInlineStart: '1px solid #e4e4e7' }}>{isRTL ? 'جنية' : 'EGP'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                  <td style={{ padding: '0.24rem 0.65rem', fontWeight: 700, color: '#27272a' }}>{isRTL ? 'مصاريف إضافية (إن وجدت)' : 'Extra Fees'}</td>
                  <td style={{ padding: '0.24rem 0.55rem', fontWeight: 700, color: '#09090b', textAlign: 'center', borderInlineStart: '1px solid #e4e4e7' }}>—</td>
                  <td style={{ padding: '0.24rem 0.45rem', fontWeight: 600, color: '#52525b', textAlign: 'center', borderInlineStart: '1px solid #e4e4e7' }}>{isRTL ? 'جنية' : 'EGP'}</td>
                </tr>
                <tr style={{ background: '#18181b', color: '#ffffff' }}>
                  <td style={{ padding: '0.32rem 0.65rem', fontWeight: 800 }}>{isRTL ? 'الإجمالي النهائي' : 'Grand Total'}</td>
                  <td style={{ padding: '0.32rem 0.55rem', fontWeight: 900, fontSize: '0.9rem', textAlign: 'center', borderInlineStart: '1px solid rgba(255,255,255,0.2)' }}>{formatAmount(finalGrandTotal)}</td>
                  <td style={{ padding: '0.32rem 0.45rem', fontWeight: 700, textAlign: 'center', borderInlineStart: '1px solid rgba(255,255,255,0.2)' }}>{isRTL ? 'جنية' : 'EGP'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
                  <td style={{ padding: '0.24rem 0.65rem', fontWeight: 700, color: '#27272a' }}>{isRTL ? 'المقدم المطلوب' : 'Paid / Advance'}</td>
                  <td style={{ padding: '0.24rem 0.55rem', fontWeight: 700, color: '#059669', textAlign: 'center', borderInlineStart: '1px solid #e4e4e7' }}>{amountPaid !== undefined ? formatAmount(amountPaid) : '—'}</td>
                  <td style={{ padding: '0.24rem 0.45rem', fontWeight: 600, color: '#52525b', textAlign: 'center', borderInlineStart: '1px solid #e4e4e7' }}>{isRTL ? 'جنية' : 'EGP'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.24rem 0.65rem', fontWeight: 700, color: '#27272a' }}>{isRTL ? 'المتبقي عند التسليم' : 'Remaining'}</td>
                  <td style={{ padding: '0.24rem 0.55rem', fontWeight: 800, color: Number(remainingAmount) > 0 ? '#dc2626' : '#09090b', textAlign: 'center', borderInlineStart: '1px solid #e4e4e7' }}>{remainingAmount !== undefined ? formatAmount(remainingAmount) : '—'}</td>
                  <td style={{ padding: '0.24rem 0.45rem', fontWeight: 600, color: '#52525b', textAlign: 'center', borderInlineStart: '1px solid #e4e4e7' }}>{isRTL ? 'جنية' : 'EGP'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Terms & Conditions (Compact 10 Terms) + Signatures ── */}
        <div style={{ padding: '0 1.5rem 0.75rem' }}>
          <div style={{ border: '1px solid #d4d4d8', borderRadius: '8px', overflow: 'hidden', background: '#fafafa' }}>
            <div style={{ background: '#18181b', color: '#ffffff', padding: '0.3rem 0.75rem', fontWeight: 800, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>🤝</span>
              <span>{isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}</span>
            </div>
            <div className="doc-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.22rem 1rem', padding: '0.45rem 0.75rem', fontSize: '0.66rem', color: '#27272a', lineHeight: 1.35 }}>
              {(isRTL ? [
                'الأسعار المذكورة مبدئية على المواصفات المتفق عليها من حيث الخامات والقياسات والتصميم.',
                'يتم اعتماد الطلب بعد استلام موافقة العميل على العرض.',
                'يتم تحديد الكميات والمواصفات بعد الاتفاق النهائي.',
                'مدة التسليم من 15 إلى 20 يوم.',
                'الأسعار لا تشمل أي ضرائب أو رسوم إضافية ما لم يتم الاتفاق على خلاف ذلك.',
                'الحد الأدنى للطلب قد يكون حسب نوع المنتج.',
                'عدم المطابقة للمواصفات بعد اعتماد العميل يلغي الالتزام.',
                'مدة التسليم تبدأ من تأكيد التصميم وسداد المقدم.',
                'أي تغييرات أو إضافات بعد اعتماد التصميم قد تترتب عليها تكلفة إضافية.',
                'يتم حساب التكلفة حسب التفاصيل المرسلة.',
              ] : [
                'Prices are preliminary based on agreed materials, dimensions, and artwork.',
                'Order is confirmed upon receiving client approval on this quotation.',
                'Final quantities and specs are confirmed upon final agreement.',
                'Delivery lead time is 15 to 20 business days.',
                'Prices exclude taxes or extra fees unless agreed otherwise.',
                'Minimum order quantities may apply depending on product type.',
                'Specs mismatch after client approval voids liability.',
                'Lead time begins upon artwork confirmation and advance payment.',
                'Any changes after design approval may incur additional charges.',
                'Final cost is calculated per submitted specifications.',
              ]).map((term, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#dc2626', color: '#ffffff', fontSize: '0.58rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    {i + 1}
                  </span>
                  <span>{term}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', padding: '0 0.75rem', fontSize: '0.75rem', fontWeight: 800, color: '#18181b', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ textAlign: 'center', minWidth: '140px', borderTop: '1px solid #a1a1aa', paddingTop: '0.25rem' }}>
              {isRTL ? 'توقيع من جانبنا (مع ختم الشركة)' : 'Authorized Signature & Stamp'}
            </div>
            <div style={{ color: '#dc2626', fontWeight: 900, fontSize: '0.84rem' }}>
              {isRTL ? '— معاً نصنع الفرق —' : '— Together We Make The Difference —'}
            </div>
            <div style={{ textAlign: 'center', minWidth: '140px', borderTop: '1px solid #a1a1aa', paddingTop: '0.25rem' }}>
              {isRTL ? 'توقيع العميل (مع ختم الشركة)' : 'Client Signature & Stamp'}
            </div>
          </div>
        </div>

        {/* ── Attached Quotation & Product Images (Big Scale Below Invoice) ── */}
        {showBigImages && itemsWithImages.length > 0 && (
          <div className="quotation-images-section" style={{
            borderTop: '2px solid #e4e4e7',
            background: '#fafafa',
            padding: '2rem 2.25rem'
          }}>
            {/* Section Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>🎨</span>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: '#09090b',
                    letterSpacing: '-0.3px'
                  }}>
                    {docType === 'QUOTATION'
                      ? (isRTL ? 'معاينة تصاميم ومواصفات عرض الأسعار (حجم كبير)' : 'Approved Quotation Designs & Specifications (Big Scale)')
                      : (isRTL ? 'معاينة تصاميم ومواصفات المنتجات وعرض الأسعار (حجم كبير)' : 'Approved Product Designs & Quotation Specifications (Big Scale)')}
                  </h3>
                </div>
                <p style={{ margin: '6px 0 0', color: '#71717a', fontSize: '0.85rem' }}>
                  {isRTL
                    ? 'نماذج وتصاميم التعبئة والتغليف، القوالب والخامات المعتمدة للطلب بالحجم الكبير عالي الدقة'
                    : 'High-resolution big-scale preview of approved packaging samples, box artworks & die-cuts'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  background: '#09090b',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>
                  {itemsWithImages.length} {isRTL ? 'منتج مع صور معتمدة' : 'Items with Designs'}
                </span>
              </div>
            </div>

            {/* List of Item Cards with Big Scale Images */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {itemsWithImages.map((item) => {
                const imgHeight = imageScale === 'xlarge' ? '540px' : imageScale === 'standard' ? '240px' : '390px';

                return (
                  <div
                    key={item.itemNumber}
                    id={`doc-item-image-${item.itemNumber}`}
                    className="big-scale-item-card"
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e4e4e7',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid'
                    }}
                  >
                    {/* Item Header Banner */}
                    <div style={{
                      padding: '1rem 1.4rem',
                      background: '#f4f4f5',
                      borderBottom: '1px solid #e4e4e7',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.6rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#09090b',
                          color: '#ffffff',
                          fontWeight: 900,
                          fontSize: '0.82rem'
                        }}>
                          #{item.itemNumber}
                        </span>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#09090b', display: 'block' }}>
                            {item.productName}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: '#52525b' }}>
                        <span>
                          <strong style={{ color: '#18181b' }}>{t('quantity') || (isRTL ? 'الكمية' : 'Qty')}:</strong> {item.quantity}
                        </span>
                        <span>•</span>
                        <span>
                          <strong style={{ color: '#18181b' }}>{t('total_price') || (isRTL ? 'الإجمالي' : 'Total')}:</strong> {formatAmount(item.totalPrice)} {t('egp')}
                        </span>
                      </div>
                    </div>

                    {/* Images Big Scale Container */}
                    <div style={{
                      padding: '1.25rem',
                      display: 'grid',
                      gridTemplateColumns: item.images.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(340px, 1fr))',
                      gap: '1.25rem',
                      background: '#fafafa'
                    }}>
                      {item.images.map((imgSrc, imgIdx) => (
                        <div
                          key={imgIdx}
                          style={{
                            position: 'relative',
                            background: '#090d16',
                            borderRadius: '10px',
                            border: '1.5px solid #27272a',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: imgHeight,
                            cursor: 'zoom-in',
                            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
                          }}
                          onClick={() => setPreviewImage(imgSrc)}
                          title={isRTL ? 'انقر لتكبير الصورة بالحجم الكامل الأصلي' : 'Click to view full original resolution'}
                        >
                          <img
                            src={imgSrc}
                            alt={`${item.productName} - ${imgIdx + 1}`}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              width: 'auto',
                              height: 'auto',
                              objectFit: 'contain',
                              display: 'block'
                            }}
                          />

                          {/* Image Badge & Hint */}
                          <div className="hide-on-print" style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: isRTL ? 'auto' : '10px',
                            left: isRTL ? '10px' : 'auto',
                            background: 'rgba(0,0,0,0.75)',
                            backdropFilter: 'blur(6px)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#ffffff',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            pointerEvents: 'none'
                          }}>
                            🔍 {isRTL ? 'تكبير كامل' : 'Zoom'} {item.images.length > 1 ? `(${imgIdx + 1}/${item.images.length})` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Dark Footer Bar ── */}
        <div style={{
          background: '#09090b',
          color: '#ffffff',
          padding: '0.75rem 2.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem'
        }}>
          <span style={{ fontWeight: 700 }}>
            📍 {companyName} — {isRTL ? 'حلول التغليف والطباعة' : 'Packaging & Printing Solutions'}
          </span>
          <span style={{ color: '#d4d4d8' }}>
            {t('generated_at') || (isRTL ? 'تاريخ الإصدار' : 'Generated')}: {new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .doc-header-band {
            grid-template-columns: 1fr !important;
          }
        }
        @media print {
          @page { size: A4; margin: 5mm 6mm; }
          body { margin: 0; background: #fff !important; color: #000 !important; }
          .hide-on-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-doc {
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .doc-header-band {
            grid-template-columns: minmax(0, 1fr) 250px !important;
            padding: 6px 12px !important;
          }
          .doc-meta-grid {
            padding: 5px 12px !important;
            gap: 8px !important;
          }
          .doc-items-section {
            padding: 0 12px !important;
          }
          .doc-items-table th {
            padding: 4px 6px !important;
            font-size: 8.5pt !important;
          }
          .doc-items-table td {
            padding: 2.5px 6px !important;
            font-size: 8.2pt !important;
            line-height: 1.2 !important;
          }
          .big-scale-item-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 10mm !important;
          }
          .quotation-images-section {
            page-break-before: always !important;
          }
        }
        /* Arabic Text Shaping & Ligature Fixes for PDF / Print / Canvas */
        .print-doc[dir="rtl"],
        .print-doc[dir="rtl"] * {
          letter-spacing: normal !important;
          word-spacing: normal !important;
        }
        .print-doc[dir="rtl"] th,
        .print-doc[dir="rtl"] td,
        .print-doc[dir="rtl"] p,
        .print-doc[dir="rtl"] span,
        .print-doc[dir="rtl"] div,
        .print-doc[dir="rtl"] h1,
        .print-doc[dir="rtl"] h2,
        .print-doc[dir="rtl"] h3 {
          font-feature-settings: "liga" 1, "clig" 1;
          -webkit-font-feature-settings: "liga" 1, "clig" 1;
          text-rendering: geometricPrecision;
        }
      `}</style>
      {/* Full size original image popup modal */}
      <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
