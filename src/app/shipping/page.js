"use client";

import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import DynamicCRUD from '../../components/DynamicCRUD';

function ShippingContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const soParam = searchParams.get('sales_order_id') || '';

  const schema = [
    { key: 'sales_order_id', label: 'sales_order_id', type: 'relation', relationTable: 'sales_orders', relationLabel: 'id', required: true },
    { key: 'driver_name', label: 'driver_name', type: 'text', required: true },
    { key: 'bill_of_lading_number', label: 'bill_of_lading_number', type: 'text' },
    { key: 'shipping_date', label: 'shipping_date', type: 'date', required: true },
    { key: 'shipping_status', label: 'shipping_status', type: 'select', options: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'], required: true },
    { key: 'delivery_address', label: 'delivery_address', type: 'text' },
    { key: 'shipping_cost', label: 'shipping_cost', type: 'number', isCurrency: true, showTotal: true }
  ];

  return (
    <DynamicCRUD 
      tableName="shipping_orders" 
      title={t('shipping')} 
      schema={schema} 
      defaultValues={{ sales_order_id: soParam }}
    />
  );
}

export default function ShippingOrders() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShippingContent />
    </Suspense>
  );
}
