"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, HandCoins } from 'lucide-react';
import DynamicCRUD from '../../components/DynamicCRUD';
import AccountStatementModal, { PaymentVoucherModal } from '../../components/AccountStatementModal';

export default function Customers() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [statementCustomer, setStatementCustomer] = useState(null);
  const [voucherCustomer, setVoucherCustomer] = useState(null);

  const schema = [
    { key: 'customer_name', label: 'customer_name', type: 'text', required: true },
    { key: 'company_name', label: 'company_name', type: 'text' },
    { key: 'mobile_number', label: 'mobile', type: 'text' },
    { key: 'address', label: 'address', type: 'textarea' },
    { key: 'account_balance', label: 'account_balance', type: 'number', isCurrency: true, showTotal: true }
  ];

  return (
    <>
      <DynamicCRUD
        tableName="customers"
        title={t('customers')}
        schema={schema}
        customActions={[
          {
            label: isRTL ? 'كشف حساب العميل التفصيلي (Account Statement)' : 'Customer Account Statement',
            icon: <FileSpreadsheet size={16} />,
            color: '#2563eb',
            onClick: (cust) => setStatementCustomer(cust)
          },
          {
            label: isRTL ? 'إصدار سند قبض نقدية (Receipt Voucher)' : 'Issue Receipt Voucher',
            icon: <HandCoins size={16} />,
            color: '#10b981',
            onClick: (cust) => setVoucherCustomer(cust)
          }
        ]}
      />

      <AccountStatementModal
        isOpen={Boolean(statementCustomer)}
        onClose={() => setStatementCustomer(null)}
        entityType="customer"
        entity={statementCustomer}
      />

      <PaymentVoucherModal
        isOpen={Boolean(voucherCustomer)}
        onClose={() => setVoucherCustomer(null)}
        voucherType="RECEIPT"
        entityType="customer"
        entityId={voucherCustomer?.id}
        entityName={voucherCustomer?.customer_name || ''}
        defaultAmount={Number(voucherCustomer?.account_balance) > 0 ? Number(voucherCustomer.account_balance) : 0}
      />
    </>
  );
}
