"use client";

import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';

export default function OwnerWithdrawalsPage() {
  const { t } = useTranslation();

  const schema = [
    { 
      key: 'owner_name', 
      label: 'owner_name', 
      type: 'select', 
      options: ['المالك', 'شريك 1', 'شريك 2', 'Owner', 'Partner 1', 'Partner 2'], 
      allowCustom: true, 
      required: true 
    },
    { 
      key: 'amount', 
      label: 'amount', 
      type: 'number', 
      required: true, 
      isCurrency: true, 
      showTotal: true 
    },
    { 
      key: 'withdrawal_date', 
      label: 'withdrawal_date', 
      type: 'date', 
      required: true 
    },
    { 
      key: 'category', 
      label: 'category', 
      type: 'select', 
      options: ['PERSONAL', 'PROFIT_SHARE', 'SALARY', 'LOAN_RETURN', 'OTHER'], 
      allowCustom: true, 
      required: true 
    },
    { 
      key: 'notes', 
      label: 'notes', 
      type: 'textarea' 
    }
  ];

  return (
    <DynamicCRUD 
      tableName="owner_withdrawals" 
      title={t('owner_withdrawals') || 'Owner Withdrawals'} 
      schema={schema} 
    />
  );
}
