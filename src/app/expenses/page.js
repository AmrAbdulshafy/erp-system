"use client";

import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';

export default function Expenses() {
  const { t } = useTranslation();

  const schema = [
    { key: 'category', label: 'category', type: 'select', options: ['ELECTRICITY', 'MAINTENANCE', 'RENT', 'TRANSPORT', 'SHIPPING', 'MATERIALS', 'PAYROLL', 'OTHER'], required: true },
    { key: 'amount', label: 'amount', type: 'number', required: true, isCurrency: true, showTotal: true },
    { key: 'expense_date', label: 'expense_date', type: 'date', required: true },
    { key: 'notes', label: 'notes', type: 'textarea' },
    { key: 'recorded_by', label: 'recorded_by', type: 'relation', relationTable: 'employees', relationLabel: 'full_name' }
  ];

  return <DynamicCRUD tableName="expenses" title={t('expenses')} schema={schema} />;
}
