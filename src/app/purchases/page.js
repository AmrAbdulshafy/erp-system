"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { FileText, HandCoins } from 'lucide-react';
import TransactionCRUD from '../../components/TransactionCRUD';
import { PaymentVoucherModal } from '../../components/AccountStatementModal';

export default function PurchaseOrders() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const router = useRouter();
  const [voucherPO, setVoucherPO] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const schema = [
    { key: 'supplier_id', label: 'supplier_name', type: 'relation', relationTable: 'suppliers', relationLabel: 'supplier_name', required: true },
    { key: 'order_date', label: 'order_date', type: 'date', required: true },
    { key: 'discount_amount', label: 'discount_amount', type: 'number', isCurrency: true, showTotal: true },
    { key: 'total_amount', label: 'total_amount', type: 'number', isCurrency: true, readOnly: true, showTotal: true },
    { key: 'amount_paid', label: 'amount_paid', type: 'number', required: true, isCurrency: true, showTotal: true },
    { key: 'remaining_amount', label: 'remaining_amount', type: 'computed', isCurrency: true, readOnly: true, showTotal: true },
    { key: 'payment_status', label: 'payment_status', type: 'select', options: ['PAID', 'UNPAID', 'PARTIAL'], required: true }
  ];

  return (
    <>
      <TransactionCRUD
        key={refreshKey}
        headerTable="purchase_orders"
        itemsTable="purchase_items"
        foreignKeyName="purchase_order_id"
        title={t('purchase_orders')}
        headerSchema={schema}
        customActions={[
          {
            label: isRTL ? 'سند صرف / سداد دفعة للمورد (Payment Voucher)' : 'Record Payment Voucher',
            icon: <HandCoins size={16} />,
            color: '#f59e0b',
            onClick: (po) => setVoucherPO(po)
          },
          {
            label: t('print_po') || 'Print Purchase Order / PDF',
            icon: <FileText size={16} />,
            color: '#e5530a',
            onClick: (po) => router.push(`/purchases/print?id=${po.id}`)
          }
        ]}
      />

      <PaymentVoucherModal
        isOpen={Boolean(voucherPO)}
        onClose={() => setVoucherPO(null)}
        voucherType="PAYMENT"
        entityType="supplier"
        entityId={voucherPO?.supplier_id}
        referenceType="purchase_order"
        referenceId={voucherPO?.id}
        defaultAmount={Math.max(0, (Number(voucherPO?.total_amount) || 0) - (Number(voucherPO?.amount_paid) || 0))}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />
    </>
  );
}
