"use client";

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';
import { HandCoins, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { formatAmount } from '../../utils/format';

export default function EmployeeLoans() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';

  const schema = [
    { key: 'employee_id', label: 'employee', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', required: true },
    { key: 'loan_date', label: 'loan_date', type: 'date', required: true },
    { key: 'loan_amount', label: 'loan_amount', type: 'number', isCurrency: true, required: true, showTotal: true },
    { 
      key: 'deduction_frequency', 
      label: 'deduction_frequency', 
      type: 'select', 
      options: ['MONTHLY', 'WEEKLY', 'DAILY'], 
      required: true 
    },
    { key: 'installment_amount', label: 'installment_amount', type: 'number', isCurrency: true, required: true, showTotal: true },
    { key: 'total_paid', label: 'total_paid', type: 'number', isCurrency: true, showTotal: true },
    { key: 'remaining_amount', label: 'remaining_amount', type: 'computed', isCurrency: true, showTotal: true, readOnly: true },
    { key: 'start_date', label: 'start_date', type: 'date', required: true },
    { key: 'status', label: 'status', type: 'select', options: ['ACTIVE', 'PAID', 'SUSPENDED'], required: true },
    { key: 'notes', label: 'notes', type: 'text' }
  ];

  const handleFieldChange = useCallback((changedKey, value, currentFormData, applyUpdates) => {
    if (changedKey === '__init__') {
      const loanAmt = Number(currentFormData.loan_amount) || 0;
      const paid = Number(currentFormData.total_paid) || 0;
      const rem = Math.max(0, loanAmt - paid);
      applyUpdates({
        loan_date: currentFormData.loan_date || new Date().toISOString().split('T')[0],
        start_date: currentFormData.start_date || new Date().toISOString().split('T')[0],
        deduction_frequency: currentFormData.deduction_frequency || 'MONTHLY',
        total_paid: paid,
        remaining_amount: rem,
        status: currentFormData.status || (rem <= 0 && loanAmt > 0 ? 'PAID' : 'ACTIVE')
      });
      return;
    }

    if (changedKey === 'loan_amount' || changedKey === 'total_paid') {
      const loanAmt = Number(changedKey === 'loan_amount' ? value : currentFormData.loan_amount) || 0;
      const paid = Number(changedKey === 'total_paid' ? value : currentFormData.total_paid) || 0;
      const rem = Math.max(0, loanAmt - paid);
      applyUpdates({
        remaining_amount: rem,
        status: rem <= 0 && loanAmt > 0 ? 'PAID' : (currentFormData.status || 'ACTIVE')
      });
    }
  }, []);

  const computeMetricCards = useCallback((data, relationsData, t, isRTL) => {
    const validData = Array.isArray(data) ? data.filter(d => !d.deleted_at) : [];
    const totalIssued = validData.reduce((sum, d) => sum + (Number(d.loan_amount) || 0), 0);
    const totalRepaid = validData.reduce((sum, d) => sum + (Number(d.total_paid) || 0), 0);
    const totalOutstanding = Math.max(0, totalIssued - totalRepaid);
    const activeLoans = validData.filter(d => d.status === 'ACTIVE' || (!d.status && (Number(d.loan_amount) || 0) > (Number(d.total_paid) || 0))).length;

    return [
      {
        title: isRTL ? 'إجمالي السلف الممنوحة' : 'Total Loans Issued',
        value: `${formatAmount(totalIssued)} ${t('egp')}`,
        icon: HandCoins,
        color: '#2563eb',
        badge: `${validData.length} ${isRTL ? 'سلفة مسجلة' : 'Recorded'}`
      },
      {
        title: isRTL ? 'السلف النشطة الجارية' : 'Active Loans',
        value: activeLoans,
        icon: Clock,
        color: '#f59e0b',
        badge: isRTL ? 'قيد الخصم الدوري' : 'In Repayment'
      },
      {
        title: isRTL ? 'إجمالي المبالغ المسددة' : 'Total Repaid',
        value: `${formatAmount(totalRepaid)} ${t('egp')}`,
        icon: CheckCircle2,
        color: '#10b981',
        badge: totalIssued > 0 ? `${Math.round((totalRepaid / totalIssued) * 100)}%` : '0%'
      },
      {
        title: isRTL ? 'المتبقي قيد التحصيل' : 'Outstanding Balance',
        value: `${formatAmount(totalOutstanding)} ${t('egp')}`,
        icon: AlertCircle,
        color: '#ef4444',
        badge: isRTL ? 'رصيد مستحق' : 'Receivable'
      }
    ];
  }, []);

  return (
    <DynamicCRUD
      tableName="employee_loans"
      title={t('employee_loans')}
      schema={schema}
      onFieldChange={handleFieldChange}
      metricCards={computeMetricCards}
    />
  );
}
