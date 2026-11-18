"use client";

import { useTranslation } from 'react-i18next';
import DynamicCRUD from '../../components/DynamicCRUD';
import { db } from '../../db';
import { useDialog } from '../../components/DialogProvider';
import { deductWorkOrderBOM, revertWorkOrderBOM } from '../../utils/bomDeduction';
import { CheckCircle2, PackageCheck, RotateCcw, AlertTriangle } from 'lucide-react';

export default function WorkOrders() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dialog = useDialog();

  const schema = [
    { key: 'sales_order_id', label: 'sales_order', type: 'relation', relationTable: 'sales_orders', relationLabel: 'id', required: true },
    { key: 'employee_1', label: 'assigned_crew', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', required: true },
    { key: 'employee_2', label: 'employee_2', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', hideInTable: true },
    { key: 'employee_3', label: 'employee_3', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', hideInTable: true },
    { key: 'employee_4', label: 'employee_4', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', hideInTable: true },
    { key: 'employee_5', label: 'employee_5', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', hideInTable: true },
    { key: 'employee_6', label: 'employee_6', type: 'relation', relationTable: 'employees', relationLabel: 'full_name', hideInTable: true },
    { key: 'status', label: 'status', type: 'select', options: ['PENDING', 'IN_PROGRESS', 'COMPLETED'], required: true },
    { key: 'start_date', label: 'start_date', type: 'date' },
    { key: 'end_date', label: 'end_date', type: 'date' }
  ];

  const handleCompleteAndDeduct = async (record) => {
    const confirm = await dialog.confirm({
      title: isRTL ? 'إنهاء أمر الشغل وصرف الخامات (BOM)' : 'Complete Order & Deduct BOM',
      message: isRTL 
        ? 'هل تريد بالتأكيد إنهاء أمر الشغل هذا وخصم الخامات المرتبطة تلقائياً من رصيد المخزن؟'
        : 'Are you sure you want to mark this work order as COMPLETED and automatically deduct linked materials from inventory?',
      variant: 'primary'
    });

    if (!confirm) return;

    try {
      const bomRes = await deductWorkOrderBOM({ ...record, status: 'COMPLETED' });

      if (!bomRes.success) {
        dialog.alert({
          variant: 'warning',
          title: isRTL ? 'تعذر خصم الخامات' : 'Cannot Deduct Materials',
          message: bomRes.reason === 'no_quantity'
            ? 'معرفتش أحسب الخامات — الكمية مش محددة'
            : (bomRes.message || (isRTL ? 'تعذر حساب أو خصم الخامات لهذا الأمر.' : 'Could not calculate or deduct materials.'))
        });
        return;
      }

      const now = new Date().toISOString();
      await db.work_orders.update(record.id, {
        status: 'COMPLETED',
        end_date: now.split('T')[0],
        updated_at: now,
        sync_status: 'MODIFIED'
      });

      const detailsLines = (bomRes.materials || []).map(
        m => `- ${m.deducted} ${m.unit || ''} (${m.name}) — المتبقي: ${m.remaining} ${m.unit || ''}`
      ).join('\n');

      if (bomRes.insufficientStock) {
        dialog.alert({
          variant: 'warning',
          title: 'المخزون مش كافي',
          message: `المخزون مش كافي\nتم تسجيل الرصيد بالسالب للخامات التالية:\n${detailsLines}`
        });
      } else {
        dialog.alert({
          variant: 'success',
          title: isRTL ? 'تم إنهاء الأمر وصرف الخامات بنجاح' : 'Order Completed & BOM Deducted',
          message: isRTL
            ? `تم الخصم التلقائي من المخزن:\n${detailsLines}`
            : `Deducted from inventory:\n${detailsLines}`
        });
      }
    } catch (err) {
      console.error('Complete and deduct error:', err);
      dialog.alert({
        variant: 'error',
        message: err?.message || (isRTL ? 'حدث خطأ أثناء صرف الخامات.' : 'Error deducting raw materials.')
      });
    }
  };

  const customActions = [
    {
      label: isRTL ? 'إنهاء أمر الشغل وصرف الخامات تلقائياً (BOM)' : 'Complete & Deduct BOM',
      icon: <PackageCheck size={16} />,
      color: '#10B981',
      onClick: (record) => {
        if (record.status === 'COMPLETED' && record.bom_deducted) {
          const movLines = Array.isArray(record.bom_movements) && record.bom_movements.length > 0
            ? record.bom_movements.map(m => `- ${m.material_name || m.material_id}: ${m.deducted_quantity}`).join('\n')
            : (isRTL ? 'تم تسجيل حركة الخصم.' : 'Deduction movement recorded.');
          dialog.alert({
            variant: 'info',
            title: isRTL ? 'خامات أمر الشغل' : 'BOM Status',
            message: isRTL
              ? `تم صرف الخامات مسبقاً لهذا الأمر:\n${movLines}`
              : `BOM already deducted:\n${movLines}`
          });
        } else {
          handleCompleteAndDeduct(record);
        }
      }
    }
  ];

  return (
    <DynamicCRUD 
      tableName="work_orders" 
      title={t('work_orders')} 
      schema={schema}
      customActions={customActions}
    />
  );
}
