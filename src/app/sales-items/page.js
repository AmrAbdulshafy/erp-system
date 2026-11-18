"use client";

import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';

export default function SalesOrderItems() {
  const { t } = useTranslation();

  const schema = [
    { key: 'sales_order_id', label: 'sales_order_id', type: 'relation', relationTable: 'sales_orders', relationLabel: 'id', required: true },
    { key: 'product_name', label: 'product_name', type: 'text', required: true },
    { key: 'quantity', label: 'quantity', type: 'number', required: true, showTotal: true },
    { key: 'unit_price', label: 'unit_price', type: 'number', required: true, isCurrency: true },
    { key: 'total_price', label: 'total_price', type: 'number', readOnly: true, isCurrency: true, showTotal: true } // Auto-calculates in DynamicCRUD if quantity and rate_per_piece are present. Wait, DynamicCRUD hardcoded 'quantity' and 'rate_per_piece'. I should update DynamicCRUD to support this!
  ];

  return <DynamicCRUD tableName="sales_items" title={t('sales_items')} schema={schema} />;
}
