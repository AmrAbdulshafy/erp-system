"use client";

import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';

export default function QuotationItems() {
  const { t } = useTranslation();

  const schema = [
    { key: 'quotation_id', label: 'quotation', type: 'relation', relationTable: 'quotations', relationLabel: 'id', required: true },
    { key: 'product_name', label: 'product_name', type: 'text', required: true },
    { key: 'quantity', label: 'quantity', type: 'number', required: true },
    { key: 'unit_price', label: 'unit_price', type: 'number', required: true, isCurrency: true },
    { key: 'total_price', label: 'total_price', type: 'number', isCurrency: true, showTotal: true, readOnly: true },
    { key: 'image_data', label: 'image', type: 'multi_image' }
  ];

  return <DynamicCRUD tableName="quotation_items" title={t('quotation_items')} schema={schema} />;
}
