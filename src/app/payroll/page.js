"use client";

import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';
import { db } from '../../db';
import { calculatePayroll } from '../../utils/payrollCalculator';
import { formatAmount } from '../../utils/format';
import { 
  Calculator, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Edit3, 
  Lock, 
  Unlock, 
  HandCoins, 
  Banknote,
  Clock,
  Award
} from 'lucide-react';

function getCurrentMonthPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${String(lastDay).padStart(2, '0')}`
  };
}

export default function Payroll() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  const [isOverride, setIsOverride] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcMeta, setCalcMeta] = useState(null);
  const [existingPayrollWarning, setExistingPayrollWarning] = useState(null);
  const isOverrideRef = useRef(false);

  const schema = useMemo(() => [
    { key: 'employee_id', label: 'employee', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', required: true },
    { key: 'period_start', label: 'period_start', type: 'date', required: true },
    { key: 'period_end', label: 'period_end', type: 'date', required: true },
    { 
      key: 'base_salary', 
      label: isOverride ? `${t('base_salary')} (${isRTL ? 'تعديل يدوي' : 'Manual'})` : `${t('base_salary')} (${isRTL ? 'آلي' : 'Auto'})`, 
      type: 'number', 
      isCurrency: true, 
      required: true, 
      disabled: !isOverride 
    },
    { 
      key: 'production_bonus', 
      label: isOverride ? `${t('production_bonus')} (${isRTL ? 'تعديل يدوي' : 'Manual'})` : `${t('production_bonus')} (${isRTL ? 'آلي' : 'Auto'})`, 
      type: 'number', 
      isCurrency: true, 
      required: true, 
      disabled: !isOverride 
    },
    { 
      key: 'deductions', 
      label: isOverride ? `${t('deductions')} (${isRTL ? 'تعديل يدوي' : 'Manual'})` : `${t('deductions')} (${isRTL ? 'آلي' : 'Auto'})`, 
      type: 'number', 
      isCurrency: true, 
      required: true, 
      disabled: !isOverride 
    },
    { 
      key: 'loan_deductions', 
      label: isOverride ? `${t('loan_deductions')} (${isRTL ? 'تعديل يدوي' : 'Manual'})` : `${t('loan_deductions')} (${isRTL ? 'آلي' : 'Auto'})`, 
      type: 'number', 
      isCurrency: true, 
      showTotal: true, 
      disabled: !isOverride 
    },
    { key: 'net_pay', label: 'net_pay', type: 'number', isCurrency: true, showTotal: true, disabled: true },
    { key: 'status', label: 'status', type: 'select', options: ['DRAFT', 'APPROVED', 'PAID'], required: true }
  ], [isOverride, isRTL, t]);

  const checkExistingPayroll = useCallback(async (empId, pStart, pEnd, currentId) => {
    if (!empId) {
      setExistingPayrollWarning(null);
      return;
    }
    try {
      const monthPeriod = getCurrentMonthPeriod();
      const targetStart = pStart || monthPeriod.start;
      const targetEnd = pEnd || monthPeriod.end;
      const s1 = targetStart <= targetEnd ? targetStart : targetEnd;
      const e1 = targetStart <= targetEnd ? targetEnd : targetStart;
      const targetMonth = s1.slice(0, 7);

      const records = await db.payroll
        .filter(r => !r.deleted_at && r.employee_id === empId && (!currentId || r.id !== currentId))
        .toArray();

      const matched = records.find(r => {
        const rStart = r.period_start || r.period_end || '';
        const rEnd = r.period_end || r.period_start || '';
        if (!rStart || !rEnd) return false;
        const s2 = rStart <= rEnd ? rStart : rEnd;
        const e2 = rStart <= rEnd ? rEnd : rStart;
        const isOverlap = s1 <= e2 && e1 >= s2;
        const isSameMonth = rStart.slice(0, 7) === targetMonth || rEnd.slice(0, 7) === targetMonth;
        return isOverlap || isSameMonth;
      });

      setExistingPayrollWarning(matched || null);
    } catch (err) {
      console.error('Error checking existing payroll:', err);
    }
  }, []);

  const triggerCalculation = useCallback(async (empId, pStart, pEnd, applyUpdates) => {
    if (!empId || !pStart || !pEnd) return;
    setIsCalculating(true);
    try {
      const result = await calculatePayroll(empId, pStart, pEnd);
      if (result) {
        setCalcMeta(result.details);
        applyUpdates({
          base_salary: result.base_salary,
          production_bonus: result.production_bonus,
          deductions: result.deductions,
          loan_deductions: result.loan_deductions || 0,
          net_pay: result.net_pay
        });
      }
    } catch (e) {
      console.error('Error calculating payroll:', e);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const handleFieldChange = useCallback((changedKey, value, currentFormData, applyUpdates) => {
    if (changedKey === '__init__') {
      setIsOverride(false);
      isOverrideRef.current = false;
      setCalcMeta(null);
      setExistingPayrollWarning(null);

      const monthPeriod = getCurrentMonthPeriod();
      const updates = {};
      
      // If new record, default period to current full month & status to DRAFT
      if (!currentFormData.id) {
        updates.period_start = monthPeriod.start;
        updates.period_end = monthPeriod.end;
        updates.status = currentFormData.status || 'DRAFT';
      }

      const pStart = updates.period_start || currentFormData.period_start || monthPeriod.start;
      const pEnd = updates.period_end || currentFormData.period_end || monthPeriod.end;
      const empId = currentFormData.employee_id;

      if (empId) {
        checkExistingPayroll(empId, pStart, pEnd, currentFormData.id);
        triggerCalculation(empId, pStart, pEnd, (calcResults) => {
          applyUpdates({ ...updates, ...calcResults });
        });
      } else if (Object.keys(updates).length > 0) {
        applyUpdates(updates);
      }
      return;
    }

    // When user manually edits one of the values while in override mode
    if (['base_salary', 'production_bonus', 'deductions', 'loan_deductions'].includes(changedKey)) {
      const base = Number(changedKey === 'base_salary' ? value : currentFormData.base_salary) || 0;
      const bonus = Number(changedKey === 'production_bonus' ? value : currentFormData.production_bonus) || 0;
      const ded = Number(changedKey === 'deductions' ? value : currentFormData.deductions) || 0;
      const loanDed = Number(changedKey === 'loan_deductions' ? value : currentFormData.loan_deductions) || 0;
      const net = Math.round((base + bonus - ded - loanDed) * 100) / 100;
      applyUpdates({ net_pay: net });
      return;
    }

    // When employee changes, always trigger fresh auto-calculation and reset to automated mode
    if (changedKey === 'employee_id') {
      const empId = value;
      const pStart = currentFormData.period_start;
      const pEnd = currentFormData.period_end;
      setIsOverride(false);
      isOverrideRef.current = false;
      checkExistingPayroll(empId, pStart, pEnd, currentFormData.id);
      if (empId && pStart && pEnd) {
        triggerCalculation(empId, pStart, pEnd, applyUpdates);
      }
      return;
    }

    // When date period changes and not in manual override
    if (['period_start', 'period_end'].includes(changedKey)) {
      const empId = currentFormData.employee_id;
      const pStart = changedKey === 'period_start' ? value : currentFormData.period_start;
      const pEnd = changedKey === 'period_end' ? value : currentFormData.period_end;

      checkExistingPayroll(empId, pStart, pEnd, currentFormData.id);
      if (empId && pStart && pEnd && !isOverrideRef.current) {
        triggerCalculation(empId, pStart, pEnd, applyUpdates);
      }
    }
  }, [triggerCalculation, checkExistingPayroll]);

  const customModalRender = ({ formData, updateField, t }) => {
    const baseVal = Number(formData.base_salary) || 0;
    const bonusVal = Number(formData.production_bonus) || 0;
    const dedVal = Number(formData.deductions) || 0;
    const loanDedVal = Number(formData.loan_deductions) || 0;
    const netVal = Math.round((baseVal + bonusVal - dedVal - loanDedVal) * 100) / 100;

    return (
      <div style={{
        marginBottom: '1.25rem',
        padding: '1.25rem',
        borderRadius: '12px',
        backgroundColor: 'var(--surface-hover)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Warning if employee already has a payroll record in the same month/period */}
        {existingPayrollWarning && (
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.88rem',
            fontWeight: 700
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>
              {`فيه راتب مسجّل للموظف ده في الفترة من ${existingPayrollWarning.period_start} إلى ${existingPayrollWarning.period_end}`}
            </span>
          </div>
        )}

        {/* Header: Mode & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: isOverride ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: isOverride ? '#f59e0b' : '#10b981'
            }}>
              {isOverride ? <Unlock size={18} /> : <Sparkles size={18} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                <span>{isOverride ? (isRTL ? 'وضع التعديل اليدوي نشط' : 'Manual Override Active') : (isRTL ? 'نظام الحساب التلقائي نشط' : 'Automated Payroll Active')}</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  fontWeight: 600,
                  backgroundColor: isOverride ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: isOverride ? '#d97706' : '#059669'
                }}>
                  {isOverride ? (isRTL ? 'تعديل مخصص' : 'Custom Edit') : (isRTL ? 'آلي 100%' : '100% Auto')}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {isOverride
                  ? (isRTL ? 'الحقول مفتوحة للتعديل اليدوي. سيتم تحديث الصافي تلقائياً فور تغيير أي قيمة.' : 'Fields are unlocked for custom adjustment. Net pay recalculates instantly.')
                  : (isRTL ? 'يتم احتساب الراتب والحوافز وخصومات الغياب وأقساط السلف آلياً من النظام.' : 'Wages, piece bonuses, absences, and loan installments are auto-calculated.')
                }
              </div>
            </div>
          </div>

          {/* Action Buttons: Toggle Edit / Reset Auto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isOverride ? (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsOverride(false);
                    isOverrideRef.current = false;
                    if (formData.employee_id && formData.period_start && formData.period_end) {
                      triggerCalculation(formData.employee_id, formData.period_start, formData.period_end, (updated) => {
                        Object.entries(updated).forEach(([k, v]) => updateField(k, v));
                      });
                    }
                  }}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <RefreshCw size={14} />
                  <span>{isRTL ? 'استعادة الحساب التلقائي' : 'Reset to Auto'}</span>
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setIsOverride(false);
                    isOverrideRef.current = false;
                  }}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.4rem 0.75rem',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Lock size={14} />
                  <span>{isRTL ? 'قفل الحساب' : 'Lock Auto'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setIsOverride(true);
                  isOverrideRef.current = true;
                }}
                style={{
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.75rem',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={14} style={{ color: '#f59e0b' }} />
                <span>{isRTL ? 'تعديل يدوي (تغيير القيم)' : 'Manual Edit'}</span>
              </button>
            )}

            <button
              type="button"
              className="btn"
              disabled={isCalculating || !formData.employee_id || !formData.period_start || !formData.period_end}
              onClick={() => {
                triggerCalculation(formData.employee_id, formData.period_start, formData.period_end, (updated) => {
                  Object.entries(updated).forEach(([k, v]) => updateField(k, v));
                });
              }}
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <RefreshCw size={14} className={isCalculating ? 'spin' : ''} />
              <span>{isRTL ? 'إعادة الفحص' : 'Recheck'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Equation Strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem',
          padding: '0.75rem',
          borderRadius: '10px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('base_salary')}</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#2563eb' }}>{formatAmount(baseVal)} {t('egp')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>+ {t('production_bonus')}</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#10b981' }}>+{formatAmount(bonusVal)} {t('egp')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>- {t('deductions')}</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f59e0b' }}>-{formatAmount(dedVal)} {t('egp')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>- {t('loan_deductions')}</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ef4444' }}>-{formatAmount(loanDedVal)} {t('egp')}</div>
          </div>
          <div style={{ borderLeft: isRTL ? 'none' : '1px solid var(--border)', borderRight: isRTL ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>= {t('net_pay')}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>{formatAmount(netVal)} {t('egp')}</div>
          </div>
        </div>

        {/* Detailed Metadata Breakdown */}
        {calcMeta && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', padding: '0.4rem 0' }}>
              <div>
                <strong>{t('salary_type')}:</strong> {t(calcMeta.salary_type?.toLowerCase()) || calcMeta.salary_type} ({formatAmount(calcMeta.salary_amount)} {t('egp')})
              </div>
              <div>
                <strong>{t('present_days')}:</strong> <span style={{ color: '#10b981', fontWeight: 700 }}>{calcMeta.attendance?.present ?? 0}</span>
              </div>
              <div>
                <strong>{t('absent_days')}:</strong> <span style={{ color: calcMeta.attendance?.absent > 0 ? '#ef4444' : 'inherit', fontWeight: 700 }}>{calcMeta.attendance?.absent ?? 0}</span>
                {calcMeta.absence_deduction > 0 && (
                  <span style={{ color: '#ef4444', marginInlineStart: '0.3rem' }}>
                    (-{formatAmount(calcMeta.absence_deduction)} {t('egp')})
                  </span>
                )}
              </div>
              <div>
                <strong>{isRTL ? 'أيام التأخير' : 'Late Days'}:</strong> <span style={{ color: calcMeta.attendance?.late > 0 ? '#f59e0b' : 'inherit', fontWeight: 700 }}>{calcMeta.attendance?.late ?? 0}</span>
                {calcMeta.late_deduction > 0 && (
                  <span style={{ color: '#f59e0b', marginInlineStart: '0.3rem' }}>
                    ({isRTL ? 'خصم تأخير:' : 'Late Ded.:'} -{formatAmount(calcMeta.late_deduction)} {t('egp')})
                  </span>
                )}
              </div>
              <div>
                <strong>{t('production_entries')}:</strong> <span style={{ fontWeight: 700 }}>{calcMeta.production_entries ?? 0}</span>
              </div>
            </div>

            {/* Active Loans Section */}
            {calcMeta.loans && calcMeta.loans.length > 0 ? (
              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--text-main)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#ef4444' }}>
                    <HandCoins size={16} />
                    <span>{t('active_loans_deductions')} ({calcMeta.loans.length})</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>
                    {isRTL ? 'إجمالي الخصم:' : 'Total Deducted:'} -{formatAmount(loanDedVal)} {t('egp')}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {calcMeta.loans.map((l, idx) => (
                    <div key={l.loan_id || idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      fontSize: '0.78rem',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      background: 'var(--surface)'
                    }}>
                      <div>
                        <strong>{t(l.deduction_frequency?.toLowerCase()) || l.deduction_frequency}</strong>
                        {l.notes ? ` • ${l.notes}` : ''}
                        <span style={{ color: 'var(--text-muted)', margin: '0 0.35rem' }}>
                          ({t('installment_amount')}: {formatAmount(l.installment_amount)} {t('egp')} | {t('remaining_amount')}: {formatAmount(l.remaining_before)} {t('egp')})
                        </span>
                      </div>
                      <strong style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                        -{formatAmount(l.deducted)} {t('egp')}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={15} />
                <span>{isRTL ? 'لا توجد سلف أو قروض نشطة على هذا الموظف (استقطاع السلف: 0 ج.م)' : 'No active loans for this employee (Loan deductions: 0 EGP)'}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const computeMetricCards = useCallback((data, relationsData, t, isRTL) => {
    const validData = Array.isArray(data) ? data.filter(d => !d.deleted_at) : [];
    const totalNet = validData.reduce((s, r) => s + (Number(r.net_pay) || 0), 0);
    const paid = validData.filter(r => r.status === 'PAID').reduce((s, r) => s + (Number(r.net_pay) || 0), 0);
    const pending = validData.filter(r => r.status !== 'PAID').reduce((s, r) => s + (Number(r.net_pay) || 0), 0);
    const totalLoanDed = validData.reduce((s, r) => s + (Number(r.loan_deductions) || 0), 0);

    return [
      {
        title: isRTL ? 'إجمالي صافي الرواتب' : 'Total Net Payroll',
        value: `${formatAmount(totalNet)} ${t('egp')}`,
        icon: Banknote,
        color: '#2563eb',
        badge: `${validData.length} ${isRTL ? 'مسير مسجل' : 'Payroll cycles'}`
      },
      {
        title: isRTL ? 'الرواتب المصروفة' : 'Paid Salaries',
        value: `${formatAmount(paid)} ${t('egp')}`,
        icon: CheckCircle2,
        color: '#10b981',
        badge: `${validData.filter(r => r.status === 'PAID').length} ${isRTL ? 'تم صرفها' : 'Disbursed'}`
      },
      {
        title: isRTL ? 'رواتب معلقة للصرف' : 'Pending Payouts',
        value: `${formatAmount(pending)} ${t('egp')}`,
        icon: Clock,
        color: '#f59e0b',
        badge: `${validData.filter(r => r.status !== 'PAID').length} ${isRTL ? 'في الانتظار' : 'Pending'}`
      },
      {
        title: isRTL ? 'استقطاعات السلف المحصلة' : 'Loan Deductions Recovered',
        value: `${formatAmount(totalLoanDed)} ${t('egp')}`,
        icon: HandCoins,
        color: '#ef4444',
        badge: isRTL ? 'خصومات سلف من الرواتب' : 'Auto Loan Recoveries'
      }
    ];
  }, []);

  return (
    <DynamicCRUD
      tableName="payroll"
      title={t('payroll')}
      schema={schema}
      onFieldChange={handleFieldChange}
      customModalRender={customModalRender}
      metricCards={computeMetricCards}
    />
  );
}
