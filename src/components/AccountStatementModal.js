"use client";

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Printer, Receipt, HandCoins, Calendar, CheckCircle2, FileText, Plus } from 'lucide-react';
import { db } from '../db';
import { formatAmount } from '../utils/format';
import { createOfficialVoucher } from '../utils/inventoryMovements';
import { useCompanyProfile } from '../utils/companyProfile';

const PAYMENT_METHODS = [
  { value: 'CASH', labelAr: 'نقدي (الخزينة)', labelEn: 'Cash' },
  { value: 'BANK_TRANSFER', labelAr: 'تحويل بنكي', labelEn: 'Bank Transfer' },
  { value: 'INSTAPAY', labelAr: 'إنستاباي (InstaPay)', labelEn: 'InstaPay' },
  { value: 'CHEQUE', labelAr: 'شيك بنكي', labelEn: 'Cheque' },
  { value: 'WALLET', labelAr: 'محفظة إلكترونية', labelEn: 'Mobile Wallet' }
];

/**
 * Modal for issuing a Receipt Voucher (سند قبض) or Payment Voucher (سند صرف)
 * and viewing/printing existing vouchers for an invoice or entity.
 */
export function PaymentVoucherModal({
  isOpen,
  onClose,
  voucherType = 'RECEIPT', // 'RECEIPT' | 'PAYMENT'
  entityType = 'customer', // 'customer' | 'supplier'
  entityId,
  entityName = '',
  referenceType = 'account', // 'sales_order' | 'purchase_order' | 'account'
  referenceId = null,
  defaultAmount = 0,
  onSuccess
}) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const egp = isRTL ? 'ج.م' : 'EGP';

  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : '');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [voucherDate, setVoucherDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successVoucher, setSuccessVoucher] = useState(null);

  const historyVouchers = useLiveQuery(async () => {
    if (!db.payment_vouchers) return [];
    let all = await db.payment_vouchers.filter(v => !v.deleted_at).toArray();
    if (referenceId) {
      all = all.filter(v => v.reference_id === referenceId);
    } else if (entityId) {
      all = all.filter(v => v.entity_id === entityId && v.entity_type === entityType);
    }
    return all.sort((a, b) => String(b.voucher_date || b.created_at).localeCompare(String(a.voucher_date || a.created_at)));
  }, [entityId, entityType, referenceId], []);

  if (!isOpen) return null;

  const isReceipt = voucherType === 'RECEIPT';
  const titleAr = isReceipt ? 'إصدار سند قبض نقدية / تحصيل' : 'إصدار سند صرف / سداد مورد';
  const titleEn = isReceipt ? 'Issue Receipt Voucher' : 'Issue Payment Voucher';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const numAmt = Number(amount) || 0;
    if (numAmt <= 0) {
      setErrorMsg(isRTL ? 'يرجى إدخال مبلغ صحيح أكبر من صفر' : 'Please enter a valid amount greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createOfficialVoucher({
        voucher_type: voucherType,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        reference_type: referenceId ? referenceType : 'account',
        reference_id: referenceId || null,
        amount: numAmt,
        payment_method: paymentMethod,
        voucher_date: voucherDate,
        notes: notes.trim() || (isReceipt
          ? `سند قبض من العميل ${entityName || ''}${referenceId ? ` - فاتورة #${String(referenceId).slice(0, 8).toUpperCase()}` : ''}`
          : `سند صرف للمورد ${entityName || ''}${referenceId ? ` - أمر شراء #${String(referenceId).slice(0, 8).toUpperCase()}` : ''}`)
      });
      setSuccessVoucher(created);
      setAmount('');
      setNotes('');
      if (onSuccess) onSuccess(created);
    } catch (err) {
      setErrorMsg(err?.message || (isRTL ? 'تعذر حفظ السند' : 'Failed to save voucher'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="modern-modal-overlay"
      style={{ zIndex: 10010 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card modern-modal-dialog modal-body-scroll print-area"
        style={{
          width: 'min(92vw, 620px)',
          maxWidth: '620px',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: '1.5rem',
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left'
        }}
      >
        <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: isReceipt ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)',
              color: isReceipt ? '#10b981' : '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HandCoins size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                {isRTL ? titleAr : titleEn}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {entityName ? `${isRTL ? 'الحساب:' : 'Account:'} ${entityName}` : ''}
                {referenceId ? ` • #${String(referenceId).slice(0, 8).toUpperCase()}` : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="modern-modal-close-btn">
            <X size={19} />
          </button>
        </div>

        {successVoucher && (
          <div style={{
            padding: '1rem',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 800 }}>
                <CheckCircle2 size={18} />
                <span>
                  {isRTL
                    ? `تم إصدار السند رقم (${successVoucher.voucher_number}) بمبلغ ${formatAmount(successVoucher.amount)} ${egp}`
                    : `Voucher (${successVoucher.voucher_number}) issued for ${formatAmount(successVoucher.amount)} ${egp}`}
                </span>
              </div>
              <button
                type="button"
                className="btn hide-on-print"
                onClick={() => window.print()}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px' }}
              >
                <Printer size={14} /> {isRTL ? 'طباعة السند' : 'Print Voucher'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="hide-on-print" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.25rem' }}>
          {errorMsg && (
            <div style={{ padding: '0.65rem 0.9rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                {isRTL ? `المبلغ (${egp}) *` : `Amount (${egp}) *`}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', fontWeight: 800, fontSize: '1rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                {isRTL ? 'تاريخ السند *' : 'Voucher Date *'}
              </label>
              <input
                type="date"
                required
                className="form-input"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
              {isRTL ? 'طريقة الدفع / التحصيل' : 'Payment Method'}
            </label>
            <select
              className="form-input"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: '100%' }}
            >
              {PAYMENT_METHODS.map(pm => (
                <option key={pm.value} value={pm.value}>
                  {isRTL ? pm.labelAr : pm.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
              {isRTL ? 'البيان / ملاحظات السند' : 'Description / Notes'}
            </label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRTL ? 'مثال: دفعة تحت الحساب / سداد فاتورة...' : 'e.g. Partial payment against invoice...'}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.35rem' }}>
            <button type="button" className="btn" onClick={onClose} style={{ background: 'var(--surface-hover)', color: 'var(--text-main)' }}>
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Receipt size={16} />
              <span>{isSubmitting ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ وإصدار السند' : 'Issue Voucher')}</span>
            </button>
          </div>
        </form>

        {/* History of vouchers for this invoice/entity */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.92rem', fontWeight: 800 }}>
            {isRTL ? `سجل السندات السابقة (${(historyVouchers || []).length})` : `Previous Vouchers (${(historyVouchers || []).length})`}
          </h4>
          {(historyVouchers || []).length === 0 ? (
            <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {isRTL ? 'لا توجد سندات مسجلة حتى الآن' : 'No vouchers recorded yet'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>{isRTL ? 'رقم السند' : 'Voucher #'}</th>
                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th>{isRTL ? 'الطريقة' : 'Method'}</th>
                    <th>{isRTL ? 'المبلغ' : 'Amount'}</th>
                    <th>{isRTL ? 'البيان' : 'Notes'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyVouchers || []).map(v => {
                    const pmObj = PAYMENT_METHODS.find(p => p.value === v.payment_method);
                    return (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{v.voucher_number || '—'}</td>
                        <td>{v.voucher_date || (v.created_at || '').split('T')[0]}</td>
                        <td>{pmObj ? (isRTL ? pmObj.labelAr : pmObj.labelEn) : v.payment_method}</td>
                        <td style={{ fontWeight: 800, color: '#10b981' }}>{formatAmount(v.amount)} {egp}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{v.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Full Customer / Supplier Account Statement Modal (كشف حساب تفصيلي بالرصيد المتحرك)
 */
export default function AccountStatementModal({
  isOpen,
  onClose,
  entityType = 'customer', // 'customer' | 'supplier'
  entity
}) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const egp = isRTL ? 'ج.م' : 'EGP';
  const { getDisplayName } = useCompanyProfile();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const entityId = entity?.id;
  const isCustomer = entityType === 'customer';
  const entityName = isCustomer ? (entity?.customer_name || '') : (entity?.supplier_name || '');

  const statementData = useLiveQuery(async () => {
    if (!entityId) return { entries: [], currentEntity: null };

    const currentEntity = isCustomer
      ? await db.customers.get(entityId)
      : await db.suppliers.get(entityId);

    const invoices = isCustomer
      ? await db.sales_orders.filter(o => !o.deleted_at && o.customer_id === entityId).toArray()
      : await db.purchase_orders.filter(o => !o.deleted_at && o.supplier_id === entityId).toArray();

    const vouchers = db.payment_vouchers
      ? await db.payment_vouchers
          .filter(v => !v.deleted_at && v.entity_type === entityType && v.entity_id === entityId)
          .toArray()
      : [];

    // Build chronological ledger entries
    // 1. Every Invoice is a Debit (مدين / استحقاق فاتورة) for total_amount
    // 2. Every Voucher is a Credit (دائن / سداد أو تحصيل) for voucher.amount
    //    If an invoice has amount_paid > sum(vouchers for that invoice), include the difference so legacy invoices without vouchers are 100% accurate
    const voucherSumByInvoice = new Map();
    for (const v of vouchers) {
      if (v.reference_id) {
        voucherSumByInvoice.set(v.reference_id, (voucherSumByInvoice.get(v.reference_id) || 0) + (Number(v.amount) || 0));
      }
    }

    const rawEntries = [];

    for (const inv of invoices) {
      const invDate = inv.order_date || (inv.created_at || '').split('T')[0] || '';
      const shortId = `#${String(inv.id).slice(0, 8).toUpperCase()}`;
      const total = Number(inv.total_amount) || 0;
      const paid = Number(inv.amount_paid) || 0;

      rawEntries.push({
        id: `inv-${inv.id}`,
        date: invDate,
        timestamp: inv.created_at || invDate,
        docNumber: shortId,
        typeLabel: isCustomer
          ? (isRTL ? 'فاتورة مبيعات' : 'Sales Invoice')
          : (isRTL ? 'فاتورة مشتريات' : 'Purchase Order'),
        description: isCustomer
          ? (isRTL ? `استحقاق فاتورة مبيعات ${shortId}` : `Sales Invoice ${shortId}`)
          : (isRTL ? `استحقاق أمر شراء خامات ${shortId}` : `Purchase Order ${shortId}`),
        debit: total,
        credit: 0
      });

      const coveredByVouchers = voucherSumByInvoice.get(inv.id) || 0;
      const unvoucheredPaid = Math.round((paid - coveredByVouchers) * 100) / 100;
      if (unvoucheredPaid > 0.009) {
        rawEntries.push({
          id: `inv-paid-${inv.id}`,
          date: invDate,
          timestamp: inv.created_at ? `${inv.created_at}_1` : `${invDate}_1`,
          docNumber: `RV-${shortId.replace('#', '')}`,
          typeLabel: isCustomer
            ? (isRTL ? 'سند قبض (دفعة فاتورة)' : 'Invoice Receipt')
            : (isRTL ? 'سند صرف (دفعة فاتورة)' : 'Invoice Payment'),
          description: isCustomer
            ? (isRTL ? `تحصيل مسجل على الفاتورة ${shortId}` : `Payment received on ${shortId}`)
            : (isRTL ? `سداد مسجل على أمر الشراء ${shortId}` : `Payment made on ${shortId}`),
          debit: 0,
          credit: unvoucheredPaid
        });
      }
    }

    for (const v of vouchers) {
      const vDate = v.voucher_date || (v.created_at || '').split('T')[0] || '';
      rawEntries.push({
        id: `vch-${v.id}`,
        date: vDate,
        timestamp: v.created_at || `${vDate}_2`,
        docNumber: v.voucher_number || `#${String(v.id).slice(0, 6).toUpperCase()}`,
        typeLabel: isCustomer
          ? (isRTL ? 'سند قبض نقدية' : 'Receipt Voucher')
          : (isRTL ? 'سند صرف مورد' : 'Payment Voucher'),
        description: v.notes || (isCustomer ? 'سند قبض تحصيل' : 'سند صرف سداد'),
        debit: 0,
        credit: Number(v.amount) || 0
      });
    }

    rawEntries.sort((a, b) => {
      const dCmp = String(a.date).localeCompare(String(b.date));
      if (dCmp !== 0) return dCmp;
      return String(a.timestamp).localeCompare(String(b.timestamp));
    });

    // Check if there is an initial opening balance difference between currentEntity.account_balance and net ledger
    const ledgerNet = rawEntries.reduce((s, e) => s + e.debit - e.credit, 0);
    const storedBalance = Number(currentEntity?.account_balance ?? entity?.account_balance ?? ledgerNet);
    const openingDiff = Math.round((storedBalance - ledgerNet) * 100) / 100;

    if (Math.abs(openingDiff) > 0.01) {
      rawEntries.unshift({
        id: 'opening-balance-row',
        date: (currentEntity?.created_at || '').split('T')[0] || '—',
        timestamp: '0000',
        docNumber: 'OPEN',
        typeLabel: isRTL ? 'رصيد افتتاحي' : 'Opening Balance',
        description: isRTL ? 'رصيد افتتاحي سابق بالحساب' : 'Previous Opening Account Balance',
        debit: openingDiff > 0 ? openingDiff : 0,
        credit: openingDiff < 0 ? Math.abs(openingDiff) : 0
      });
    }

    return { entries: rawEntries, currentEntity };
  }, [entityId, entityType, isCustomer, isRTL], { entries: [], currentEntity: null });

  const { openingBalance, visibleRows, totalDebit, totalCredit, closingBalance } = useMemo(() => {
    const all = statementData?.entries || [];
    let running = 0;
    let openBal = 0;
    const rows = [];

    for (const item of all) {
      const d = item.date && item.date !== '—' ? item.date : '';
      const beforeFrom = dateFrom && d && d < dateFrom;
      const afterTo = dateTo && d && d > dateTo;

      if (beforeFrom) {
        openBal += item.debit - item.credit;
        running += item.debit - item.credit;
        continue;
      }
      if (afterTo) continue;

      running += item.debit - item.credit;
      rows.push({
        ...item,
        runningBalance: running
      });
    }

    const tDebit = rows.reduce((s, r) => s + r.debit, 0);
    const tCredit = rows.reduce((s, r) => s + r.credit, 0);

    return {
      openingBalance: openBal,
      visibleRows: rows,
      totalDebit: tDebit,
      totalCredit: tCredit,
      closingBalance: running
    };
  }, [statementData, dateFrom, dateTo]);

  if (!isOpen || !entity) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        onClick={onClose}
        className="modern-modal-overlay"
        style={{ zIndex: 10008 }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass-card modern-modal-dialog modal-body-scroll print-area"
          style={{
            width: 'min(95vw, 960px)',
            maxWidth: '960px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            direction: isRTL ? 'rtl' : 'ltr',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          {/* Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.2rem' }}>
                {getDisplayName(isRTL)} • {isRTL ? 'كشف حساب مالي تفصيلي' : 'Detailed Financial Account Statement'}
              </div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900 }}>
                {isCustomer
                  ? (isRTL ? `كشف حساب العميل: ${entityName}` : `Customer Statement: ${entityName}`)
                  : (isRTL ? `كشف حساب المورد: ${entityName}` : `Supplier Statement: ${entityName}`)}
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                {entity.company_name || entity.contact_person || ''}
                {entity.mobile_number ? ` • ${entity.mobile_number}` : ''}
              </p>
            </div>

            <div className="hide-on-print" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowVoucherModal(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>{isCustomer ? (isRTL ? 'إصدار سند قبض' : 'New Receipt Voucher') : (isRTL ? 'إصدار سند صرف' : 'New Payment Voucher')}</span>
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => window.print()}
                style={{ background: 'var(--surface-hover)', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={16} />
                <span>{isRTL ? 'طباعة كشف الحساب' : 'Print Statement'}</span>
              </button>
              <button type="button" onClick={onClose} className="modern-modal-close-btn">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Date Filters */}
          <div className="hide-on-print" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', fontWeight: 700 }}>
              <Calendar size={15} />
              <span>{isRTL ? 'من تاريخ:' : 'From:'}</span>
              <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: 'auto' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.84rem', fontWeight: 700 }}>
              <span>{isRTL ? 'إلى تاريخ:' : 'To:'}</span>
              <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: 'auto' }} />
            </div>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                className="btn"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: 'var(--surface-hover)' }}
              >
                {isRTL ? 'إظهار كل الفترات' : 'Reset Dates'}
              </button>
            )}
          </div>

          {/* Summary KPI Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.9rem 1.1rem', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {isRTL ? 'الرصيد السابق قبل الفترة' : 'Opening Balance'}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.2rem' }}>
                {formatAmount(openingBalance)} {egp}
              </div>
            </div>

            <div style={{ padding: '0.9rem 1.1rem', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {isCustomer ? (isRTL ? 'إجمالي الفواتير (مدين / عليه)' : 'Total Invoiced (Debit)') : (isRTL ? 'إجمالي المشتريات (للمورد)' : 'Total Purchases')}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444', marginTop: '0.2rem' }}>
                {formatAmount(totalDebit)} {egp}
              </div>
            </div>

            <div style={{ padding: '0.9rem 1.1rem', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {isCustomer ? (isRTL ? 'إجمالي التحصيلات وسندات القبض (دائن)' : 'Total Collected (Credit)') : (isRTL ? 'إجمالي المسدد وسندات الصرف' : 'Total Paid')}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>
                {formatAmount(totalCredit)} {egp}
              </div>
            </div>

            <div style={{ padding: '0.9rem 1.1rem', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.08)', border: '1.5px solid var(--primary)' }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--primary)', fontWeight: 700 }}>
                {isRTL ? 'الرصيد النهائي المستحق حالياً' : 'Current Closing Balance'}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: closingBalance > 0 ? '#ef4444' : '#10b981', marginTop: '0.2rem' }}>
                {formatAmount(closingBalance)} {egp}
              </div>
            </div>
          </div>

          {/* Chronological Statement Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                  <th>{isRTL ? 'رقم المستند' : 'Doc #'}</th>
                  <th>{isRTL ? 'نوع الحركة' : 'Type'}</th>
                  <th>{isRTL ? 'البيان والتفاصيل' : 'Description'}</th>
                  <th>{isCustomer ? (isRTL ? 'مدين (عليه)' : 'Debit') : (isRTL ? 'مستحق للمورد' : 'Invoiced')}</th>
                  <th>{isCustomer ? (isRTL ? 'دائن (مسدد)' : 'Credit') : (isRTL ? 'مسدد للمورد' : 'Paid')}</th>
                  <th>{isRTL ? 'الرصيد المتحرك' : 'Running Balance'}</th>
                </tr>
              </thead>
              <tbody>
                {dateFrom && (
                  <tr style={{ background: 'var(--surface-hover)', fontWeight: 700 }}>
                    <td>{dateFrom}</td>
                    <td>OPEN</td>
                    <td>{isRTL ? 'رصيد ما قبله' : 'Brought Forward'}</td>
                    <td>{isRTL ? 'الرصيد المرحل قبل بداية الفترة المحددة' : 'Balance brought forward prior to selected period'}</td>
                    <td>—</td>
                    <td>—</td>
                    <td style={{ fontWeight: 800 }}>{formatAmount(openingBalance)} {egp}</td>
                  </tr>
                )}
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      {isRTL ? 'لا توجد حركات مسجلة لهذا الحساب في الفترة المحددة' : 'No transactions found for this account in the selected period'}
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '0.84rem' }}>{row.date}</td>
                      <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{row.docNumber}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: row.credit > 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                          color: row.credit > 0 ? '#10b981' : '#ef4444'
                        }}>
                          {row.typeLabel}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{row.description}</td>
                      <td style={{ fontWeight: 700, color: row.debit > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {row.debit > 0 ? `${formatAmount(row.debit)} ${egp}` : '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: row.credit > 0 ? '#10b981' : 'var(--text-muted)' }}>
                        {row.credit > 0 ? `${formatAmount(row.credit)} ${egp}` : '—'}
                      </td>
                      <td style={{ fontWeight: 900, color: row.runningBalance > 0 ? 'var(--text-main)' : '#10b981' }}>
                        {formatAmount(row.runningBalance)} {egp}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {visibleRows.length > 0 && (
                <tfoot>
                  <tr style={{ fontWeight: 900, background: 'var(--surface-hover)', borderTop: '2px solid var(--border)' }}>
                    <td colSpan={4}>{isRTL ? 'الإجمالي والرصيد الختامي' : 'Totals & Closing Balance'}</td>
                    <td style={{ color: '#ef4444' }}>{formatAmount(totalDebit)} {egp}</td>
                    <td style={{ color: '#10b981' }}>{formatAmount(totalCredit)} {egp}</td>
                    <td style={{ color: 'var(--primary)', fontSize: '1rem' }}>{formatAmount(closingBalance)} {egp}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <PaymentVoucherModal
        isOpen={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        voucherType={isCustomer ? 'RECEIPT' : 'PAYMENT'}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        defaultAmount={closingBalance > 0 ? closingBalance : 0}
      />
    </>
  );
}
