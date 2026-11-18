"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, HandCoins } from 'lucide-react';
import DynamicCRUD from '../../components/DynamicCRUD';
import AccountStatementModal, { PaymentVoucherModal } from '../../components/AccountStatementModal';

export default function Suppliers() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [statementSupplier, setStatementSupplier] = useState(null);
  const [voucherSupplier, setVoucherSupplier] = useState(null);

  const schema = [
    { key: 'supplier_name', label: 'supplier_name', type: 'text', required: true },
    { key: 'contact_person', label: 'contact_person', type: 'text' },
    { key: 'mobile_number', label: 'mobile', type: 'text' },
    { key: 'account_balance', label: 'account_balance', type: 'number', isCurrency: true, showTotal: true }
  ];

  return (
    <>
      <DynamicCRUD
        tableName="suppliers"
        title={t('suppliers')}
        schema={schema}
        customActions={[
          {
            label: isRTL ? 'كشف حساب المورد التفصيلي (Account Statement)' : 'Supplier Account Statement',
            icon: <FileSpreadsheet size={16} />,
            color: '#2563eb',
            onClick: (supp) => setStatementSupplier(supp)
          },
          {
            label: isRTL ? 'إصدار سند صرف لمورد (Payment Voucher)' : 'Issue Payment Voucher',
            icon: <HandCoins size={16} />,
            color: '#f59e0b',
            onClick: (supp) => setVoucherSupplier(supp)
          }
        ]}
      />

      <AccountStatementModal
        isOpen={Boolean(statementSupplier)}
        onClose={() => setStatementSupplier(null)}
        entityType="supplier"
        entity={statementSupplier}
      />

      <PaymentVoucherModal
        isOpen={Boolean(voucherSupplier)}
        onClose={() => setVoucherSupplier(null)}
        voucherType="PAYMENT"
        entityType="supplier"
        entityId={voucherSupplier?.id}
        entityName={voucherSupplier?.supplier_name || ''}
        defaultAmount={Number(voucherSupplier?.account_balance) > 0 ? Number(voucherSupplier.account_balance) : 0}
      />
    </>
  );
}
