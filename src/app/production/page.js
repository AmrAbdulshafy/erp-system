"use client";

import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';

export default function Production() {
  const { t } = useTranslation();

  const schema = [
    { key: 'production_date', label: 'production_date', type: 'date', required: true },
    { key: 'employee_id', label: 'employee', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', required: true },
    { key: 'work_order_id', label: 'work_order', type: 'relation', relationTable: 'work_orders', relationLabel: 'id' },
    { key: 'product_type', label: 'product_type', type: 'select', options: ['Box', 'Cup', 'Tray', 'Lid', 'Bag', 'Carton', 'Plate'], allowCustom: true, required: true },
    { key: 'quantity', label: 'quantity', type: 'number', required: true, showTotal: true },
    { key: 'rate_per_piece', label: 'rate_per_piece', type: 'number', required: true },
    { key: 'total_amount', label: 'total_amount', type: 'number', required: false, readOnly: true, isCurrency: true, showTotal: true },
    { key: 'notes', label: 'notes', type: 'textarea' }
  ];

  const handleFieldChange = (key, value, nextFormData, applyUpdates) => {
    if (key === 'quantity' || key === 'rate_per_piece') {
      const qty = Number(key === 'quantity' ? value : nextFormData.quantity) || 0;
      const rate = Number(key === 'rate_per_piece' ? value : nextFormData.rate_per_piece) || 0;
      applyUpdates({ total_amount: qty * rate });
    }
  };

  return (
    <DynamicCRUD 
      tableName="employee_production" 
      title={t('production')} 
      schema={schema} 
      onFieldChange={handleFieldChange} 
    />
  );
}
