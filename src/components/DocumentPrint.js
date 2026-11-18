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
        border: '1px solid #e4e4e7',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        color: '#09090b',
        direction: isRTL ? 'rtl' : 'ltr',
        textAlign: isRTL ? 'right' : 'left',
        fontFamily: isRTL ? "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" : "'Segoe UI', Arial, sans-serif"
      }}>
        {/* ── Header Band (Black & White Zinc Theme) ── */}
        <div style={{
          background: '#09090b',
          borderBottom: '2px solid #27272a',
          padding: '2rem 2.5rem', color: '#ffffff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          {/* Left: Status + Quote info */}
          <div>
            <div style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '999px', padding: isRTL ? '5px 14px' : '4px 14px',
              fontSize: '0.75rem', fontWeight: 700, letterSpacing: isRTL ? 'normal' : '0.5px',
              lineHeight: 1.4,
              color: '#ffffff', marginBottom: '0.75rem', textTransform: isRTL ? 'none' : 'uppercase'
            }}>{t(status?.toLowerCase()) || status}</div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#e4e4e7', fontWeight: 500 }}>
              {docType === 'QUOTATION' ? (t('quotation') || 'Quotation') : (t('invoice') || 'Invoice')} #: <strong style={{ color: '#ffffff' }}>{docNumber}</strong>
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
              {t('date') || 'Date'}: {docDate}
            </p>
            {profile.tax_number && String(profile.tax_number).trim() !== '' && (
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#a1a1aa' }}>
                {isRTL ? 'الرقم الضريبي:' : 'Tax Reg:'} {profile.tax_number}
              </p>
            )}
            {profile.commercial_reg && String(profile.commercial_reg).trim() !== '' && (
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#a1a1aa' }}>
                {isRTL ? 'السجل التجاري:' : 'C.R.:'} {profile.commercial_reg}
              </p>
            )}
          </div>
          {/* Right: Brand */}
          <div style={{ textAlign: isRTL ? 'left' : 'right', display: 'flex', flexDirection: 'column', alignItems: isRTL ? 'flex-start' : 'flex-end', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.5px', color: '#ffffff', lineHeight: 1.2 }}>
                  {companyName}
                </h1>
                <p style={{ margin: '4px 0 0', color: '#a1a1aa', fontSize: '0.85rem' }}>
                  {companyTagline}
                </p>
              </div>
              {profile.logo && profile.logo.startsWith('data:') ? (
                <img 
                  src={profile.logo} 
                  alt={companyName} 
                  style={{ height: 44, width: 'auto', maxWidth: 140, objectFit: 'contain', background: 'transparent' }}
                />
              ) : null}
            </div>
            {(profile.phone && String(profile.phone).trim() !== '') || (profile.email && String(profile.email).trim() !== '') ? (
              <p style={{ margin: '2px 0 0', color: '#71717a', fontSize: '0.75rem' }}>
                {[profile.phone?.trim(), profile.email?.trim()].filter(Boolean).join(' • ')}
              </p>
            ) : null}
          </div>
        </div>

        {/* ── Bill To / Prepared By ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          padding: '1.5rem 2.5rem', gap: '2rem',
          borderBottom: '1px solid #e4e4e7', background: '#fafafa'
        }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: isRTL ? 'none' : 'uppercase', letterSpacing: isRTL ? 'normal' : '0.5px' }}>
              {t('prepared_by') || (isRTL ? 'إعداد بواسطة' : 'Prepared By')}
            </p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: '#09090b' }}>{preparedBy?.name || '—'}</p>
            {preparedBy?.phone && <p style={{ margin: '2px 0 0', color: '#71717a', fontSize: '0.85rem' }}>{preparedBy.phone}</p>}
          </div>
          <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: isRTL ? 'none' : 'uppercase', letterSpacing: isRTL ? 'normal' : '0.5px' }}>
              {t('bill_to') || (isRTL ? 'العميل / الفاتورة إلى' : 'Bill To')}
            </p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: '#09090b' }}>{billTo?.name || '—'}</p>
            {billTo?.phone && <p style={{ margin: '2px 0 0', color: '#71717a', fontSize: '0.85rem' }}>{billTo.phone}</p>}
            {billTo?.address && <p style={{ margin: '2px 0 0', color: '#71717a', fontSize: '0.85rem' }}>{billTo.address}</p>}
          </div>
        </div>

        {/* ── Line Items Table ── */}
        <div style={{ padding: '1.5rem 2.5rem 0' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: isRTL ? 'none' : 'uppercase', letterSpacing: isRTL ? 'normal' : '0.5px' }}>
            {t('line_items') || (isRTL ? 'بنود الطلب' : 'Line Items')}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: isRTL ? 'right' : 'left' }}>
            <thead>
              <tr style={{ background: '#18181b', color: '#ffffff', border: '1px solid #18181b' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.78rem', width: '40px', textAlign: isRTL ? 'right' : 'left', color: '#ffffff' }}>#</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.78rem', textAlign: isRTL ? 'right' : 'left', color: '#ffffff' }}>{t('product_name') || (isRTL ? 'المنتج' : 'Product')}</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.78rem', color: '#ffffff' }}>{t('image') || (isRTL ? 'الصورة' : 'Image')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.78rem', textAlign: isRTL ? 'right' : 'left', color: '#ffffff' }}>{t('quantity') || (isRTL ? 'الكمية' : 'Qty')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.78rem', textAlign: isRTL ? 'right' : 'left', color: '#ffffff' }}>{t('unit_price') || (isRTL ? 'سعر الوحدة' : 'Unit Price')}</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.78rem', textAlign: isRTL ? 'left' : 'right', color: '#ffffff' }}>{t('total_price') || (isRTL ? 'الإجمالي' : 'Total')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const images = parseImages(item.image_data);
                return (
                  <tr key={item.id || idx} style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9f9fb',
                    borderBottom: '1px solid #e4e4e7'
                  }}>
                    <td style={{ padding: '1rem', color: '#71717a', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#09090b' }}>{item.product_name}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {images.length > 0 ? (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                          gap: '4px',
                          width: images.length === 1 ? '80px' : '130px',
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
                                height: images.length === 1 ? '80px' : '60px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #e4e4e7',
                                cursor: 'pointer'
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#d4d4d8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', color: '#18181b', fontWeight: 500 }}>{item.quantity}</td>
                    <td style={{ padding: '1rem', color: '#18181b', fontWeight: 500 }}>{formatAmount(item.unit_price)} {t('egp')}</td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#09090b', textAlign: isRTL ? 'left' : 'right' }}>{formatAmount(item.total_price)} {t('egp')}</td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>{t('no_items') || 'No items.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Totals ── */}
        <div style={{ padding: '1.25rem 2.5rem', display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end' }}>
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '1px solid #e4e4e7', color: '#71717a' }}>
              <span style={{ fontWeight: 600 }}>{t('subtotal') || (isRTL ? 'المجموع الفرعي' : 'Subtotal')}</span>
              <span style={{ fontWeight: 600, color: '#18181b' }}>{formatAmount(subtotal)} {t('egp')}</span>
            </div>

            {discountVal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', color: '#dc2626' }}>
                <span style={{ fontWeight: 600 }}>
                  {t('discount') || (isRTL ? 'الخصم' : 'Discount')} {Number(discountPercent) > 0 ? `(${discountPercent}%)` : ''}
                </span>
                <span style={{ fontWeight: 700 }}>-{formatAmount(discountVal)} {t('egp')}</span>
              </div>
            )}

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.85rem 1.15rem', marginTop: '0.25rem',
              background: '#09090b', borderRadius: '8px', color: '#ffffff',
              border: '1px solid #09090b'
            }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('grand_total') || (isRTL ? 'الإجمالي الكلي' : 'Grand Total')}</span>
              <span style={{ fontWeight: 900, fontSize: '1.2rem', color: '#ffffff' }}>{formatAmount(finalGrandTotal)} {t('egp')}</span>
            </div>

            {amountPaid !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>
                <span>{t('amount_paid') || (isRTL ? 'المسدد' : 'Paid')}</span>
                <span>{formatAmount(amountPaid)} {t('egp')}</span>
              </div>
            )}

            {remainingAmount !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: Number(remainingAmount) > 0 ? '#dc2626' : '#059669', fontSize: '0.85rem', fontWeight: 700 }}>
                <span>{t('remaining_amount') || (isRTL ? 'المتبقي' : 'Remaining')}</span>
                <span>{formatAmount(remainingAmount)} {t('egp')}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Notes ── */}
        {notes && (
          <div style={{ padding: '0 2.5rem 1.5rem' }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: '#71717a', textTransform: isRTL ? 'none' : 'uppercase', letterSpacing: isRTL ? 'normal' : '0.5px' }}>
              {t('notes') || (isRTL ? 'ملاحظات' : 'Notes')}
            </p>
            <div style={{ background: '#fafafa', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1rem', color: '#18181b', fontSize: '0.9rem' }}>
              {notes}
            </div>
          </div>
        )}

        {/* ── Attached Quotation & Product Images (Big Scale Below Invoice) ── */}
        {showBigImages && itemsWithImages.length > 0 && (
          <div className="quotation-images-section" style={{
            borderTop: '2px solid #e4e4e7',
            background: '#fafafa',
            padding: '2rem 2.5rem'
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

        {/* ── Footer ── */}
        <div style={{
          borderTop: '1px solid #e4e4e7', background: '#fafafa',
          padding: '1rem 2.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#71717a', fontWeight: 500 }}>{getDisplayName(isRTL)} — {t('packaging_solutions_system') || (isRTL ? 'نظام إدارة حلول التعبئة والتغليف' : 'Packaging Solutions System')}</span>
          <span style={{ fontSize: '0.8rem', color: '#71717a' }}>{t('generated_at') || (isRTL ? 'تاريخ الإصدار' : 'Generated')}: {new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}</span>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body { margin: 0; background: #fff !important; color: #000 !important; }
          .hide-on-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .big-scale-item-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 12mm !important;
          }
          .quotation-images-section {
            page-break-before: auto !important;
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
