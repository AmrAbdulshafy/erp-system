"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '../../../db';
import { useTranslation } from 'react-i18next';
import DocumentPrint from '../../../components/DocumentPrint';

export default function SalesInvoicePrint() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const searchParams = useSearchParams();
  const router = useRouter();
  const printRef = useRef(null);
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      const o = await db.sales_orders.get(orderId);
      if (!o) { setLoading(false); return; }
      setOrder(o);
      const its = await db.sales_items
        .where('sales_order_id').equals(orderId)
        .filter(i => !i.deleted_at).toArray();

      // Check if any items have images; if not, check linked quotation or matching customer quotation
      const hasImages = its.some(i => {
        if (!i.image_data) return false;
        try {
          const parsed = JSON.parse(i.image_data);
          return Array.isArray(parsed) ? parsed.length > 0 : !!parsed;
        } catch {
          return true;
        }
      });

      if (!hasImages) {
        let qItems = [];
        if (o.quotation_id) {
          qItems = await db.quotation_items.where('quotation_id').equals(o.quotation_id).toArray();
        } else if (o.customer_id) {
          const quotes = await db.quotations.where('customer_id').equals(o.customer_id).toArray();
          for (const q of quotes) {
            const found = await db.quotation_items.where('quotation_id').equals(q.id).toArray();
            if (found.some(f => f.image_data)) {
              qItems = found;
              break;
            }
          }
        }
        if (qItems.length > 0) {
          its.forEach((it, idx) => {
            const match = qItems.find(qi => qi.product_name === it.product_name && qi.image_data) || qItems[idx];
            if (match && match.image_data) {
              it.image_data = match.image_data;
            }
          });
        }
      }

      setItems(its);
      if (o.customer_id) setCustomer(await db.customers.get(o.customer_id));
      if (o.employee_id) setEmployee(await db.employees.get(o.employee_id));
      setLoading(false);
    })();
  }, [orderId]);

  const handlePDF = async () => {
    const { exportToPDF } = await import('../../../utils/pdfExport');
    await exportToPDF(printRef.current, `Invoice_${order?.id?.slice(0, 8).toUpperCase()}.pdf`);
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '1.1rem', color: '#6b7280' }}>{t('loading')}</div>;
  if (!order) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><button onClick={() => router.push('/sales')}>{t('back')}</button></div>;

  return (
    <DocumentPrint
      docRef={printRef}
      docType="INVOICE"
      docNumber={order.id?.slice(0, 8).toUpperCase()}
      docDate={new Date(order.order_date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}
      status={order.payment_status}
      billTo={{
        name: customer?.customer_name,
        phone: customer?.phone,
        address: customer?.address
      }}
      preparedBy={{
        name: employee?.full_name,
        phone: employee?.mobile_number
      }}
      items={items}
      notes={order.notes}
      discountAmount={order.discount_amount}
      discountPercent={order.discount_percent}
      amountPaid={order.amount_paid}
      remainingAmount={order.remaining_amount}
      onBack={() => router.push('/sales')}
      onPrint={() => window.print()}
      onPDF={handlePDF}
    />
  );
}
