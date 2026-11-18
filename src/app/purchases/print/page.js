"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '../../../db';
import { useTranslation } from 'react-i18next';
import DocumentPrint from '../../../components/DocumentPrint';
import { useCompanyProfile } from '../../../utils/companyProfile';

export default function PurchaseOrderPrint() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { getDisplayName } = useCompanyProfile();
  const searchParams = useSearchParams();
  const router = useRouter();
  const printRef = useRef(null);
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const o = await db.purchase_orders.get(orderId);
      if (!o) { setLoading(false); return; }
      setOrder(o);
      const its = await db.purchase_items
        .where('purchase_order_id').equals(orderId)
        .filter(i => !i.deleted_at).toArray();
      setItems(its);
      if (o.supplier_id) setSupplier(await db.suppliers.get(o.supplier_id));
      setLoading(false);
    })();
  }, [orderId]);

  const handlePDF = async () => {
    const { exportToPDF } = await import('../../../utils/pdfExport');
    await exportToPDF(printRef.current, `PurchaseOrder_${order?.id?.slice(0, 8).toUpperCase()}.pdf`);
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '1.1rem', color: '#6b7280' }}>{t('loading')}</div>;
  if (!order) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><button onClick={() => router.push('/purchases')}>{t('back')}</button></div>;

  return (
    <DocumentPrint
      docRef={printRef}
      docType="PURCHASE_ORDER"
      docNumber={order.id?.slice(0, 8).toUpperCase()}
      docDate={new Date(order.order_date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}
      status={order.payment_status}
      billTo={{
        name: supplier?.supplier_name,
        phone: supplier?.phone,
        address: supplier?.address
      }}
      preparedBy={{
        name: getDisplayName(isRTL),
        phone: ''
      }}
      items={items}
      notes={order.notes}
      amountPaid={order.amount_paid}
      remainingAmount={order.remaining_amount}
      onBack={() => router.push('/purchases')}
      onPrint={() => window.print()}
      onPDF={handlePDF}
    />
  );
}
