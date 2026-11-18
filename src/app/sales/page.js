"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { ClipboardList, FileText, Truck, HandCoins } from 'lucide-react';
import TransactionCRUD from '../../components/TransactionCRUD';
import { useDialog } from '../../components/DialogProvider';
import { PaymentVoucherModal } from '../../components/AccountStatementModal';

export default function SalesOrders() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const router = useRouter();
  const dialog = useDialog();
  const [voucherOrder, setVoucherOrder] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const schema = [
    { key: 'customer_id', label: 'customer_name', type: 'relation', relationTable: 'customers', relationLabel: 'customer_name', required: true },
    { key: 'employee_id', label: 'employee', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', required: true },
    { key: 'order_date', label: 'order_date', type: 'date', required: true },
    { key: 'discount_amount', label: 'discount_amount', type: 'number', isCurrency: true, showTotal: true },
    { key: 'total_amount', label: 'total_amount', type: 'number', isCurrency: true, readOnly: true, showTotal: true },
    { key: 'amount_paid', label: 'amount_paid', type: 'number', required: true, isCurrency: true, showTotal: true },
    { key: 'remaining_amount', label: 'remaining_amount', type: 'computed', isCurrency: true, readOnly: true, showTotal: true },
    { key: 'payment_status', label: 'payment_status', type: 'select', options: ['PAID', 'UNPAID', 'PARTIAL'], required: true }
  ];

  const convertToWorkOrder = async (salesOrder) => {
    const ok = await dialog.confirm({
      title: t('convert_work_title'),
      message: t('confirm_convert_work'),
      confirmText: t('convert'),
    });
    if (!ok) return;

    try {
      const existingWO = await db.work_orders
        .filter(wo => !wo.deleted_at && wo.sales_order_id === salesOrder.id)
        .first();
      if (existingWO) {
        await dialog.alert({ variant: 'warning', message: 'اتحوّل قبل كده' });
        return;
      }

      const items = await db.sales_items
        .where('sales_order_id')
        .equals(salesOrder.id)
        .filter(i => !i.deleted_at)
        .toArray();
      const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const itemNames = items.map(i => i.product_name).filter(Boolean).join('، ');

      await db.work_orders.add({
        id: uuidv4(),
        sales_order_id: salesOrder.id,
        product_name: itemNames || null,
        item_name: itemNames || null,
        quantity: totalQty > 0 ? totalQty : 1,
        employee_1: salesOrder.employee_id || null,
        employee_2: null,
        employee_3: null,
        employee_4: null,
        employee_5: null,
        employee_6: null,
        status: 'PENDING',
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        sync_status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await dialog.alert({ variant: 'success', message: t('convert_work_success') });
      router.push('/work-orders');
    } catch (err) {
      console.error(err);
      dialog.alert({ variant: 'error', message: t('convert_error') });
    }
  };

  return (
    <>
      <TransactionCRUD
        key={refreshKey}
        headerTable="sales_orders"
        itemsTable="sales_items"
        foreignKeyName="sales_order_id"
        title={t('sales_orders')}
        headerSchema={schema}
        customActions={[
          {
            label: isRTL ? 'سند قبض / تحصيل دفعة (Receipt Voucher)' : 'Record Receipt Voucher',
            icon: <HandCoins size={16} />,
            color: '#10b981',
            onClick: (order) => setVoucherOrder(order)
          },
          {
            label: t('print_invoice') || 'Print Invoice / PDF',
            icon: <FileText size={16} />,
            color: '#e5530a',
            onClick: (order) => router.push(`/sales/print?id=${order.id}`)
          },
          {
            label: t('convert_to_work_order') || 'Convert to Work Order',
            icon: <ClipboardList size={16} />,
            color: 'var(--accent)',
            onClick: convertToWorkOrder
          },
          {
            label: t('shipping') || 'Shipping & Delivery',
            icon: <Truck size={16} />,
            color: '#10B981',
            onClick: (order) => router.push(`/shipping?sales_order_id=${order.id}`)
          }
        ]}
      />

      <PaymentVoucherModal
        isOpen={Boolean(voucherOrder)}
        onClose={() => setVoucherOrder(null)}
        voucherType="RECEIPT"
        entityType="customer"
        entityId={voucherOrder?.customer_id}
        referenceType="sales_order"
        referenceId={voucherOrder?.id}
        defaultAmount={Math.max(0, (Number(voucherOrder?.total_amount) || 0) - (Number(voucherOrder?.amount_paid) || 0))}
        onSuccess={() => setRefreshKey(k => k + 1)}
      />
    </>
  );
}
