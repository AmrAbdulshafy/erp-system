"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '../../../db';
import DocumentPrint from '../../../components/DocumentPrint';

export default function QuotationPrint() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const searchParams = useSearchParams();
  const router = useRouter();
  const printRef = useRef(null);
  const quoteId = searchParams.get('id');

  const [quote, setQuote] = useState(null);
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quoteId) return;
    (async () => {
      const q = await db.quotations.get(quoteId);
      if (!q) { setLoading(false); return; }
      setQuote(q);
      const its = await db.quotation_items
        .where('quotation_id').equals(quoteId)
        .filter(i => !i.deleted_at).toArray();
      setItems(its);
      if (q.customer_id) setCustomer(await db.customers.get(q.customer_id));
      if (q.employee_id) setEmployee(await db.employees.get(q.employee_id));
      setLoading(false);
    })();
  }, [quoteId]);

  const handlePDF = async () => {
    const { exportToPDF } = await import('../../../utils/pdfExport');
    await exportToPDF(printRef.current, `Quotation_${quote?.id?.slice(0, 8).toUpperCase()}.pdf`);
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: '1.1rem', color: '#6b7280' }}>{t('loading') || 'Loading...'}</div>;
  if (!quote) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><button onClick={() => router.push('/quotations')}>{t('back') || 'Back'}</button></div>;

  return (
    <DocumentPrint
      docRef={printRef}
      docType="QUOTATION"
      docNumber={quote.id?.slice(0, 8).toUpperCase()}
      docDate={new Date(quote.quote_date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}
      status={quote.status}
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
      notes={quote.notes}
      discountAmount={quote.discount_amount}
      discountPercent={quote.discount_percent}
      onBack={() => router.push('/quotations')}
      onPrint={() => window.print()}
      onPDF={handlePDF}
    />
  );
}
