"use client";

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, Printer, Edit3, ExternalLink, Calendar, DollarSign, 
  Layers, CheckCircle2, XCircle, FileText, Package, Clock, 
  MapPin, Phone, Mail, User, Shield, Briefcase, Truck, Box, Tag, Hash,
  AlertCircle, Check, Info, FileSpreadsheet, Save, RotateCcw,
  Plus, Trash2, Users
} from 'lucide-react';
import { db } from '../db';
import { formatAmount } from '../utils/format';
import { TABLE_TO_ENTITY_TYPE } from '../utils/profileConstants';
import { hashPassword } from '../context/AuthContext';
import { deductWorkOrderBOM, revertWorkOrderBOM } from '../utils/bomDeduction';
import { syncPayrollExpense, syncShippingExpense, syncWithdrawalExpense, syncPurchaseOrderExpense } from '../utils/syncExpenses';
import ImageModal from './ImageModal';
import EntityProfileModal from './EntityProfileModal';

export default function RecordDetailModal({
  tableName,
  title,
  schema = [],
  record,
  relationsData = {},
  items = [],
  itemsTitle,
  initialEditMode = false,
  onClose,
  onEdit,
  onOpenProfile,
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  const [previewImage, setPreviewImage] = useState(null);
  const [localRecord, setLocalRecord] = useState(record || {});
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [formData, setFormData] = useState({ ...(record || {}) });
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(null);
  const [internalProfile, setInternalProfile] = useState(null);
  const [workOrderEmpCount, setWorkOrderEmpCount] = useState(() => {
    if (tableName === 'work_orders') {
      return [6, 5, 4, 3, 2, 1].find(i => Boolean(record?.[`employee_${i}`])) || 1;
    }
    return 1;
  });

  useEffect(() => {
    if (record && tableName === 'work_orders') {
      const activeCount = [6, 5, 4, 3, 2, 1].find(i => Boolean(record?.[`employee_${i}`])) || 1;
      setWorkOrderEmpCount(activeCount);
    }
  }, [record, tableName]);

  const handleOpenProfileTarget = (target) => {
    if (onOpenProfile) {
      onClose();
      onOpenProfile(target);
    } else {
      setInternalProfile(target);
    }
  };

  useEffect(() => {
    if (record) {
      const rec = { ...record };
      if (rec.vehicle_number && !rec.bill_of_lading_number) {
        rec.bill_of_lading_number = rec.vehicle_number;
      }
      setLocalRecord(rec);
      setFormData(rec);
    }
  }, [record]);

  useEffect(() => {
    if (initialEditMode) {
      setIsEditing(true);
    }
  }, [initialEditMode]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!record) return null;

  const getRelationLabel = (field, id) => {
    if (!relationsData) return id;
    const list = relationsData[field.relationTable] || relationsData[field.key];
    if (!list || !Array.isArray(list)) return id;
    const related = list.find(r => r.id === id);
    if (!related) return id;

    if (field.relationTable === 'sales_orders') {
      const orderNum = String(related.id).slice(0, 8).toUpperCase();
      let cust = '';
      const custList = relationsData['customers'] || relationsData['customer_id'];
      if (custList && related.customer_id) {
        const c = Array.isArray(custList) ? custList.find(x => x.id === related.customer_id) : null;
        if (c?.customer_name) cust = ` (${c.customer_name})`;
      }
      return `${t('sales_orders') || 'Sales Order'} #${orderNum}${cust}`;
    }
    if (field.relationLabel === 'id') {
      return `${t(field.label)} #${String(related.id).slice(0, 8).toUpperCase()}`;
    }
    return related[field.relationLabel] || id;
  };

  const getFieldIcon = (field) => {
    if (field.type === 'date') return <Calendar size={14} className="text-muted" />;
    if (field.isCurrency || field.key.includes('salary') || field.key.includes('amount') || field.key.includes('price')) {
      return <DollarSign size={14} className="text-muted" />;
    }
    if (field.type === 'relation') {
      if (field.relationTable === 'employees') return <User size={14} className="text-muted" />;
      if (field.relationTable === 'customers') return <Briefcase size={14} className="text-muted" />;
      if (field.relationTable === 'suppliers') return <Truck size={14} className="text-muted" />;
      if (field.relationTable === 'users') return <Shield size={14} className="text-muted" />;
      return <Layers size={14} className="text-muted" />;
    }
    if (field.key.includes('phone') || field.key.includes('mobile')) return <Phone size={14} className="text-muted" />;
    if (field.key.includes('email')) return <Mail size={14} className="text-muted" />;
    if (field.key.includes('address')) return <MapPin size={14} className="text-muted" />;
    if (field.key.includes('time') || field.key.includes('shift')) return <Clock size={14} className="text-muted" />;
    if (field.key.includes('order') || field.key.includes('number')) return <Hash size={14} className="text-muted" />;
    if (field.type === 'textarea' || field.key.includes('notes') || field.key.includes('desc')) return <FileText size={14} className="text-muted" />;
    return <Tag size={14} className="text-muted" />;
  };

  // Find primary title or name for this record
  const primaryNameField = schema.find(f => 
    f.key === 'full_name' || f.key === 'customer_name' || f.key === 'supplier_name' || 
    f.key === 'username' || f.key === 'product_name' || f.key === 'material_name' ||
    f.key === 'title' || f.key === 'name' || f.key === 'order_number'
  );
  const primaryTitle = primaryNameField && localRecord[primaryNameField.key] 
    ? localRecord[primaryNameField.key] 
    : `${title || tableName} #${String(localRecord.id || '').slice(0, 8).toUpperCase()}`;

  // Find total or currency hero amount if present
  const heroCurrencyField = schema.find(f => 
    (f.key === 'total_amount' || f.isCurrency || f.key === 'amount' || f.key === 'net_salary') && 
    localRecord[f.key] !== undefined && localRecord[f.key] !== null
  );

  // Status badge helper
  const renderStatusBadge = (statusStr) => {
    if (!statusStr) return null;
    const s = String(statusStr).toUpperCase();
    let bg = 'rgba(100, 116, 139, 0.15)';
    let color = '#64748b';
    let icon = <Info size={13} />;

    if (['PAID', 'COMPLETED', 'DELIVERED', 'ACCEPTED', 'APPROVED', 'ACTIVE', 'PRESENT'].includes(s)) {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#10b981';
      icon = <CheckCircle2 size={13} />;
    } else if (['PARTIAL', 'IN_PROGRESS', 'IN_TRANSIT', 'LATE', 'PENDING', 'SENT'].includes(s)) {
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#f59e0b';
      icon = <Clock size={13} />;
    } else if (['UNPAID', 'REJECTED', 'RETURNED', 'ABSENT', 'INACTIVE', 'CANCELLED'].includes(s)) {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#ef4444';
      icon = <XCircle size={13} />;
    }

    const label = t(String(statusStr).toLowerCase()) || statusStr;
    return (
      <span style={{
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        background: bg,
        color: color,
        border: `1px solid ${color}33`
      }}>
        {icon}
        <span>{label}</span>
      </span>
    );
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!tableName || !localRecord?.id) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const originalRecord = await db[tableName]?.get(localRecord.id) || localRecord;
      const updatedFields = {
        ...formData,
        sync_status: 'PENDING',
        updated_at: now
      };

      // 1. Hash user password if modified and not already a 64-char SHA-256 hex
      if (tableName === 'users' && updatedFields.password_hash) {
        const pwd = String(updatedFields.password_hash);
        if (!/^[a-f0-9]{64}$/i.test(pwd)) {
          updatedFields.password_hash = await hashPassword(pwd);
        }
      }

      // 2. Sales / Purchase Orders: keep remaining_amount & customer/supplier balance & linked expense in sync
      if (tableName === 'sales_orders' || tableName === 'purchase_orders') {
        const totalAmt = Number(updatedFields.total_amount) || 0;
        const paidAmt = Number(updatedFields.amount_paid) || 0;
        updatedFields.remaining_amount = Math.max(0, totalAmt - paidAmt);
        updatedFields.payment_status = paidAmt >= totalAmt && totalAmt > 0 ? 'PAID' : (paidAmt > 0 ? 'PARTIAL' : 'UNPAID');

        const oldDebt = Math.max(0, (Number(originalRecord.total_amount) || 0) - (Number(originalRecord.amount_paid) || 0));
        const newDebt = updatedFields.remaining_amount;
        const debtDelta = newDebt - oldDebt;

        if (tableName === 'sales_orders' && updatedFields.customer_id && debtDelta !== 0) {
          const cust = await db.customers.get(updatedFields.customer_id);
          if (cust) {
            await db.customers.update(cust.id, {
              account_balance: (Number(cust.account_balance) || 0) + debtDelta,
              sync_status: 'MODIFIED',
              updated_at: now
            });
          }
        } else if (tableName === 'purchase_orders' && updatedFields.supplier_id && debtDelta !== 0) {
          const supp = await db.suppliers.get(updatedFields.supplier_id);
          if (supp) {
            await db.suppliers.update(supp.id, {
              account_balance: (Number(supp.account_balance) || 0) + debtDelta,
              sync_status: 'MODIFIED',
              updated_at: now
            });
          }
        }
      }

      if (db[tableName]) {
        await db[tableName].update(localRecord.id, updatedFields);
      }
      const merged = { ...localRecord, ...updatedFields };

      // 3. Post-save side effects per module
      if (tableName === 'purchase_orders') {
        await syncPurchaseOrderExpense(merged);
      } else if (tableName === 'shipping_orders') {
        await syncShippingExpense(merged);
      } else if (tableName === 'owner_withdrawals') {
        await syncWithdrawalExpense(merged);
      } else if (tableName === 'payroll') {
        if (merged.status && !merged.payment_status) merged.payment_status = merged.status;
        if (merged.payment_status && !merged.status) merged.status = merged.payment_status;
        await syncPayrollExpense(merged);

        const currentLoanDed = Number(merged.loan_deductions) || 0;
        const prevLoanDed = Number(originalRecord?.loan_deductions) || 0;
        const diffLoanDed = currentLoanDed - prevLoanDed;
        if (diffLoanDed !== 0 && merged.employee_id && db.employee_loans) {
          const activeLoans = await db.employee_loans
            .filter(l => !l.deleted_at && l.employee_id === merged.employee_id && (l.status === 'ACTIVE' || l.status === 'PAID'))
            .toArray();
          let remainingDiff = diffLoanDed;
          for (const loan of activeLoans) {
            if (remainingDiff === 0) break;
            const currentTotalPaid = Number(loan.total_paid) || 0;
            const loanAmt = Number(loan.loan_amount) || 0;
            let step = remainingDiff > 0
              ? Math.min(remainingDiff, Math.max(0, loanAmt - currentTotalPaid))
              : Math.max(remainingDiff, -currentTotalPaid);
            remainingDiff -= step;
            const newTotalPaid = Math.max(0, currentTotalPaid + step);
            const newRemaining = Math.max(0, loanAmt - newTotalPaid);
            await db.employee_loans.update(loan.id, {
              total_paid: newTotalPaid,
              remaining_amount: newRemaining,
              status: newRemaining <= 0 ? 'PAID' : 'ACTIVE',
              sync_status: 'MODIFIED',
              updated_at: now
            });
          }
        }
      } else if (tableName === 'work_orders') {
        if (merged.status === 'COMPLETED' && (originalRecord?.status !== 'COMPLETED' || !originalRecord?.bom_deducted)) {
          await deductWorkOrderBOM(merged);
          const refreshed = await db.work_orders.get(merged.id);
          if (refreshed) Object.assign(merged, refreshed);
        } else if (merged.status !== 'COMPLETED' && originalRecord?.status === 'COMPLETED' && originalRecord?.bom_deducted) {
          await revertWorkOrderBOM(originalRecord);
          const refreshed = await db.work_orders.get(merged.id);
          if (refreshed) Object.assign(merged, refreshed);
        }
      }

      setLocalRecord(merged);
      setIsEditing(false);
      setSaveToast(isRTL ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully');
      setTimeout(() => setSaveToast(null), 3000);
      if (onEdit) onEdit(merged);
    } catch (err) {
      console.error('Failed to update record:', err);
      alert(isRTL ? 'حدث خطأ أثناء حفظ التعديلات' : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const renderFieldInput = (field, value, onChange) => {
    if (field.type === 'relation') {
      const list = relationsData[field.relationTable] || relationsData[field.key] || [];
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="modern-input"
          style={{ width: '100%' }}
        >
          <option value="">{t('select') || (isRTL ? '-- اختر --' : '-- Select --')}</option>
          {list.map(r => (
            <option key={r.id} value={r.id}>
              {field.relationLabel === 'id'
                ? `#${String(r.id).slice(0, 8).toUpperCase()}`
                : (r[field.relationLabel] || r.name || r.customer_name || r.full_name || r.supplier_name || r.material_name || r.id)}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'status' || field.type === 'select' || field.options) {
      let opts = field.options;
      if (!opts && field.key === 'status') {
        opts = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      } else if (!opts && field.key === 'payment_status') {
        opts = ['PAID', 'UNPAID', 'PARTIAL'];
      } else if (!opts) {
        opts = ['PENDING', 'ACTIVE', 'INACTIVE', 'COMPLETED'];
      }
      return (
        <select
          dir={isRTL ? 'rtl' : 'ltr'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="modern-input"
          style={{ 
            width: '100%',
            direction: isRTL ? 'rtl' : 'ltr',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          {opts.map((opt, optIdx) => {
            const optVal = (typeof opt === 'object' && opt !== null) ? (opt.value ?? opt.key ?? opt.id) : opt;
            let label = optVal;
            if (typeof opt === 'object' && opt !== null) {
              label = isRTL 
                ? (opt.nameAr || opt.labelAr || opt.label || opt.name || optVal) 
                : (opt.nameEn || opt.labelEn || opt.label || opt.name || optVal);
            } else {
              const lowerKey = String(opt).toLowerCase();
              if (i18n.exists(lowerKey)) label = t(lowerKey);
              else if (i18n.exists(String(opt))) label = t(String(opt));
            }
            return (
              <option key={optVal || optIdx} value={optVal}>
                {label}
              </option>
            );
          })}
        </select>
      );
    }

    if (field.type === 'textarea' || field.key.includes('notes') || field.key.includes('desc') || field.key.includes('address')) {
      return (
        <textarea
          rows={3}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="modern-input"
          style={{ width: '100%', resize: 'vertical' }}
        />
      );
    }

    if (field.type === 'number' || field.isCurrency) {
      return (
        <input
          type="number"
          step="any"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="modern-input"
          style={{ width: '100%' }}
        />
      );
    }

    if (field.type === 'date') {
      const dateVal = value ? String(value).slice(0, 10) : '';
      return (
        <input
          type="date"
          value={dateVal}
          onChange={(e) => onChange(e.target.value)}
          className="modern-input"
          style={{ width: '100%' }}
        />
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.35rem' }}>
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span style={{ fontWeight: 600 }}>{value ? (isRTL ? 'نعم / نشط' : 'Yes / Active') : (isRTL ? 'لا / معطل' : 'No / Inactive')}</span>
        </label>
      );
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="modern-input"
        style={{ width: '100%' }}
      />
    );
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="modern-modal-overlay"
      style={{ zIndex: 10005 }}
      onClick={onClose}
    >
      <div 
        onClick={e => e.stopPropagation()}
        className="glass-card modern-modal-dialog print-area modal-body-scroll"
        style={{
          width: 'min(92vw, 820px)',
          maxWidth: 'min(92vw, 820px)',
          maxHeight: '86vh',
          overflowY: 'auto',
          padding: 'clamp(1.15rem, 2.2vw, 1.65rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.15rem',
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left'
        }}
      >
        {/* Modal Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '14px',
              background: isEditing ? 'rgba(16, 185, 129, 0.12)' : 'rgba(37, 99, 235, 0.12)',
              color: isEditing ? '#10b981' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {isEditing ? <Edit3 size={26} /> : <Package size={26} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: isEditing ? '#10b981' : 'var(--primary)',
                  color: '#ffffff',
                  letterSpacing: '0.3px'
                }}>
                  {isEditing ? (isRTL ? 'تعديل السجل' : 'Editing Record') : (title || (tableName && tableName.replace(/_/g, ' ').toUpperCase()))}
                </span>
                <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  ID: #{String(localRecord.id || '').slice(0, 8).toUpperCase()}
                </span>
                {!isEditing && localRecord.status && renderStatusBadge(localRecord.status)}
                {!isEditing && localRecord.payment_status && renderStatusBadge(localRecord.payment_status)}
                {!isEditing && localRecord.attendance_status && renderStatusBadge(localRecord.attendance_status)}
              </div>
              <h2 style={{ margin: '0.4rem 0 0 0', fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                {primaryTitle}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {saveToast && (
              <span style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Check size={14} /> {saveToast}
              </span>
            )}

            {!isEditing && (
              <>
                {TABLE_TO_ENTITY_TYPE?.[tableName] && (
                  <button
                    type="button"
                    onClick={() => handleOpenProfileTarget({ type: TABLE_TO_ENTITY_TYPE[tableName], id: localRecord.id })}
                    className="btn hide-on-print"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--primary)',
                      border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}
                    title={isRTL ? 'فتح بطاقة الملف والتقرير الشامل' : 'Open Full Profile & Report Card'}
                  >
                    <User size={15} />
                    <span>{isRTL ? 'بطاقة الملف الشامل' : 'Full Profile Card'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn btn-primary hide-on-print"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    background: '#10b981',
                    borderColor: '#059669',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Edit3 size={15} />
                  <span>{isRTL ? 'تعديل السجل' : 'Edit Record'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="modern-modal-close-btn hide-on-print"
              title={isRTL ? 'إغلاق' : 'Close'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── EDIT MODE VIEW ── */}
        {isEditing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1.5px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.88rem'
            }}>
              <span style={{ color: '#047857', fontWeight: 700 }}>
                ✏️ {isRTL ? 'أنت الآن في وضع التعديل المباشر - يمكنك تعديل أي حقل وحفظه فوراً' : 'Editing Mode: Edit any field and save directly'}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {schema.filter(f => f.key !== 'id' && f.key !== 'created_at' && f.key !== 'updated_at' && !f.readOnly).length} {isRTL ? 'حقول قابلة للتعديل' : 'editable fields'}
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
              background: 'var(--surface-hover)',
              padding: '1.5rem',
              borderRadius: '14px',
              border: '1px solid var(--border)'
            }}>
              {schema.filter(f => f.key !== 'id' && f.key !== 'created_at' && f.key !== 'updated_at' && !f.readOnly).map(field => {
                if (tableName === 'work_orders' && (field.key === 'employee_2' || field.key === 'employee_3' || field.key === 'employee_4' || field.key === 'employee_5' || field.key === 'employee_6')) {
                  return null;
                }

                if (tableName === 'work_orders' && field.key === 'employee_1') {
                  const employeeOptions = relationsData?.['employees'] || [];
                  const assignedCount = [1, 2, 3, 4, 5, 6].filter(i => Boolean(formData[`employee_${i}`])).length;

                  const removeCrewMember = (slotIdx) => {
                    setFormData(prev => {
                      const next = { ...prev };
                      for (let s = slotIdx; s < 6; s++) {
                        next[`employee_${s}`] = next[`employee_${s + 1}`] || '';
                      }
                      next.employee_6 = '';
                      return next;
                    });
                    setWorkOrderEmpCount(prev => Math.max(1, prev - 1));
                  };

                  return (
                    <div 
                      key="work_order_crew_edit_section" 
                      style={{ 
                        gridColumn: '1 / -1', 
                        background: 'var(--surface)', 
                        border: '1.5px solid var(--border)', 
                        borderRadius: '12px', 
                        padding: '1.25rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                    >
                      {/* Crew Section Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={18} />
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                              {t('assigned_crew')}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {isRTL ? 'فريق العمل المعين لتنفيذ هذا الأمر (حتى 6 موظفين)' : 'Assigned crew members executing this work order (up to 6)'}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.78rem', 
                            fontWeight: 700, 
                            padding: '0.25rem 0.65rem', 
                            borderRadius: '999px', 
                            background: assignedCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)', 
                            color: assignedCount > 0 ? '#10b981' : 'var(--text-muted)' 
                          }}>
                            {assignedCount} / 6 {isRTL ? 'معينين' : 'assigned'}
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Employee Slots Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.95rem' }}>
                        {Array.from({ length: workOrderEmpCount }, (_, idx) => idx + 1).map(slotIdx => {
                          const empKey = `employee_${slotIdx}`;
                          const isLead = slotIdx === 1;
                          const currentVal = formData[empKey] || '';

                          return (
                            <div 
                              key={empKey} 
                              style={{ 
                                background: 'var(--surface-hover)', 
                                border: isLead ? '1.5px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--border)', 
                                borderRadius: '10px', 
                                padding: '0.85rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.45rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: isLead ? '#2563eb' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span>{t(empKey)}</span>
                                  {isLead && <span style={{ color: '#ef4444' }}>*</span>}
                                </label>

                                {!isLead && (
                                  <button
                                    type="button"
                                    onClick={() => removeCrewMember(slotIdx)}
                                    title={t('remove_crew_employee')}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      padding: '2px 4px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '2px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600
                                    }}
                                  >
                                    <Trash2 size={13} />
                                    <span>{t('remove')}</span>
                                  </button>
                                )}
                              </div>

                              <select
                                dir={isRTL ? 'rtl' : 'ltr'}
                                value={currentVal}
                                onChange={e => setFormData(prev => ({ ...prev, [empKey]: e.target.value }))}
                                required={isLead}
                                className="modern-input"
                                style={{
                                  width: '100%',
                                  fontWeight: 600,
                                  fontSize: '0.9rem',
                                  direction: isRTL ? 'rtl' : 'ltr',
                                  textAlign: isRTL ? 'right' : 'left'
                                }}
                              >
                                <option value="">-- {t('select')} {t(empKey)} --</option>
                                {employeeOptions.map(emp => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.full_name} {emp.job_title ? `(${emp.job_title})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Employee Button */}
                      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {workOrderEmpCount < 6 ? (
                          <button
                            type="button"
                            onClick={() => setWorkOrderEmpCount(prev => Math.min(6, prev + 1))}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.55rem 1rem',
                              background: 'rgba(37, 99, 235, 0.08)',
                              color: '#2563eb',
                              border: '1.5px dashed #2563eb',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Plus size={16} />
                            <span>{t('add_crew_employee')} ({workOrderEmpCount}/6)</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {t('max_crew_reached')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                const val = formData[field.key] ?? '';
                const isLong = field.type === 'textarea' || field.key.includes('notes') || field.key.includes('address') || field.key.includes('desc');

                return (
                  <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', gridColumn: isLong ? '1 / -1' : 'auto' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {getFieldIcon(field)}
                      <span>{t(field.label) || field.label}</span>
                      {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>

                    {renderFieldInput(field, val, (newVal) => setFormData(prev => ({ ...prev, [field.key]: newVal })))}
                  </div>
                );
              })}
            </div>

            {/* Edit Form Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              borderTop: '1px solid var(--border)',
              paddingTop: '1.25rem',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={() => { setFormData({ ...localRecord }); setIsEditing(false); }}
                className="btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1.25rem' }}
                disabled={isSaving}
              >
                <RotateCcw size={15} />
                <span>{isRTL ? 'إلغاء التعديل' : 'Cancel Edit'}</span>
              </button>

              <button
                type="submit"
                className="modern-submit-btn"
                disabled={isSaving}
              >
                <Save size={16} />
                <span>{isSaving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التعديلات' : 'Save Changes')}</span>
              </button>
            </div>
          </form>
        ) : (
          /* ── VIEW MODE DISPLAY ── */
          <>
            {/* Hero KPI Highlight (if currency or main numeric total exists) */}
            {heroCurrencyField && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                    {t(heroCurrencyField.label) || heroCurrencyField.label}
                  </span>
                  <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#2563eb', fontVariantNumeric: 'tabular-nums' }}>
                    {formatAmount(localRecord[heroCurrencyField.key])} <span style={{ fontSize: '1rem', fontWeight: 700 }}>{t('egp')}</span>
                  </div>
                  {Number(localRecord.discount_amount) > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                        {formatAmount(localRecord.subtotal || ((Number(localRecord.total_amount) || 0) + (Number(localRecord.discount_amount) || 0)))} {t('egp')}
                      </span>
                      <span style={{ 
                        background: '#fef2f2', 
                        color: '#dc2626', 
                        padding: '0.15rem 0.5rem', 
                        borderRadius: '6px', 
                        fontWeight: 700,
                        border: '1px solid #fecaca' 
                      }}>
                        -{formatAmount(localRecord.discount_amount)} {t('egp')} {localRecord.discount_percent ? `(${localRecord.discount_percent}%)` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Extra balance counters if present on transactions */}
                {localRecord.amount_paid !== undefined && (
                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                        {t('amount_paid') || (isRTL ? 'المسدد' : 'Paid')}
                      </span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                        {formatAmount(localRecord.amount_paid)} {t('egp')}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>
                        {t('remaining_amount') || (isRTL ? 'المتبقي' : 'Remaining')}
                      </span>
                      {(() => {
                        const remVal = localRecord.remaining_amount !== undefined && localRecord.remaining_amount !== null
                          ? Number(localRecord.remaining_amount)
                          : ((Number(localRecord.total_amount) || 0) - (Number(localRecord.amount_paid) || 0));
                        return (
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: remVal < 0 ? '#2563eb' : (remVal > 0 ? '#ef4444' : '#10b981') }}>
                            {formatAmount(remVal)} {t('egp')}{remVal < 0 ? ' (دفعة مقدمة)' : ''}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {localRecord.is_active !== undefined && (
                  <span style={{
                    padding: '0.4rem 0.95rem',
                    borderRadius: '999px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: localRecord.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: localRecord.is_active ? '#10b981' : '#ef4444'
                  }}>
                    {localRecord.is_active ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    {localRecord.is_active ? (isRTL ? 'نشط / مفعل' : 'Active') : (isRTL ? 'معطل / غير نشط' : 'Inactive')}
                  </span>
                )}
              </div>
            )}

            {/* Structured Field Attributes Grid */}
            <div className="detail-attr-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              background: 'var(--surface-hover)',
              padding: '1.25rem',
              borderRadius: '14px',
              border: '1px solid var(--border)'
            }}>
              {schema.map(field => {
                if (tableName === 'work_orders' && (field.key === 'employee_2' || field.key === 'employee_3' || field.key === 'employee_4' || field.key === 'employee_5' || field.key === 'employee_6')) {
                  return null;
                }

                if (tableName === 'work_orders' && field.key === 'employee_1') {
                  const empIds = [
                    localRecord.employee_1,
                    localRecord.employee_2,
                    localRecord.employee_3,
                    localRecord.employee_4,
                    localRecord.employee_5,
                    localRecord.employee_6
                  ].filter(Boolean);

                  return (
                    <div 
                      key="work_order_crew_view"
                      className="detail-attr-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        padding: '1rem',
                        borderRadius: '12px',
                        background: 'var(--surface)',
                        border: '1.5px solid rgba(37, 99, 235, 0.25)',
                        gridColumn: '1 / -1'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#2563eb', fontSize: '0.82rem', fontWeight: 700 }}>
                          <Users size={16} />
                          <span>{t('assigned_crew')} ({empIds.length} / 6)</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '0.25rem' }}>
                        {empIds.length === 0 ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : (
                          empIds.map((empId, idx) => {
                            const emp = relationsData?.['employees']?.find(e => e.id === empId);
                            const name = emp?.full_name || empId;
                            const title = emp?.job_title ? ` (${emp.job_title})` : '';
                            return (
                              <button
                                key={empId + '-' + idx}
                                type="button"
                                onClick={() => handleOpenProfileTarget({ type: 'employee', id: empId })}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  padding: '0.45rem 0.85rem',
                                  background: 'rgba(37, 99, 235, 0.08)',
                                  border: '1px solid rgba(37, 99, 235, 0.2)',
                                  borderRadius: '8px',
                                  color: '#2563eb',
                                  fontWeight: 700,
                                  fontSize: '0.84rem',
                                  cursor: 'pointer'
                                }}
                              >
                                <User size={14} />
                                <span>{idx === 0 ? `★ ${name}${title}` : `${name}${title}`}</span>
                                <ExternalLink size={12} />
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                }

                const rawVal = localRecord[field.key] ?? (field.key === 'bill_of_lading_number' ? localRecord.vehicle_number : undefined);
                const isNullOrEmpty = rawVal === undefined || rawVal === null || rawVal === '';
                const isLongText = field.type === 'textarea' || field.key.includes('notes') || field.key.includes('desc') || field.key.includes('address');

                return (
                  <div 
                    key={field.key}
                    className="detail-attr-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      padding: '0.75rem 0.95rem',
                      borderRadius: '10px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      minHeight: '66px',
                      gridColumn: isLongText ? '1 / -1' : 'auto'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {getFieldIcon(field)}
                      <span>{t(field.label) || field.label}</span>
                    </div>

                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                      {isNullOrEmpty ? (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>
                      ) : field.type === 'relation' ? (
                        TABLE_TO_ENTITY_TYPE?.[field.relationTable] ? (
                          <button
                            type="button"
                            onClick={() => handleOpenProfileTarget({ type: TABLE_TO_ENTITY_TYPE[field.relationTable], id: rawVal })}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: '#2563eb',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              textDecoration: 'underline'
                            }}
                          >
                            <span>{getRelationLabel(field, rawVal)}</span>
                            <ExternalLink size={12} />
                          </button>
                        ) : (
                          getRelationLabel(field, rawVal)
                        )
                      ) : field.type === 'checkbox' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: rawVal ? '#10b981' : '#ef4444',
                          fontSize: '0.85rem'
                        }}>
                          {rawVal ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                          {rawVal ? (isRTL ? 'نعم / نشط' : 'Yes / Active') : (isRTL ? 'لا / غير نشط' : 'No / Inactive')}
                        </span>
                      ) : field.type === 'image' && rawVal ? (
                        <img 
                          src={rawVal}
                          alt={field.label}
                          onClick={() => setPreviewImage(rawVal)}
                          title={isRTL ? 'انقر للتكبير' : 'Click to zoom'}
                          style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                        />
                      ) : field.type === 'multi_image' && rawVal ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {(() => {
                            try {
                              const imgs = JSON.parse(rawVal);
                              return (Array.isArray(imgs) ? imgs : [imgs]).map((src, idx) => (
                                <img
                                  key={idx}
                                  src={src}
                                  alt="thumb"
                                  onClick={() => setPreviewImage(src)}
                                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                                />
                              ));
                            } catch {
                              return <span>—</span>;
                            }
                          })()}
                        </div>
                      ) : field.type === 'color_palette' ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: rawVal, display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                          <span>{rawVal}</span>
                        </div>
                      ) : field.key.includes('phone') || field.key.includes('mobile') ? (
                        <a href={`tel:${rawVal}`} style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Phone size={13} /> {rawVal}
                        </a>
                      ) : field.key.includes('email') ? (
                        <a href={`mailto:${rawVal}`} style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Mail size={13} /> {rawVal}
                        </a>
                      ) : field.key.includes('status') ? (
                        renderStatusBadge(rawVal)
                      ) : (field.key === 'account_balance' || field.key === 'remaining_amount') ? (
                        <span style={{ color: Number(rawVal) < 0 ? '#2563eb' : (Number(rawVal) > 0 ? '#ef4444' : '#10b981'), fontVariantNumeric: 'tabular-nums' }}>
                          {formatAmount(rawVal)} {t('egp')}{Number(rawVal) < 0 ? ' (دفعة مقدمة)' : ''}
                        </span>
                      ) : field.isCurrency || (field.type === 'number' && (field.key.includes('salary') || field.key.includes('price') || field.key.includes('amount') || field.key.includes('cost'))) ? (
                        <span style={{ color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                          {formatAmount(rawVal)} {t('egp')}
                        </span>
                      ) : (field.options || field.type === 'select' || field.key === 'department' || field.key === 'salary_type') ? (
                        <span style={{ whiteSpace: isLongText ? 'pre-wrap' : 'normal', lineHeight: 1.5 }}>
                          {(() => {
                            if (Array.isArray(field.options)) {
                              const match = field.options.find(o => typeof o === 'object' && o !== null && ((o.value ?? o.key ?? o.id) === rawVal));
                              if (match) {
                                return isRTL ? (match.nameAr || match.labelAr || match.label || match.name || rawVal) : (match.nameEn || match.labelEn || match.label || match.name || rawVal);
                              }
                            }
                            const lower = String(rawVal).toLowerCase();
                            if (i18n.exists(lower)) return t(lower);
                            if (i18n.exists(String(rawVal))) return t(String(rawVal));
                            return String(rawVal);
                          })()}
                        </span>
                      ) : (
                        <span style={{ whiteSpace: isLongText ? 'pre-wrap' : 'normal', lineHeight: 1.5 }}>
                          {String(rawVal)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Transaction Line Items (if present) */}
            {items && items.length > 0 && (
              <div className="hide-on-print" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.25rem'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Layers size={18} style={{ color: '#2563eb' }} />
                  {itemsTitle || (isRTL ? 'بنود المعاملة' : 'Transaction Items')} ({items.length})
                </h3>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '0.65rem 0.75rem', textAlign: isRTL ? 'right' : 'left', width: '40px' }}>#</th>
                        <th style={{ padding: '0.65rem 0.75rem', textAlign: isRTL ? 'right' : 'left' }}>
                          {isRTL ? 'الصنف / المادة' : 'Item / Description'}
                        </th>
                        <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          {isRTL ? 'الكمية' : 'Quantity'}
                        </th>
                        <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          {isRTL ? 'سعر الوحدة' : 'Unit Price'}
                        </th>
                        <th style={{ padding: '0.65rem 0.75rem', textAlign: isRTL ? 'left' : 'right' }}>
                          {isRTL ? 'الإجمالي' : 'Total'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>
                            {item.material_name || item.product_name || item.item_name || item.description || `#${String(item.raw_material_id || item.id || '').slice(0, 8)}`}
                            {item.notes && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>
                            {formatAmount(item.quantity || 1)}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {formatAmount(item.unit_price || 0)} {t('egp')}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: isRTL ? 'left' : 'right', fontWeight: 700, color: '#10b981' }}>
                            {formatAmount((Number(item.quantity) || 1) * (Number(item.unit_price) || 0))} {t('egp')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="hide-on-print" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              borderTop: '1px solid var(--border)',
              paddingTop: '1.25rem'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.15rem' }}
                >
                  <Printer size={16} />
                  <span>{isRTL ? 'طباعة البطاقة' : 'Print Card'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                {TABLE_TO_ENTITY_TYPE?.[tableName] && (
                  <button
                    type="button"
                    onClick={() => handleOpenProfileTarget({ type: TABLE_TO_ENTITY_TYPE[tableName], id: localRecord.id })}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.55rem 1.25rem',
                      fontWeight: 700,
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--primary)',
                      border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}
                    title={isRTL ? 'فتح بطاقة الملف والتقرير الشامل' : 'Open Full Profile & Report Card'}
                  >
                    <User size={16} />
                    <span>{isRTL ? 'بطاقة الملف الشامل' : 'Full Profile Card'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 1.35rem',
                    fontWeight: 700,
                    background: '#10b981',
                    borderColor: '#059669',
                    color: '#ffffff'
                  }}
                >
                  <Edit3 size={16} />
                  <span>{isRTL ? 'تعديل السجل' : 'Edit Record'}</span>
                </button>

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => { onClose(); onEdit(localRecord); }}
                    className="btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.15rem', color: 'var(--text-main)' }}
                    title={isRTL ? 'فتح في الشاشة التخصصية' : 'Open in dedicated screen'}
                  >
                    <ExternalLink size={15} />
                    <span>{isRTL ? 'الشاشة الرئيسية' : 'Open Screen'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="btn"
                  style={{ padding: '0.55rem 1.25rem' }}
                >
                  {isRTL ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Full size original image popup modal */}
      <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />

      {/* Internal Full Profile Modal Fallback */}
      {internalProfile && (
        <EntityProfileModal
          entityType={internalProfile.type}
          entityId={internalProfile.id}
          onClose={() => setInternalProfile(null)}
        />
      )}
    </div>
  );
}
