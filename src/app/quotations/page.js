"use client";

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import { ShoppingCart, FileText } from 'lucide-react';
import TransactionCRUD from '../../components/TransactionCRUD';
import { useDialog } from '../../components/DialogProvider';
import { recordStockMovement, getEffectiveMaterialRate } from '../../utils/inventoryMovements';

export default function Quotations() {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const schema = [
    { key: 'customer_id', label: 'customer', type: 'relation', relationTable: 'customers', relationLabel: 'customer_name', required: true },
    { key: 'employee_id', label: 'employee', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', required: true },
    { key: 'quote_date', label: 'quote_date', type: 'date', required: true },
    { key: 'status', label: 'status', type: 'select', options: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'], required: true },
    { key: 'discount_amount', label: 'discount_amount', type: 'number', isCurrency: true, showTotal: true },
    { key: 'total_amount', label: 'total_amount', type: 'number', isCurrency: true, showTotal: true },
    { key: 'notes', label: 'notes', type: 'text' }
  ];

  const router = useRouter();
  const dialog = useDialog();

  const convertToSalesOrder = async (quote) => {
    if (isSaving || isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const existingOrder = await db.sales_orders
        .filter(so => !so.deleted_at && so.quotation_id === quote.id)
        .first();
      if (existingOrder) {
        await dialog.alert({ variant: 'warning', message: 'اتحوّل قبل كده' });
        return;
      }

      const ok = await dialog.confirm({
        title: t('convert_sales_title'),
        message: t('confirm_convert_sales'),
        confirmText: t('convert'),
      });
      if (!ok) return;

      const recheckOrder = await db.sales_orders
        .filter(so => !so.deleted_at && so.quotation_id === quote.id)
        .first();
      if (recheckOrder) {
        await dialog.alert({ variant: 'warning', message: 'اتحوّل قبل كده' });
        return;
      }

      const salesId = uuidv4();
      const now = new Date().toISOString();

      // 1. Fetch Quotation Items (!item.deleted_at) and calculate actual total_amount from active items
      const allQuoteItems = await db.quotation_items.where('quotation_id').equals(quote.id).toArray();
      const items = allQuoteItems.filter(item => !item.deleted_at);

      const allMaterials = await db.raw_materials.filter(m => !m.deleted_at).toArray();
      const materialByName = new Map(allMaterials.map(m => [m.material_name, m]));
      const materialById = new Map(allMaterials.map(m => [m.id, m]));

      // Validate and aggregate stock deductions by material_id (consistent with TransactionCRUD)
      const stockDeductions = new Map();
      const salesItems = items.map(item => {
        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.unit_price) || 0;
        const totalPrice = item.total_price !== undefined && item.total_price !== null && item.total_price !== ''
          ? Number(item.total_price)
          : qty * unitPrice;
        let matId = item.material_id || item.raw_material_id || null;
        if (!matId && item.product_name && materialByName.has(item.product_name)) {
          matId = materialByName.get(item.product_name).id;
        }
        if (matId && qty > 0) {
          const mat = materialById.get(matId);
          const rate = getEffectiveMaterialRate(mat, item.consumption_per_unit);
          stockDeductions.set(matId, (stockDeductions.get(matId) || 0) + (qty * rate));
        }
        return {
          id: uuidv4(),
          sales_order_id: salesId,
          material_id: matId,
          raw_material_id: matId,
          product_name: item.product_name,
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalPrice,
          image_data: item.image_data,
          deleted_at: null,
          sync_status: 'PENDING',
          created_at: now,
          updated_at: now
        };
      });

      // Verify sufficient stock before converting
      for (const [matId, deductQty] of stockDeductions.entries()) {
        const mat = materialById.get(matId);
        if (mat) {
          const currentStock = Number(mat.stock_quantity) || 0;
          if (currentStock - deductQty < 0) {
            await dialog.alert({
              variant: 'error',
              message: `الرصيد المتاح من ${mat.material_name} هو ${currentStock} فقط`
            });
            return;
          }
        }
      }

      const calculatedSubtotal = salesItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
      const discountAmount = Number(quote.discount_amount) || 0;
      const calculatedTotalAmount = Math.max(0, calculatedSubtotal - discountAmount);
      const amountPaid = 0;
      const remainingAmount = calculatedTotalAmount - amountPaid;

      // 2. Create Sales Order linked with quotation_id
      await db.sales_orders.add({
        id: salesId,
        quotation_id: quote.id,
        customer_id: quote.customer_id,
        employee_id: quote.employee_id,
        order_date: now.split('T')[0],
        amount_paid: amountPaid,
        remaining_amount: remainingAmount,
        payment_status: 'UNPAID',
        subtotal: calculatedSubtotal,
        discount_amount: discountAmount,
        discount_percent: quote.discount_percent || 0,
        total_amount: calculatedTotalAmount,
        stock_deducted: true,
        deleted_at: null,
        sync_status: 'PENDING',
        created_at: now,
        updated_at: now
      });

      // 3. Copy active items to sales_items and deduct inventory stock + log stock_movements
      if (salesItems.length > 0) {
        await db.sales_items.bulkAdd(salesItems);
      }

      const shortRef = `#${String(salesId).slice(0, 8).toUpperCase()}`;
      for (const [matId, deductQty] of stockDeductions.entries()) {
        const mat = materialById.get(matId);
        if (mat) {
          const currentStock = Number(mat.stock_quantity) || 0;
          const newStock = currentStock - deductQty;
          await db.raw_materials.update(matId, {
            stock_quantity: newStock,
            updated_at: now,
            sync_status: 'PENDING'
          });
          await recordStockMovement({
            material_id: matId,
            material_name: mat.material_name,
            movement_type: 'OUT',
            source: 'sales_order',
            reference_type: 'sales_order',
            reference_id: salesId,
            quantity: deductQty,
            direction: -1,
            stock_before: currentStock,
            stock_after: newStock,
            unit_cost: Number(mat.unit_price) || 0,
            movement_date: now.split('T')[0],
            notes: `صرف فاتورة مبيعات ${shortRef} (محولة من عرض سعر)`
          });
        }
      }

      // 4. Update customer account_balance by delta (newRemaining - 0) without Math.max clamping
      if (quote.customer_id) {
        const cust = await db.customers.get(quote.customer_id);
        if (cust) {
          await db.customers.update(quote.customer_id, {
            account_balance: (Number(cust.account_balance) || 0) + remainingAmount,
            updated_at: now,
            sync_status: 'PENDING'
          });
        }
      }

      await dialog.alert({ variant: 'success', message: t('convert_success') });
      router.push('/sales');
    } catch (err) {
      console.error(err);
      dialog.alert({ variant: 'error', message: t('convert_error') });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <TransactionCRUD 
      headerTable="quotations" 
      itemsTable="quotation_items" 
      foreignKeyName="quotation_id"
      title={t('quotations')} 
      headerSchema={schema} 
      customActions={[
        {
          label: t('print_pdf') || 'Print / Export PDF',
          icon: <FileText size={16} />,
          color: '#e5530a',
          onClick: (quote) => router.push(`/quotations/print?id=${quote.id}`)
        },
        {
          label: t('convert_to_sales') || 'Convert to Sales Order',
          icon: <ShoppingCart size={16} />,
          color: 'var(--success)',
          disabled: isSaving,
          onClick: convertToSalesOrder
        }
      ]}
    />
  );
}
