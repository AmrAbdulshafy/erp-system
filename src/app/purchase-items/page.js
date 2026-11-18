"use client";

import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';

export default function PurchaseOrderItems() {
  const { t } = useTranslation();

  const schema = [
    { key: 'purchase_order_id', label: 'purchase_order_id', type: 'relation', relationTable: 'purchase_orders', relationLabel: 'id', required: true },
    { key: 'raw_material_id', label: 'raw_material', type: 'relation', relationTable: 'raw_materials', relationLabel: 'material_name', required: true },
    { key: 'quantity', label: 'quantity', type: 'number', required: true },
    { key: 'unit_price', label: 'unit_price', type: 'number', required: true, isCurrency: true },
    { key: 'total_price', label: 'total_price', type: 'number', isCurrency: true, showTotal: true, readOnly: true }
  ];

  return <DynamicCRUD tableName="purchase_items" title={t('purchase_items')} schema={schema} />;
}
