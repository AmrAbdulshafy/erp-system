"use client";

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Plus, X, Trash2, Edit3, Printer, Download, Search, Save, Sparkles, Filter, Check, FileText, Eye, Users, Briefcase } from 'lucide-react';
import { useDialog } from './DialogProvider';
import { formatAmount } from '../utils/format';
import ImageModal from './ImageModal';
import EntityProfileModal, { ProfileLink } from './EntityProfileModal';
import RecordDetailModal from './RecordDetailModal';
import { TABLE_TO_ENTITY_TYPE } from '../utils/profileConstants';
import PageMetricCards from './PageMetricCards';
import { computeTableMetrics } from '../utils/tableMetrics';
import { deductWorkOrderBOM, revertWorkOrderBOM } from '../utils/bomDeduction';
import { recordStockMovement, getEffectiveMaterialRate, recalculateParentInvoiceFromItems } from '../utils/inventoryMovements';
import { hashPassword, isSha256Hex } from '../context/AuthContext';
import { useCompanyProfile } from '../utils/companyProfile';
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

const isSensitiveField = (field) =>
  field.type === 'password' || field.key === 'password_hash' || field.key === 'pin_code';

const PACKAGING_PALETTE = [
  { name: 'Brown Kraft', nameAr: 'كرافت بني طبيعي', hex: '#B8860B' },
  { name: 'Light Kraft', nameAr: 'كرافت فاتح', hex: '#D2B48C' },
  { name: 'White Duplex', nameAr: 'دوبلكس أبيض', hex: '#FFFFFF', border: true },
  { name: 'Jet Black', nameAr: 'أسود كربوني', hex: '#1A1A1A' },
  { name: 'Cyan Flexo', nameAr: 'أزرق سايان', hex: '#00A3E0' },
  { name: 'Magenta Flexo', nameAr: 'ماجنتا أحمر', hex: '#E4007F' },
  { name: 'Process Yellow', nameAr: 'أصفر', hex: '#FACC15' },
  { name: 'Forest Green', nameAr: 'أخضر', hex: '#16A34A' },
  { name: 'Royal Blue', nameAr: 'أزرق ملكي', hex: '#2563EB' },
  { name: 'Flame Red', nameAr: 'أحمر ناري', hex: '#DC2626' },
  { name: 'Industrial Gray', nameAr: 'رمادي', hex: '#9CA3AF' }
];

// schema: [{ key, label, type (text, number, select, checkbox, relation, date, textarea, dimensions, thickness, color_palette), required, options, relationTable, relationLabel, isCurrency, allowCustom }]
export default function DynamicCRUD({ 
  tableName, 
  title, 
  schema, 
  customActions = [], 
  onFieldChange, 
  customModalRender, 
  defaultValues = {},
  metricCards
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dialog = useDialog();
  const { getDisplayName } = useCompanyProfile();
  
  // Dynamically load the main table data
  const data = useLiveQuery(() => db[tableName].filter(r => !r.deleted_at).toArray(), [tableName]);
  
  // We need to fetch all tables that might be relations to populate dropdowns
  // To avoid complex hooks, we'll just fetch the entire db context dynamically for relations
  const relationKeys = Array.from(new Set([
    ...schema.filter(f => f.type === 'relation').map(f => f.relationTable),
    ...(schema.some(f => f.relationTable === 'sales_orders') ? ['customers'] : [])
  ]));
  
  // Unfortunately useLiveQuery can't be called conditionally or in a loop.
  // But we can fetch all related tables in one query:
  const relationsData = useLiveQuery(async () => {
    const res = {};
    for (const rTable of relationKeys) {
      if (db[rTable]) {
        res[rTable] = await db[rTable].filter(r => !r.deleted_at).toArray();
      }
    }
    return res;
  }, [relationKeys.join(',')]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [formData, setFormData] = useState({});
  const [customFieldActive, setCustomFieldActive] = useState({});
  const [dimensionStates, setDimensionStates] = useState({});
  const [thicknessStates, setThicknessStates] = useState({});
  const [colorPaletteStates, setColorPaletteStates] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null); // { type, id }
  const [viewDetailRecord, setViewDetailRecord] = useState(null);
  const [workOrderEmpCount, setWorkOrderEmpCount] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setSelectedIds([]), 0);
    return () => clearTimeout(timer);
  }, [tableName]);

  const formDataRef = useRef({});
  const onFieldChangeRef = useRef(onFieldChange);
  useEffect(() => {
    onFieldChangeRef.current = onFieldChange;
  }, [onFieldChange]);

  const updateField = (key, value) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      formDataRef.current = next;
      return next;
    });

    if (onFieldChangeRef.current) {
      setTimeout(() => {
        if (onFieldChangeRef.current) {
          const current = { ...formDataRef.current, [key]: value };
          onFieldChangeRef.current(key, value, current, (updatedFields) => {
            setFormData(curr => {
              const merged = { ...curr, ...updatedFields };
              formDataRef.current = merged;
              return merged;
            });
          });
        }
      }, 0);
    }
  };

  const updateDimension = (fieldKey, part, val) => {
    setDimensionStates(prev => {
      const current = prev[fieldKey] || { length: '', width: '', height: '', unit: 'cm', mode: '3d' };
      const next = { ...current, [part]: val };
      
      if (next.mode === '3d') {
        const parts = [];
        if (next.length !== '') parts.push(next.length);
        if (next.width !== '') parts.push(next.width);
        if (next.height !== '') parts.push(next.height);
        const formatted = parts.length > 0 ? `${parts.join(' × ')} ${next.unit || 'cm'}`.trim() : '';
        updateField(fieldKey, formatted);
      }
      return { ...prev, [fieldKey]: next };
    });
  };

  const toggleDimensionMode = (fieldKey, mode) => {
    setDimensionStates(prev => {
      const current = prev[fieldKey] || { length: '', width: '', height: '', unit: 'cm', mode: '3d' };
      return { ...prev, [fieldKey]: { ...current, mode } };
    });
  };

  const updateThickness = (fieldKey, part, value) => {
    setThicknessStates(prev => {
      const current = prev[fieldKey] || { val: '', unit: 'GSM', mode: 'structured' };
      const next = { ...current, [part]: value };
      if (next.mode === 'structured') {
        const formatted = next.val !== '' ? `${next.val} ${next.unit || 'GSM'}`.trim() : '';
        updateField(fieldKey, formatted);
      }
      return { ...prev, [fieldKey]: next };
    });
  };

  const toggleThicknessMode = (fieldKey, mode) => {
    setThicknessStates(prev => {
      const current = prev[fieldKey] || { val: '', unit: 'GSM', mode: 'structured' };
      return { ...prev, [fieldKey]: { ...current, mode } };
    });
  };

  const updateColorPalette = (fieldKey, updates) => {
    setColorPaletteStates(prev => {
      const current = prev[fieldKey] || { hex: '#B8860B', name: '', printType: 'plain' };
      const next = { ...current, ...updates };
      
      let formatted = (next.name || '').trim();
      if (formatted && next.hex) {
        if (!formatted.includes(next.hex)) {
          formatted = `${formatted} (${next.hex})`;
        }
      } else if (next.hex) {
        formatted = next.hex;
      }
      updateField(fieldKey, formatted);
      return { ...prev, [fieldKey]: next };
    });
  };

  const handleOpenModal = (record = null) => {
    const customActive = {};
    const parsedDims = {};
    const parsedThickness = {};
    const parsedColors = {};

    schema.forEach(field => {
      if (field.allowCustom) {
        const val = record ? record[field.key] : '';
        if (val && !field.options?.includes(val)) {
          customActive[field.key] = true;
        } else {
          customActive[field.key] = false;
        }
      }

      if (field.type === 'dimensions') {
        const str = String(record ? (record[field.key] || '') : '').trim();
        const match = str.match(/([0-9.]+)\s*[xX×*]\s*([0-9.]+)(?:\s*[xX×*]\s*([0-9.]+))?\s*([a-zA-Z\u0600-\u06FF]*)/);
        if (match) {
          parsedDims[field.key] = {
            length: match[1] || '',
            width: match[2] || '',
            height: match[3] || '',
            unit: match[4]?.trim() || 'cm',
            mode: '3d'
          };
        } else if (str) {
          parsedDims[field.key] = { length: '', width: '', height: '', unit: 'cm', mode: 'free' };
        } else {
          parsedDims[field.key] = { length: '', width: '', height: '', unit: 'cm', mode: '3d' };
        }
      }

      if (field.type === 'thickness') {
        const str = String(record ? (record[field.key] || '') : '').trim();
        const match = str.match(/^([0-9.]+)\s*(GSM|gsm|Micron|micron|µm|mm|Ply|ply|pt|PT)?$/i);
        if (match) {
          parsedThickness[field.key] = {
            val: match[1] || '',
            unit: (match[2] || 'GSM').toUpperCase(),
            mode: 'structured'
          };
        } else if (str) {
          parsedThickness[field.key] = { val: str, unit: 'GSM', mode: 'free' };
        } else {
          parsedThickness[field.key] = { val: '', unit: 'GSM', mode: 'structured' };
        }
      }

      if (field.type === 'color_palette') {
        const str = String(record ? (record[field.key] || '') : '').trim();
        const hexMatch = str.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
        parsedColors[field.key] = {
          hex: hexMatch ? hexMatch[0] : '#B8860B',
          name: str.replace(/\s*\(#.*?\)\s*/, '').trim() || '',
          printType: str.toLowerCase().includes('print') || str.includes('طباعة') ? 'custom_print' : 'plain'
        };
      }
    });

    setCustomFieldActive(customActive);
    setDimensionStates(parsedDims);
    setThicknessStates(parsedThickness);
    setColorPaletteStates(parsedColors);

    if (tableName === 'work_orders') {
      const activeCount = [6, 5, 4, 3, 2, 1].find(i => Boolean(record?.[`employee_${i}`])) || 1;
      setWorkOrderEmpCount(activeCount);
    }

    if (record) {
      const rec = { ...record };
      schema.forEach(field => {
        if (field.type === 'password' || field.key === 'password_hash') {
          rec[field.key] = '';
        }
      });
      if (rec.vehicle_number && !rec.bill_of_lading_number) {
        rec.bill_of_lading_number = rec.vehicle_number;
      }
      setFormData(rec);
      formDataRef.current = rec;
      if (onFieldChangeRef.current) {
        setTimeout(() => {
          if (onFieldChangeRef.current) {
            onFieldChangeRef.current('__init__', record, record, (updatedFields) => {
              setFormData(curr => {
                const merged = { ...curr, ...updatedFields };
                formDataRef.current = merged;
                return merged;
              });
            });
          }
        }, 0);
      }
    } else {
      const initial = { id: '', ...(defaultValues || {}) };
      schema.forEach(field => {
        if (initial[field.key] !== undefined && initial[field.key] !== '') return;
        if (field.type === 'checkbox') initial[field.key] = field.default !== undefined ? field.default : 1;
        else if (field.type === 'number') initial[field.key] = 0;
        else if (field.type === 'date') initial[field.key] = new Date().toISOString().split('T')[0];
        else if (field.type === 'time' && field.default) initial[field.key] = field.default;
        else initial[field.key] = '';
      });
      setFormData(initial);
      formDataRef.current = initial;
      if (onFieldChangeRef.current) {
        setTimeout(() => {
          if (onFieldChangeRef.current) {
            onFieldChangeRef.current('__init__', initial, initial, (updatedFields) => {
              setFormData(curr => {
                const merged = { ...curr, ...updatedFields };
                formDataRef.current = merged;
                return merged;
              });
            });
          }
        }, 0);
      }
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving || isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    try {
    const now = new Date().toISOString();
    
    // Clean payload according to schema types
    const payload = { ...formData };
    schema.forEach(field => {
      if (field.type === 'number') payload[field.key] = parseFloat(payload[field.key]) || 0;
      if (field.type === 'checkbox') payload[field.key] = payload[field.key] ? 1 : 0;
    });

    // Handle special calculation triggers
    if (payload.quantity !== undefined && payload.rate_per_piece !== undefined) {
      payload.total_amount = (payload.quantity || 0) * (payload.rate_per_piece || 0);
    }
    if (payload.quantity !== undefined && payload.unit_price !== undefined) {
      payload.total_price = (payload.quantity || 0) * (payload.unit_price || 0);
    }
    if (tableName === 'payroll') {
      payload.net_pay = Math.round(((Number(payload.base_salary) || 0) + (Number(payload.production_bonus) || 0) - (Number(payload.deductions) || 0) - (Number(payload.loan_deductions) || 0)) * 100) / 100;

      // Prevent overlapping payroll records for the same employee (allow editing the same record id)
      const empId = payload.employee_id;
      const newStart = payload.period_start || payload.period_end || '';
      const newEnd = payload.period_end || payload.period_start || '';
      if (empId && newStart && newEnd) {
        const s1 = newStart <= newEnd ? newStart : newEnd;
        const e1 = newStart <= newEnd ? newEnd : newStart;
        const empPayrolls = await db.payroll
          .filter(r => !r.deleted_at && r.employee_id === empId && (!payload.id || r.id !== payload.id))
          .toArray();
        const overlappingRecord = empPayrolls.find(r => {
          const rStart = r.period_start || r.period_end || '';
          const rEnd = r.period_end || r.period_start || '';
          if (!rStart || !rEnd) return false;
          const s2 = rStart <= rEnd ? rStart : rEnd;
          const e2 = rStart <= rEnd ? rEnd : rStart;
          return s1 <= e2 && e1 >= s2;
        });

        if (overlappingRecord) {
          await dialog.alert({
            variant: 'danger',
            title: isRTL ? 'فترة راتب متداخلة' : 'Overlapping Payroll Period',
            message: `فيه راتب مسجّل للموظف ده في الفترة من ${overlappingRecord.period_start} إلى ${overlappingRecord.period_end}`
          });
          return;
        }
      }
    }
    if (tableName === 'employee_loans') {
      const loanAmt = Number(payload.loan_amount) || 0;
      const totalPaid = Number(payload.total_paid) || 0;
      payload.remaining_amount = Math.max(0, loanAmt - totalPaid);
      if (payload.remaining_amount <= 0 && loanAmt > 0) {
        payload.status = 'PAID';
      } else if (!payload.status) {
        payload.status = 'ACTIVE';
      }
    }

    const originalRecord = payload.id ? await db[tableName].get(payload.id) : null;

    if (tableName === 'purchase_items' || tableName === 'purchase_order_items' || tableName === 'sales_items' || tableName === 'sales_order_items') {
      const isPurchaseItem = tableName === 'purchase_items' || tableName === 'purchase_order_items';
      const matId = payload.raw_material_id || payload.material_id || originalRecord?.raw_material_id || originalRecord?.material_id;
      if (matId) {
        const material = await db.raw_materials.get(matId);
        if (material) {
          const rate = isPurchaseItem ? 1 : getEffectiveMaterialRate(material, payload.consumption_per_unit);
          const oldRate = isPurchaseItem ? 1 : getEffectiveMaterialRate(material, originalRecord?.consumption_per_unit);
          let diff = (Number(payload.quantity) || 0) * rate;
          if (originalRecord && !originalRecord.deleted_at) {
            diff -= ((Number(originalRecord.quantity) || 0) * oldRate);
          }
          if (Math.abs(diff) > 0.0001) {
            const stockDir = isPurchaseItem ? 1 : -1;
            const netDelta = diff * stockDir;
            const prevStock = Number(material.stock_quantity) || 0;
            const newStock = prevStock + netDelta;
            await db.raw_materials.update(material.id, {
              stock_quantity: newStock,
              sync_status: 'MODIFIED',
              updated_at: now
            });
            await recordStockMovement({
              material_id: material.id,
              material_name: material.material_name,
              movement_type: netDelta >= 0 ? 'IN' : 'OUT',
              source: isPurchaseItem ? 'purchase_order' : 'sales_order',
              reference_type: isPurchaseItem ? 'purchase_order' : 'sales_order',
              reference_id: payload.purchase_order_id || payload.sales_order_id || payload.id || null,
              quantity: Math.abs(netDelta),
              direction: netDelta >= 0 ? 1 : -1,
              stock_before: prevStock,
              stock_after: newStock,
              unit_cost: Number(material.unit_price) || 0,
              movement_date: now.split('T')[0],
              notes: isPurchaseItem ? 'تعديل مباشر في بنود المشتريات' : 'تعديل مباشر في بنود المبيعات'
            });
          }
        }
      }
    }

    if (payload.id) {
      // Update
      for (const field of schema) {
        if (field.type === 'password' || field.key === 'password_hash') {
          const val = String(payload[field.key] || '').trim();
          if (!val && originalRecord) {
            const origVal = String(originalRecord[field.key] || '');
            payload[field.key] = origVal && !isSha256Hex(origVal) ? await hashPassword(origVal) : origVal;
          } else if (val) {
            payload[field.key] = isSha256Hex(val) ? val : await hashPassword(val);
          }
        }
      }
      if (tableName === 'users' && (payload.id === 'usr-001-admin' || String(originalRecord?.username || '').toLowerCase() === 'admin')) {
        payload.role = 'ADMIN';
        payload.is_active = 1;
      }
      payload.updated_at = now;
      payload.sync_status = 'MODIFIED';
      await db[tableName].update(payload.id, payload);
      if (tableName === 'users' && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('permission-matrix-updated'));
      }

      if (tableName === 'raw_materials' && originalRecord) {
        const oldStock = Number(originalRecord.stock_quantity) || 0;
        const newStock = Number(payload.stock_quantity) || 0;
        const diff = newStock - oldStock;
        if (Math.abs(diff) > 0.0001) {
          await recordStockMovement({
            material_id: payload.id,
            material_name: payload.material_name || originalRecord.material_name || '',
            movement_type: 'ADJUSTMENT',
            source: 'manual_adjustment',
            reference_type: 'manual',
            reference_id: payload.id,
            quantity: Math.abs(diff),
            direction: diff >= 0 ? 1 : -1,
            stock_before: oldStock,
            stock_after: newStock,
            unit_cost: Number(payload.unit_price) || 0,
            movement_date: now.split('T')[0],
            notes: 'تسوية جردية يدوية لرصيد الخامة'
          });
        }
      }
    } else {
      // Create
      for (const field of schema) {
        if (field.type === 'password' || field.key === 'password_hash') {
          const val = String(payload[field.key] || '').trim();
          if (val && !isSha256Hex(val)) {
            payload[field.key] = await hashPassword(val);
          }
        }
      }
      payload.id = uuidv7();
      payload.created_at = now;
      payload.updated_at = now;
      payload.deleted_at = null;
      payload.sync_status = 'PENDING';
      await db[tableName].add(payload);

      if (tableName === 'raw_materials' && (Number(payload.stock_quantity) || 0) > 0) {
        const initQty = Number(payload.stock_quantity) || 0;
        await recordStockMovement({
          material_id: payload.id,
          material_name: payload.material_name || '',
          movement_type: 'IN',
          source: 'initial_stock',
          reference_type: 'manual',
          reference_id: payload.id,
          quantity: initQty,
          direction: 1,
          stock_before: 0,
          stock_after: initQty,
          unit_cost: Number(payload.unit_price) || 0,
          movement_date: now.split('T')[0],
          notes: 'رصيد افتتاحي عند إضافة الخامة'
        });
      }
    }

    // Recalculate parent invoice totals & customer/supplier balance if a line item was added/updated directly
    if (tableName === 'purchase_items' || tableName === 'purchase_order_items' || tableName === 'sales_items' || tableName === 'sales_order_items') {
      const fk = (tableName === 'purchase_items' || tableName === 'purchase_order_items') ? 'purchase_order_id' : 'sales_order_id';
      const newOrderId = payload[fk];
      const oldOrderId = originalRecord?.[fk];
      if (oldOrderId && oldOrderId !== newOrderId) {
        await recalculateParentInvoiceFromItems(tableName, oldOrderId, now);
      }
      if (newOrderId) {
        await recalculateParentInvoiceFromItems(tableName, newOrderId, now);
      }
    }

    // Special handling for shipping_orders -> link shipping_cost directly to db.expenses
    if (tableName === 'shipping_orders') {
      const shippingId = payload.id;
      const cost = Number(payload.shipping_cost) || 0;
      const soId = payload.sales_order_id;
      let soDisplay = '';
      let customerName = '';
      if (soId) {
        const so = await db.sales_orders.get(soId);
        if (so) {
          soDisplay = `#${String(so.id).slice(0, 8).toUpperCase()}`;
          if (so.customer_id) {
            const cust = await db.customers.get(so.customer_id);
            customerName = cust?.customer_name || '';
          }
        }
      }

      const deterministicId = `exp-shipping-${shippingId}`;
      const existingExpenses = await db.expenses
        .filter(e => e.id === deterministicId || (e.notes && e.notes.includes(`[SHIPPING:${shippingId}]`)))
        .toArray();
      const existingExp = existingExpenses[0];

      if (existingExp && existingExp.deleted_at) {
        // Respect soft-deleted expense: do nothing
      } else if (cost > 0) {
        const expenseData = {
          id: existingExp ? existingExp.id : deterministicId,
          category: 'SHIPPING',
          amount: cost,
          expense_date: payload.shipping_date || now.split('T')[0],
          notes: `[SHIPPING:${shippingId}] ${soId ? `[SO:${soId}] ` : ''}Shipping & Delivery for Sales Order ${soDisplay}${customerName ? ' (' + customerName + ')' : ''}${payload.driver_name ? ' - Driver: ' + payload.driver_name : ''}`,
          recorded_by: null,
          created_at: existingExp?.created_at || now,
          updated_at: now,
          deleted_at: null,
          sync_status: 'PENDING'
        };

        await db.expenses.put(expenseData);
      } else if (existingExp) {
        await db.expenses.update(existingExp.id, {
          deleted_at: now,
          sync_status: 'PENDING'
        });
      }
    }

    // Special handling for payroll -> only sync to db.expenses & deduct employee_loans when status === 'PAID'
    // Also records full earned wage (net_pay + loan_deductions) so loan repayments settled via salary are not lost from labor costs
    if (tableName === 'payroll') {
      const payrollId = payload.id;
      const isPaidStatus = String(payload.status || '').toUpperCase() === 'PAID';
      const wasPaidStatus = Boolean(originalRecord && !originalRecord.deleted_at && String(originalRecord.status || '').toUpperCase() === 'PAID');
      const netPay = Number(payload.net_pay) || 0;
      const loanDed = Number(payload.loan_deductions) || 0;
      const totalEarnedWage = Math.round((netPay + loanDed) * 100) / 100;
      const empId = payload.employee_id;
      let empName = '';
      if (empId) {
        const emp = await db.employees.get(empId);
        empName = emp?.full_name || '';
      }

      const deterministicId = `exp-payroll-${payrollId}`;
      const existingExpenses = await db.expenses
        .filter(e => e.id === deterministicId || (e.notes && e.notes.includes(`[PAYROLL:${payrollId}]`)))
        .toArray();
      const existingExp = existingExpenses[0];

      if (isPaidStatus && totalEarnedWage > 0) {
        const loanNote = loanDed > 0 ? ` [Net Cash: ${netPay} + Loan Settled: ${loanDed}]` : '';
        const expenseData = {
          id: existingExp ? existingExp.id : deterministicId,
          category: 'PAYROLL',
          amount: totalEarnedWage,
          expense_date: payload.period_end || payload.period_start || now.split('T')[0],
          notes: `[PAYROLL:${payrollId}] ${empId ? `[EMP:${empId}] ` : ''}Payroll for ${empName || 'Employee'} (${payload.period_start || ''} to ${payload.period_end || ''})${loanNote} - Status: PAID`,
          payroll_id: payrollId,
          linked_type: 'payroll',
          linked_id: payrollId,
          recorded_by: null,
          created_at: existingExp?.created_at || now,
          updated_at: now,
          deleted_at: null,
          sync_status: 'PENDING'
        };

        await db.expenses.put(expenseData);
      } else if (existingExp && !existingExp.deleted_at) {
        await db.expenses.update(existingExp.id, {
          deleted_at: now,
          sync_status: 'PENDING'
        });
      }

      // Automatically update employee_loans repayments ONLY when payroll is PAID (and revert if moved back to DRAFT/APPROVED)
      const effectiveCurrentLoanDed = isPaidStatus ? loanDed : 0;
      const effectivePrevLoanDed = wasPaidStatus ? (Number(originalRecord.loan_deductions) || 0) : 0;
      const diffLoanDed = effectiveCurrentLoanDed - effectivePrevLoanDed;

      if (diffLoanDed !== 0 && empId && db.employee_loans) {
        const activeLoans = await db.employee_loans
          .filter(l => !l.deleted_at && l.employee_id === empId && (l.status === 'ACTIVE' || l.status === 'PAID'))
          .toArray();

        let remainingDiff = diffLoanDed;
        for (const loan of activeLoans) {
          if (remainingDiff === 0) break;
          const currentTotalPaid = Number(loan.total_paid) || 0;
          const loanAmt = Number(loan.loan_amount) || 0;

          let step = 0;
          if (remainingDiff > 0) {
            const maxRepayable = Math.max(0, loanAmt - currentTotalPaid);
            step = Math.min(remainingDiff, maxRepayable);
            remainingDiff -= step;
          } else {
            step = Math.max(remainingDiff, -currentTotalPaid);
            remainingDiff -= step;
          }

          const newTotalPaid = Math.max(0, currentTotalPaid + step);
          const newRemaining = Math.max(0, loanAmt - newTotalPaid);
          const newStatus = newRemaining <= 0 ? 'PAID' : 'ACTIVE';

          await db.employee_loans.update(loan.id, {
            total_paid: newTotalPaid,
            remaining_amount: newRemaining,
            status: newStatus,
            sync_status: 'MODIFIED',
            updated_at: now
          });
        }
      }
    }

    // Special handling for owner_withdrawals -> automatically sync to db.expenses
    if (tableName === 'owner_withdrawals') {
      const withdrawalId = payload.id;
      const amt = Number(payload.amount) || 0;
      const deterministicId = `exp-withdrawal-${withdrawalId}`;
      const existingExpenses = await db.expenses
        .filter(e => e.id === deterministicId || (e.notes && e.notes.includes(`[OWNER_WITHDRAWAL:${withdrawalId}]`)))
        .toArray();
      const existingExp = existingExpenses[0];

      if (existingExp && existingExp.deleted_at) {
        // Respect soft-deleted expense: do nothing
      } else if (amt > 0) {
        const expenseData = {
          id: existingExp ? existingExp.id : deterministicId,
          category: 'PERSONAL',
          amount: amt,
          expense_date: payload.withdrawal_date || now.split('T')[0],
          notes: `[OWNER_WITHDRAWAL:${withdrawalId}] Owner Withdrawal: ${payload.owner_name || 'Owner'} (${payload.category || 'PERSONAL'})${payload.notes ? ' - ' + payload.notes : ''}`,
          recorded_by: null,
          created_at: existingExp?.created_at || now,
          updated_at: now,
          deleted_at: null,
          sync_status: 'PENDING'
        };

        await db.expenses.put(expenseData);
      } else if (existingExp) {
        await db.expenses.update(existingExp.id, {
          deleted_at: now,
          sync_status: 'PENDING'
        });
      }
    }

    // Special handling for work_orders -> Automated Raw Material Deduction (BOM) when COMPLETED
    if (tableName === 'work_orders') {
      if (payload.status === 'COMPLETED' && (!originalRecord || originalRecord.status !== 'COMPLETED' || !originalRecord.bom_deducted)) {
        try {
          const bomRes = await deductWorkOrderBOM({ ...payload, id: payload.id });
          if (!bomRes.success) {
            dialog.alert({
              variant: 'warning',
              title: isRTL ? 'تنبيه خصم الخامات (BOM)' : 'BOM Deduction Notice',
              message: bomRes.reason === 'no_quantity'
                ? 'معرفتش أحسب الخامات — الكمية مش محددة'
                : (bomRes.message || (isRTL ? 'تعذر خصم الخامات لهذا الأمر.' : 'Could not deduct materials for this work order.'))
            });
          } else {
            const detailsLines = (bomRes.materials || []).map(
              m => `- ${m.deducted} ${m.unit || ''} (${m.name}) — المتبقي: ${m.remaining} ${m.unit || ''}`
            ).join('\n');

            if (bomRes.insufficientStock) {
              dialog.alert({
                variant: 'warning',
                title: 'المخزون مش كافي',
                message: `المخزون مش كافي\nتم خصم الخامات وتسجيل الرصيد بالسالب:\n${detailsLines}`
              });
            } else {
              dialog.alert({
                variant: 'success',
                title: isRTL ? 'الخصم التلقائي للخامات (BOM)' : 'Automated BOM Deduction',
                message: isRTL
                  ? `تم إنهاء أمر الشغل وخصم الخامات من المخزن:\n${detailsLines}`
                  : `Work order completed and materials deducted:\n${detailsLines}`
              });
            }
          }
        } catch (bomErr) {
          console.error('BOM Deduction error:', bomErr);
        }
      } else if (payload.status !== 'COMPLETED' && originalRecord && originalRecord.status === 'COMPLETED' && originalRecord.bom_deducted) {
        try {
          await revertWorkOrderBOM(originalRecord);
        } catch (bomErr) {
          console.error('BOM Revert error:', bomErr);
        }
      }
    }

    setIsModalOpen(false);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (tableName === 'users') {
      const targetUser = await db.users.get(id);
      if (id === 'usr-001-admin' || String(targetUser?.username || '').toLowerCase() === 'admin') {
        dialog.alert({
          variant: 'error',
          message: i18n.language === 'ar' ? 'لا يمكن حذف الحساب الرئيسي لمدير النظام (admin).' : 'The primary system administrator account (admin) cannot be deleted.'
        });
        return;
      }
    }
    const ok = await dialog.confirm({
      variant: 'danger',
      title: t('delete_record_title'),
      message: t('confirm_delete_record'),
    });
    if (ok) {
      const now = new Date().toISOString();
      let parentOrderIdToRecalc = null;

      if (tableName === 'purchase_items' || tableName === 'purchase_order_items' || tableName === 'sales_items' || tableName === 'sales_order_items') {
        const isPurchaseItem = tableName === 'purchase_items' || tableName === 'purchase_order_items';
        const record = await db[tableName].get(id);
        if (record && !record.deleted_at) {
          parentOrderIdToRecalc = isPurchaseItem ? record.purchase_order_id : record.sales_order_id;
          const matId = record.raw_material_id || record.material_id;
          if (matId) {
            const material = await db.raw_materials.get(matId);
            if (material) {
              const rate = isPurchaseItem ? 1 : getEffectiveMaterialRate(material, record.consumption_per_unit);
              const revertDir = isPurchaseItem ? -1 : 1;
              const netDelta = (Number(record.quantity) || 0) * rate * revertDir;
              const prevStock = Number(material.stock_quantity) || 0;
              const newStock = prevStock + netDelta;
              await db.raw_materials.update(material.id, {
                stock_quantity: newStock,
                sync_status: 'MODIFIED',
                updated_at: now
              });
              await recordStockMovement({
                material_id: material.id,
                material_name: material.material_name,
                movement_type: netDelta >= 0 ? 'IN' : 'OUT',
                source: isPurchaseItem ? 'purchase_order_revert' : 'sales_order_revert',
                reference_type: isPurchaseItem ? 'purchase_order' : 'sales_order',
                reference_id: parentOrderIdToRecalc || id,
                quantity: Math.abs(netDelta),
                direction: netDelta >= 0 ? 1 : -1,
                stock_before: prevStock,
                stock_after: newStock,
                unit_cost: Number(material.unit_price) || 0,
                movement_date: now.split('T')[0],
                notes: isPurchaseItem ? 'حذف بند مشتريات مباشر' : 'حذف بند مبيعات مباشر'
              });
            }
          }
        }
      }

      if (tableName === 'work_orders') {
        const woRec = await db.work_orders?.get(id);
        if (woRec && woRec.status === 'COMPLETED' && woRec.bom_deducted) {
          try {
            await revertWorkOrderBOM(woRec);
          } catch (bomErr) {
            console.error('BOM Revert on delete error:', bomErr);
          }
        }
      }

      if (tableName === 'shipping_orders') {
        const deterministicId = `exp-shipping-${id}`;
        const linkedExpenses = await db.expenses
          .filter(e => !e.deleted_at && (e.id === deterministicId || e.shipping_order_id === id || (e.notes && e.notes.includes(`[SHIPPING:${id}]`))))
          .toArray();
        for (const exp of linkedExpenses) {
          await db.expenses.update(exp.id, {
            deleted_at: now,
            sync_status: 'PENDING'
          });
        }
      }

      if (tableName === 'payroll') {
        const payrollRec = await db.payroll?.get(id);
        if (payrollRec && String(payrollRec.status || '').toUpperCase() === 'PAID' && Number(payrollRec.loan_deductions) > 0 && payrollRec.employee_id && db.employee_loans) {
          const loans = await db.employee_loans
            .filter(l => !l.deleted_at && l.employee_id === payrollRec.employee_id)
            .toArray();
          let toRevert = Number(payrollRec.loan_deductions);
          for (const loan of loans) {
            if (toRevert <= 0) break;
            const currentTotalPaid = Number(loan.total_paid) || 0;
            const step = Math.min(toRevert, currentTotalPaid);
            toRevert -= step;
            const newTotalPaid = Math.max(0, currentTotalPaid - step);
            const newRemaining = Math.max(0, (Number(loan.loan_amount) || 0) - newTotalPaid);
            await db.employee_loans.update(loan.id, {
              total_paid: newTotalPaid,
              remaining_amount: newRemaining,
              status: newRemaining <= 0 ? 'PAID' : 'ACTIVE',
              sync_status: 'MODIFIED',
              updated_at: now
            });
          }
        }

        const deterministicId = `exp-payroll-${id}`;
        const linkedExpenses = await db.expenses
          .filter(e => !e.deleted_at && (e.id === deterministicId || e.payroll_id === id || (e.notes && e.notes.includes(`[PAYROLL:${id}]`))))
          .toArray();
        for (const exp of linkedExpenses) {
          await db.expenses.update(exp.id, {
            deleted_at: now,
            sync_status: 'PENDING'
          });
        }
      }

      if (tableName === 'owner_withdrawals') {
        const deterministicId = `exp-withdrawal-${id}`;
        const linkedExpenses = await db.expenses
          .filter(e => !e.deleted_at && (e.id === deterministicId || e.withdrawal_id === id || (e.notes && e.notes.includes(`[OWNER_WITHDRAWAL:${id}]`))))
          .toArray();
        for (const exp of linkedExpenses) {
          await db.expenses.update(exp.id, {
            deleted_at: now,
            sync_status: 'PENDING'
          });
        }
      }
      
      await db[tableName].update(id, {
        deleted_at: now,
        sync_status: 'DELETED'
      });
      if (tableName === 'users' && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('permission-matrix-updated'));
      }
      if (parentOrderIdToRecalc) {
        await recalculateParentInvoiceFromItems(tableName, parentOrderIdToRecalc, now);
      }
      setSelectedIds(prev => prev.filter(selId => selId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    const ok = await dialog.confirm({
      variant: 'danger',
      title: isRTL ? 'حذف السجلات المحددة' : 'Bulk Delete Records',
      message: isRTL 
        ? `هل أنت متأكد من رغبتك في حذف ${count} سجل محدد من جدول (${title})؟` 
        : `Are you sure you want to delete ${count} selected records from ${title}?`
    });

    if (!ok) return;

    const now = new Date().toISOString();

    const parentOrdersToRecalc = new Set();

    for (const id of selectedIds) {
      if (tableName === 'purchase_items' || tableName === 'purchase_order_items' || tableName === 'sales_items' || tableName === 'sales_order_items') {
        const isPurchaseItem = tableName === 'purchase_items' || tableName === 'purchase_order_items';
        const record = await db[tableName].get(id);
        if (record && !record.deleted_at) {
          const pOrderId = isPurchaseItem ? record.purchase_order_id : record.sales_order_id;
          if (pOrderId) parentOrdersToRecalc.add(pOrderId);
          const matId = record.raw_material_id || record.material_id;
          if (matId) {
            const material = await db.raw_materials.get(matId);
            if (material) {
              const rate = isPurchaseItem ? 1 : getEffectiveMaterialRate(material, record.consumption_per_unit);
              const revertDir = isPurchaseItem ? -1 : 1;
              const netDelta = (Number(record.quantity) || 0) * rate * revertDir;
              const prevStock = Number(material.stock_quantity) || 0;
              const newStock = prevStock + netDelta;
              await db.raw_materials.update(material.id, {
                stock_quantity: newStock,
                sync_status: 'MODIFIED',
                updated_at: now
              });
              await recordStockMovement({
                material_id: material.id,
                material_name: material.material_name,
                movement_type: netDelta >= 0 ? 'IN' : 'OUT',
                source: isPurchaseItem ? 'purchase_order_revert' : 'sales_order_revert',
                reference_type: isPurchaseItem ? 'purchase_order' : 'sales_order',
                reference_id: pOrderId || id,
                quantity: Math.abs(netDelta),
                direction: netDelta >= 0 ? 1 : -1,
                stock_before: prevStock,
                stock_after: newStock,
                unit_cost: Number(material.unit_price) || 0,
                movement_date: now.split('T')[0],
                notes: isPurchaseItem ? 'حذف بند مشتريات مباشر' : 'حذف بند مبيعات مباشر'
              });
            }
          }
        }
      }

      if (tableName === 'work_orders') {
        const woRec = await db.work_orders?.get(id);
        if (woRec && woRec.status === 'COMPLETED' && woRec.bom_deducted) {
          try {
            await revertWorkOrderBOM(woRec);
          } catch (bomErr) {
            console.error('BOM Revert on bulk delete error:', bomErr);
          }
        }
      }

      if (tableName === 'shipping_orders') {
        const deterministicId = `exp-shipping-${id}`;
        const linkedExpenses = await db.expenses
          .filter(e => !e.deleted_at && (e.id === deterministicId || e.shipping_order_id === id || (e.notes && e.notes.includes(`[SHIPPING:${id}]`))))
          .toArray();
        for (const exp of linkedExpenses) {
          await db.expenses.update(exp.id, {
            deleted_at: now,
            sync_status: 'PENDING'
          });
        }
      }

      if (tableName === 'payroll') {
        const payrollRec = await db.payroll?.get(id);
        if (payrollRec && String(payrollRec.status || '').toUpperCase() === 'PAID' && Number(payrollRec.loan_deductions) > 0 && payrollRec.employee_id && db.employee_loans) {
          const loans = await db.employee_loans
            .filter(l => !l.deleted_at && l.employee_id === payrollRec.employee_id)
            .toArray();
          let toRevert = Number(payrollRec.loan_deductions);
          for (const loan of loans) {
            if (toRevert <= 0) break;
            const currentTotalPaid = Number(loan.total_paid) || 0;
            const step = Math.min(toRevert, currentTotalPaid);
            toRevert -= step;
            const newTotalPaid = Math.max(0, currentTotalPaid - step);
            const newRemaining = Math.max(0, (Number(loan.loan_amount) || 0) - newTotalPaid);
            await db.employee_loans.update(loan.id, {
              total_paid: newTotalPaid,
              remaining_amount: newRemaining,
              status: newRemaining <= 0 ? 'PAID' : 'ACTIVE',
              sync_status: 'MODIFIED',
              updated_at: now
            });
          }
        }

        const deterministicId = `exp-payroll-${id}`;
        const linkedExpenses = await db.expenses
          .filter(e => !e.deleted_at && (e.id === deterministicId || e.payroll_id === id || (e.notes && e.notes.includes(`[PAYROLL:${id}]`))))
          .toArray();
        for (const exp of linkedExpenses) {
          await db.expenses.update(exp.id, {
            deleted_at: now,
            sync_status: 'PENDING'
          });
        }
      }

      if (tableName === 'owner_withdrawals') {
        const deterministicId = `exp-withdrawal-${id}`;
        const linkedExpenses = await db.expenses
          .filter(e => !e.deleted_at && (e.id === deterministicId || e.withdrawal_id === id || (e.notes && e.notes.includes(`[OWNER_WITHDRAWAL:${id}]`))))
          .toArray();
        for (const exp of linkedExpenses) {
          await db.expenses.update(exp.id, {
            deleted_at: now,
            sync_status: 'PENDING'
          });
        }
      }

      await db[tableName].update(id, {
        deleted_at: now,
        sync_status: 'DELETED'
      });
    }

    for (const pOrderId of parentOrdersToRecalc) {
      await recalculateParentInvoiceFromItems(tableName, pOrderId, now);
    }

    setSelectedIds([]);
  };

  const getRelationLabel = (field, id) => {
    if (!relationsData || !relationsData[field.relationTable]) return id;
    const related = relationsData[field.relationTable].find(r => r.id === id);
    if (!related) return id;
    if (field.relationTable === 'sales_orders') {
      const orderNum = String(related.id).slice(0, 8).toUpperCase();
      let cust = '';
      if (relationsData['customers'] && related.customer_id) {
        const c = relationsData['customers'].find(x => x.id === related.customer_id);
        if (c?.customer_name) cust = ` (${c.customer_name})`;
      }
      return `${t('sales_orders')} #${orderNum}${cust}`;
    }
    if (field.relationLabel === 'id') {
      return `${t(field.label)} #${String(related.id).slice(0, 8).toUpperCase()}`;
    }
    return related[field.relationLabel] || id;
  };

  const exportCSV = () => {
    if (!data || data.length === 0) return;
    const csvSchema = schema.filter(f => !f.hideInTable && !isSensitiveField(f));
    const headers = csvSchema.map(f => t(f.label)).join(',');
    const rows = data.map(record => {
      return csvSchema.map(field => {
        let val = record[field.key];
        if (field.type === 'relation') val = getRelationLabel(field, val);
        else if (field.type === 'checkbox') val = val ? t('active') : t('inactive');
        else if (field.options) val = t(String(val).toLowerCase()) || val;
        
        // Escape quotes and commas
        return `"${String(val || '').replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${tableName}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!data) return <div>{t('loading') || 'Loading...'}</div>;

  const filteredData = (data || []).filter(record => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return schema.some(field => {
      if (isSensitiveField(field)) return false;
      let val = record[field.key];
      if (val === null || val === undefined) return false;
      if (field.type === 'relation') val = getRelationLabel(field, val);
      return String(val).toLowerCase().includes(q);
    });
  });

  const computedCards = metricCards !== undefined 
    ? (typeof metricCards === 'function' ? metricCards(data, relationsData, t, isRTL) : metricCards)
    : computeTableMetrics(tableName, data, relationsData, t, isRTL);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>{title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text)' }} onClick={exportCSV}>
            <Download size={18} /> {t('csv') || 'CSV'}
          </button>
          <button className="btn" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text)' }} onClick={() => window.print()}>
            <Printer size={18} /> {t('print') || 'Print'}
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ fontWeight: 800 }}>
            <Plus size={18} /> {t('add_record') || 'Add'}
          </button>
        </div>
      </div>

      {/* shadcn UI Metric Cards */}
      <PageMetricCards cards={computedCards} />

      <div className={`glass-card ${viewDetailRecord || profileTarget || isModalOpen ? 'hide-on-print' : 'print-area'}`}>
        
        {/* Table Search & Filter Toolbar */}
        <div 
          className="hide-on-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingBottom: '1rem',
            marginBottom: '1rem',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '420px' }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                [isRTL ? 'right' : 'left']: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isRTL ? `بحث سريع في ${title}...` : `Search ${title}...`}
              style={{
                width: '100%',
                padding: isRTL ? '0.55rem 2.4rem 0.55rem 0.85rem' : '0.55rem 0.85rem 0.55rem 2.4rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                color: 'var(--text-main)',
                fontSize: '0.85rem'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  [isRTL ? 'left' : 'right']: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {searchQuery && (
              <span className="badge-pill badge-pill-primary" style={{ fontSize: '0.75rem' }}>
                {isRTL ? `نتائج البحث: ${filteredData.length} من ${data.length}` : `Matches: ${filteredData.length} of ${data.length}`}
              </span>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {isRTL ? `إجمالي السجلات: ${data.length}` : `Total records: ${data.length}`}
            </span>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedIds.length > 0 && (
          <div 
            className="hide-on-print"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              marginBottom: '1rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ef4444' }}>
                {isRTL 
                  ? `تم تحديد ${selectedIds.length} من أصل ${data.length} سجل` 
                  : `${selectedIds.length} of ${data.length} records selected`}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                {isRTL ? 'إلغاء التحديد' : 'Deselect all'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)'
              }}
            >
              <Trash2 size={16} />
              <span>
                {isRTL 
                  ? `حذف السجلات المحددة (${selectedIds.length})` 
                  : `Delete Selected (${selectedIds.length})`}
              </span>
            </button>
          </div>
        )}

        <div className="print-header">
          <div>
            <h2 className="company-name">{getDisplayName(isRTL)}</h2>
            <div style={{ fontSize: '11pt', color: '#71717a', fontWeight: 600, marginBottom: '4px' }}>( {t('packaging_solutions_system')} )</div>
            <p className="report-title">{title} - {t('report')}</p>
          </div>
          <div className="print-meta">
            {t('printed_at')} {new Date().toLocaleString()}<br/>
            {t('system_name')}
          </div>
        </div>
        <div className="table-card" style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: isRTL ? 'right' : 'left' }}>
            <thead>
              <tr>
                <th className="hide-on-print" style={{ width: '46px', textAlign: 'center', padding: '0.75rem 0.5rem' }}>
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    ref={el => {
                      if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < data.length;
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(data.map(r => r.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                </th>
                {schema.filter(f => !f.hideInTable).map(field => (
                  <th
                    key={field.key}
                    className={isSensitiveField(field) ? 'hide-on-print' : undefined}
                    style={{ textAlign: isRTL ? 'right' : 'left' }}
                  >
                    {t(field.label)}
                  </th>
                ))}
                <th className="hide-on-print" style={{ textAlign: 'center' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(record => (
                <tr 
                  key={record.id}
                  className="clickable-row"
                  onClick={() => {
                    if (TABLE_TO_ENTITY_TYPE?.[tableName]) {
                      setProfileTarget({ type: TABLE_TO_ENTITY_TYPE[tableName], id: record.id });
                    } else {
                      setViewDetailRecord(record);
                    }
                  }}
                  style={{
                    backgroundColor: selectedIds.includes(record.id) ? 'rgba(239, 68, 68, 0.07)' : undefined,
                  }}
                >
                  <td className="hide-on-print" style={{ width: '46px', textAlign: 'center', padding: '0.75rem 0.5rem' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (e.target.checked) {
                          setSelectedIds(prev => [...prev, record.id]);
                        } else {
                          setSelectedIds(prev => prev.filter(id => id !== record.id));
                        }
                      }}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </td>
                  {schema.filter(f => !f.hideInTable).map(field => (
                    <td
                      key={field.key}
                      className={isSensitiveField(field) ? 'hide-on-print' : undefined}
                      style={{ padding: '1rem', fontWeight: field.isCurrency ? 700 : 400, color: 'var(--text-main)', fontVariantNumeric: field.isCurrency ? 'tabular-nums' : 'normal' }}
                    >
                      {isSensitiveField(field) ? (
                        '••••'
                      ) : tableName === 'work_orders' && field.key === 'employee_1' ? (
                        (() => {
                          const empIds = [
                            record.employee_1,
                            record.employee_2,
                            record.employee_3,
                            record.employee_4,
                            record.employee_5,
                            record.employee_6
                          ].filter(Boolean);

                          if (empIds.length === 0) {
                            return <span style={{ color: 'var(--text-muted)' }}>—</span>;
                          }

                          return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                              {empIds.map((empId, idx) => {
                                const emp = relationsData?.['employees']?.find(e => e.id === empId);
                                const name = emp?.full_name || empId;
                                return (
                                  <ProfileLink
                                    key={empId + '-' + idx}
                                    label={name}
                                    title={isRTL ? `عرض ملف الموظف (${name})` : `View Employee Profile (${name})`}
                                    onOpen={() => setProfileTarget({ type: 'employee', id: empId })}
                                  />
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : field.type === 'relation' ? (
                        TABLE_TO_ENTITY_TYPE?.[field?.relationTable] && record[field.key] ? (
                          <ProfileLink
                            label={getRelationLabel(field, record[field.key])}
                            title={isRTL ? 'عرض الملف الشامل' : 'View Full Profile'}
                            onOpen={() => setProfileTarget({ type: TABLE_TO_ENTITY_TYPE[field.relationTable], id: record[field.key] })}
                          />
                        ) : getRelationLabel(field, record[field.key])
                      )
                      : field.type === 'image' && record[field.key] ? (
                        <img
                          src={record[field.key]}
                          alt="Item"
                          onClick={() => setPreviewImage(record[field.key])}
                          title={t('click_to_view') || 'Click to view original size'}
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in', border: '1px solid var(--border)' }}
                        />
                      )
                      : field.type === 'multi_image' && record[field.key] ? (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(() => {
                            try {
                              const imgs = JSON.parse(record[field.key]);
                              return (Array.isArray(imgs) ? imgs : [imgs]).map((src, idx) => (
                                <img
                                  key={idx}
                                  src={src}
                                  alt={`Item ${idx}`}
                                  onClick={() => setPreviewImage(src)}
                                  title={t('click_to_view') || 'Click to view original size'}
                                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'zoom-in', border: '1px solid var(--border)' }}
                                />
                              ));
                            } catch {
                              return null;
                            }
                          })()}
                        </div>
                      )
                      : field.type === 'checkbox' ? (
                        <span style={{ 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '999px', 
                          fontSize: '0.75rem', 
                          backgroundColor: record[field.key] ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                          color: record[field.key] ? '#10B981' : 'var(--danger)'
                        }}>
                          {record[field.key] ? t('active') : t('inactive')}
                        </span>
                      ) : field.type === 'color_palette' ? (() => {
                        const val = String(record[field.key] || '');
                        if (!val) return '-';
                        const hexMatch = val.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
                        let color = hexMatch ? hexMatch[0] : null;
                        if (!color) {
                          const lower = val.toLowerCase();
                          if (lower.includes('brown') || lower.includes('kraft')) color = '#B8860B';
                          else if (lower.includes('white') || lower.includes('duplex')) color = '#FFFFFF';
                          else if (lower.includes('black')) color = '#1A1A1A';
                          else if (lower.includes('cyan')) color = '#00A3E0';
                          else if (lower.includes('yellow')) color = '#FACC15';
                          else if (lower.includes('red')) color = '#DC2626';
                          else if (lower.includes('green')) color = '#16A34A';
                          else if (lower.includes('blue')) color = '#2563EB';
                          else if (lower.includes('gray') || lower.includes('grey')) color = '#9CA3AF';
                        }
                        return (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                            {color && (
                              <span 
                                style={{ 
                                  width: '14px', 
                                  height: '14px', 
                                  borderRadius: '50%', 
                                  backgroundColor: color, 
                                  display: 'inline-block',
                                  border: color.toUpperCase() === '#FFFFFF' ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.2)',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }} 
                              />
                            )}
                            <span>{val}</span>
                          </div>
                        );
                      })()
                      : field.options ? (() => {
                          const val = record[field.key];
                          if (val === undefined || val === null || val === '') return '';
                          if (Array.isArray(field.options)) {
                            const match = field.options.find(o => typeof o === 'object' && o !== null && ((o.value ?? o.key ?? o.id) === val));
                            if (match) {
                              return isRTL ? (match.nameAr || match.labelAr || match.label || match.name || val) : (match.nameEn || match.labelEn || match.label || match.name || val);
                            }
                          }
                          const lower = String(val).toLowerCase();
                          if (i18n.exists(lower)) return t(lower);
                          if (i18n.exists(String(val))) return t(String(val));
                          return val;
                        })()
                      : (field.key === 'account_balance' || field.key === 'remaining_amount') ? (() => {
                          const balVal = Number(record[field.key]) || 0;
                          return (
                            <span style={{ fontWeight: 700, color: balVal < 0 ? '#2563eb' : (balVal > 0 ? '#EF4444' : '#10B981') }}>
                              {formatAmount(balVal)} {t('egp')}
                              {balVal < 0 && (
                                <span style={{ marginInlineStart: '0.4rem', fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', fontWeight: 700 }}>
                                  دفعة مقدمة
                                </span>
                              )}
                            </span>
                          );
                        })()
                      : field.type === 'number' && field.isCurrency ? `${formatAmount(record[field.key])} ${t('egp')}`
                      : (record[field.key] ?? (field.key === 'bill_of_lading_number' ? record.vehicle_number : ''))}
                    </td>
                  ))}
                  <td className="hide-on-print" style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                      {/* Single Unified View / Profile Action Button with smooth hover effect */}
                      <button 
                        className="icon-btn" 
                        style={{ 
                          color: '#2563eb', 
                          background: 'rgba(37, 99, 235, 0.08)',
                          borderRadius: '8px',
                          padding: '0.45rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease'
                        }} 
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(37, 99, 235, 0.2)';
                          e.currentTarget.style.color = '#1d4ed8';
                          e.currentTarget.style.transform = 'scale(1.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)';
                          e.currentTarget.style.color = '#2563eb';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        onClick={() => {
                          if (TABLE_TO_ENTITY_TYPE?.[tableName]) {
                            setProfileTarget({ type: TABLE_TO_ENTITY_TYPE[tableName], id: record.id });
                          } else {
                            setViewDetailRecord(record);
                          }
                        }} 
                        title={TABLE_TO_ENTITY_TYPE?.[tableName] ? (isRTL ? 'عرض الملف والتقرير الشامل' : 'View Full Profile & Report') : (isRTL ? 'عرض التفاصيل' : 'View Details')}
                      >
                        <Eye size={16} />
                      </button>
                      {customActions.filter(action => {
                        if (TABLE_TO_ENTITY_TYPE?.[tableName]) {
                          const lbl = String(action.label || '').toLowerCase();
                          if (lbl.includes('profile') || lbl.includes('الملف')) return false;
                        }
                        return true;
                      }).map((action, idx) => (
                        <button key={idx} className="icon-btn" style={{ color: action.color || 'var(--primary)' }} onClick={() => action.onClick(record)} title={action.label}>
                          {action.icon}
                        </button>
                      ))}
                      <button className="icon-btn" onClick={() => handleOpenModal(record)} title={t('edit') || 'Edit'}>
                        <Edit3 size={16} />
                      </button>
                      <button className="icon-btn" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(record.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={schema.length + 2} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                      <Search size={26} style={{ opacity: 0.35 }} />
                      <span style={{ fontWeight: 600 }}>
                        {searchQuery ? (isRTL ? 'لا توجد سجلات مطابقة لبحثك' : 'No matching records found') : t('no_records')}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {data.length > 0 && schema.some(f => f.showTotal || f.isCurrency) && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700, backgroundColor: 'var(--table-header-bg)' }}>
                  <td className="hide-on-print"></td>
                  {schema.filter(f => !f.hideInTable).map((field, i) => (
                    <td
                      key={field.key}
                      className={isSensitiveField(field) ? 'hide-on-print' : undefined}
                      style={{ 
                        padding: '1rem', 
                        color: 'var(--text-main)', 
                        fontWeight: 800,
                        textAlign: i === 0 ? (isRTL ? 'left' : 'right') : (isRTL ? 'right' : 'left') 
                      }}
                    >
                      {i === 0 && (
                        <span style={{ fontWeight: 800, color: 'var(--text-main)', marginInlineEnd: '0.4rem' }}>
                          {(t('grand_total') || (isRTL ? 'الإجمالي الكلي' : 'Grand Total')) + ':'}
                        </span>
                      )}
                      {(field.showTotal || field.isCurrency) && (() => {
                        const sumVal = data.reduce((sum, r) => sum + (Number(r[field.key]) || 0), 0);
                        const isNegBalance = (field.key === 'account_balance' || field.key === 'remaining_amount') && sumVal < 0;
                        return (
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: isNegBalance ? '#2563eb' : 'var(--text-main)' }}>
                            {field.isCurrency 
                              ? `${formatAmount(sumVal)} ${t('egp') || (isRTL ? 'ج.م' : 'EGP')}${isNegBalance ? ' (دفعة مقدمة)' : ''}`
                              : sumVal}
                          </span>
                        );
                      })()}
                    </td>
                  ))}
                  <td className="hide-on-print"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div 
          className="modern-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div 
            className="glass-card modern-modal-dialog" 
            style={{ 
              width: 'min(92vw, 840px)', 
              maxWidth: 'min(92vw, 840px)', 
              maxHeight: '86vh', 
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 0
            }}
          >
            {/* Modern Executive Modal Header */}
            <div className="modern-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ 
                  width: 46, 
                  height: 46, 
                  borderRadius: '14px', 
                  background: 'rgba(37, 99, 235, 0.12)', 
                  color: 'var(--primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  flexShrink: 0 
                }}>
                  <FileText size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                      {formData.id ? (t('edit') || 'Edit') : (t('add_new') || 'New')} {title}
                    </h2>
                    {formData.id && (
                      <span className="badge-pill badge-pill-primary" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        #{String(formData.id).slice(0, 8).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {formData.id 
                      ? (isRTL ? 'تعديل وتحديث بيانات السجل المسجل بالنظام' : 'Update existing record attributes') 
                      : (isRTL ? 'إدخال بيانات السجل الجديد وتوثيقه' : 'Create and commit a new entry')}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                className="modern-modal-close-btn" 
                onClick={() => setIsModalOpen(false)}
                title={isRTL ? 'إغلاق' : 'Close'}
              >
                <X size={20} />
              </button>
            </div>
            
            <form id="dynamic-crud-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {/* Modal Body - Independently Scrollable */}
              <div 
                className="modal-body-scroll"
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '1.75rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '1.5rem' 
                }}
              >
                {customModalRender && customModalRender({ formData, updateField, relationsData, t })}
                
                {/* Header Details Card */}
                <div className="modern-card-section">
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={17} style={{ color: 'var(--primary)' }} />
                    {isRTL ? 'بيانات وتفاصيل السجل' : 'Record Attributes & Details'}
                  </h3>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
                    gap: '1.25rem' 
                  }}>
                {schema.map(field => {
                  if (field.hideInForm) return null;

                  if (tableName === 'work_orders' && (field.key === 'employee_2' || field.key === 'employee_3' || field.key === 'employee_4' || field.key === 'employee_5' || field.key === 'employee_6')) {
                    return null;
                  }

                  if (tableName === 'work_orders' && field.key === 'employee_1') {
                    const employeeOptions = relationsData?.['employees'] || [];
                    const assignedCount = [1, 2, 3, 4, 5, 6].filter(i => Boolean(formData[`employee_${i}`])).length;

                    const removeCrewMember = (slotIdx) => {
                      setFormData(prev => {
                        const next = { ...prev };
                        for (let s = slotIdx; s < 6; s++) {
                          next[`employee_${s}`] = next[`employee_${s + 1}`] || '';
                        }
                        next.employee_6 = '';
                        formDataRef.current = next;
                        return next;
                      });
                      setWorkOrderEmpCount(prev => Math.max(1, prev - 1));
                    };

                    return (
                      <div 
                        key="work_order_crew_section" 
                        style={{ 
                          gridColumn: '1 / -1', 
                          background: 'var(--surface)', 
                          border: '1.5px solid var(--border)', 
                          borderRadius: '12px', 
                          padding: '1.25rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Crew Section Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Users size={18} />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                {t('assigned_crew')}
                              </h4>
                              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {isRTL ? 'فريق العمل المعين لتنفيذ هذا الأمر (حتى 6 موظفين)' : 'Assigned crew members executing this work order (up to 6)'}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ 
                              fontSize: '0.78rem', 
                              fontWeight: 700, 
                              padding: '0.25rem 0.65rem', 
                              borderRadius: '999px', 
                              background: assignedCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)', 
                              color: assignedCount > 0 ? '#10b981' : 'var(--text-muted)' 
                            }}>
                              {assignedCount} / 6 {isRTL ? 'معينين' : 'assigned'}
                            </span>
                          </div>
                        </div>

                        {/* Dynamic Employee Slots Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.95rem' }}>
                          {Array.from({ length: workOrderEmpCount }, (_, idx) => idx + 1).map(slotIdx => {
                            const empKey = `employee_${slotIdx}`;
                            const isLead = slotIdx === 1;
                            const currentVal = formData[empKey] || '';

                            return (
                              <div 
                                key={empKey} 
                                style={{ 
                                  background: 'var(--surface-hover)', 
                                  border: isLead ? '1.5px solid rgba(37, 99, 235, 0.3)' : '1px solid var(--border)', 
                                  borderRadius: '10px', 
                                  padding: '0.85rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.45rem'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: isLead ? '#2563eb' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span>{t(empKey)}</span>
                                    {isLead && <span style={{ color: '#ef4444' }}>*</span>}
                                  </label>

                                  {!isLead && (
                                    <button
                                      type="button"
                                      onClick={() => removeCrewMember(slotIdx)}
                                      title={t('remove_crew_employee')}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: '2px 4px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        fontSize: '0.72rem',
                                        fontWeight: 600
                                      }}
                                    >
                                      <Trash2 size={13} />
                                      <span>{t('remove')}</span>
                                    </button>
                                  )}
                                </div>

                                <select
                                  dir={isRTL ? 'rtl' : 'ltr'}
                                  value={currentVal}
                                  onChange={e => updateField(empKey, e.target.value)}
                                  required={isLead}
                                  className="modern-input"
                                  style={{
                                    width: '100%',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    direction: isRTL ? 'rtl' : 'ltr',
                                    textAlign: isRTL ? 'right' : 'left'
                                  }}
                                >
                                  <option value="">-- {t('select')} {t(empKey)} --</option>
                                  {employeeOptions.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.full_name} {emp.job_title ? `(${emp.job_title})` : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>

                        {/* Add Employee Button */}
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {workOrderEmpCount < 6 ? (
                            <button
                              type="button"
                              onClick={() => setWorkOrderEmpCount(prev => Math.min(6, prev + 1))}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.55rem 1rem',
                                background: 'rgba(37, 99, 235, 0.08)',
                                color: '#2563eb',
                                border: '1.5px dashed #2563eb',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <Plus size={16} />
                              <span>{t('add_crew_employee')} ({workOrderEmpCount}/6)</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {t('max_crew_reached')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const isFullWidth = field.type === 'textarea' || field.type === 'dimensions' || field.type === 'color_palette' || field.type === 'image' || field.type === 'multi_image';
                  
                  return (
                    <div key={field.key} style={{ gridColumn: isFullWidth ? '1 / -1' : undefined }}>
                      {field.type !== 'checkbox' && (
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.45rem', color: 'var(--text-main)' }}>
                          {t(field.label)} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>
                      )}
                      
                      {field.type === 'text' && (
                        <input 
                          type="text" 
                          value={formData[field.key] || ''}
                          onChange={e => updateField(field.key, e.target.value)}
                          required={field.required}
                          className="modern-input"
                          style={{ width: '100%' }}
                        />
                      )}

                      {field.type === 'password' && (
                        <input 
                          type="password" 
                          value={formData[field.key] || ''}
                          onChange={e => updateField(field.key, e.target.value)}
                          required={field.required && !formData.id}
                          className="modern-input"
                          style={{ width: '100%' }}
                          placeholder={formData.id ? t('leave_blank_to_keep_password') : ''}
                        />
                      )}

                      {field.type === 'image' && (
                        <div>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={e => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  updateField(field.key, reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            required={field.required && !formData[field.key]}
                            className="modern-input"
                            style={{ width: '100%' }}
                          />
                          {formData[field.key] && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <img
                                src={formData[field.key]}
                                alt="Preview"
                                onClick={() => setPreviewImage(formData[field.key])}
                                title={t('click_to_view') || 'Click to view original size'}
                                style={{ maxHeight: '100px', maxWidth: '140px', objectFit: 'contain', borderRadius: '8px', cursor: 'zoom-in', border: '1.5px solid var(--border)' }}
                              />
                              <button type="button" onClick={() => updateField(field.key, null)} style={{ background: 'var(--danger)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                                {t('remove')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {field.type === 'multi_image' && (
                        <div>
                          <input 
                            type="file" 
                            accept="image/*"
                            multiple
                            onChange={e => {
                              const files = Array.from(e.target.files);
                              Promise.all(files.map(file => new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(file);
                              }))).then(results => {
                                const existing = formData[field.key] ? JSON.parse(formData[field.key]) : [];
                                updateField(field.key, JSON.stringify([...existing, ...results]));
                              });
                            }}
                            required={field.required && !formData[field.key]}
                            className="modern-input"
                            style={{ width: '100%' }}
                          />
                          {formData[field.key] && JSON.parse(formData[field.key]).length > 0 && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {JSON.parse(formData[field.key]).map((src, idx) => (
                                <div key={idx} style={{ position: 'relative' }}>
                                  <img
                                    src={src}
                                    alt="Preview"
                                    onClick={() => setPreviewImage(src)}
                                    title={t('click_to_view') || 'Click to view original size'}
                                    style={{ maxHeight: '100px', maxWidth: '140px', objectFit: 'contain', borderRadius: '8px', cursor: 'zoom-in', border: '1.5px solid var(--border)' }}
                                  />
                                  <button type="button" onClick={() => {
                                    const items = JSON.parse(formData[field.key]);
                                    items.splice(idx, 1);
                                    updateField(field.key, JSON.stringify(items));
                                  }} style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: '0 6px 0 6px', border: 'none', cursor: 'pointer', fontSize: '10px' }}>
                                    X
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {field.type === 'number' && (
                        <input 
                          type="number" 
                          step={field.isCurrency ? "0.01" : "any"}
                          value={formData[field.key] ?? 0}
                          onChange={e => updateField(field.key, e.target.value)}
                          required={field.required}
                          disabled={field.disabled || (field.readOnly && !field.editable)}
                          className="modern-input"
                          style={{ 
                            width: '100%',
                            opacity: (field.disabled || (field.readOnly && !field.editable)) ? 0.6 : 1,
                            cursor: (field.disabled || (field.readOnly && !field.editable)) ? 'not-allowed' : 'text'
                          }}
                        />
                      )}

                      {field.type === 'date' && (
                        <input 
                          type="date" 
                          value={formData[field.key] || ''}
                          onChange={e => updateField(field.key, e.target.value)}
                          required={field.required}
                          className="modern-input"
                          style={{ width: '100%' }}
                        />
                      )}

                      {field.type === 'time' && (
                        <input 
                          type="time" 
                          value={formData[field.key] || ''}
                          onChange={e => updateField(field.key, e.target.value)}
                          required={field.required}
                          className="modern-input"
                          style={{ width: '100%' }}
                        />
                      )}

                      {field.type === 'textarea' && (
                        <textarea 
                          value={formData[field.key] || ''}
                          onChange={e => updateField(field.key, e.target.value)}
                          required={field.required}
                          rows="3"
                          className="modern-input"
                          style={{ width: '100%', resize: 'vertical' }}
                        />
                      )}

                      {field.type === 'dimensions' && (() => {
                        const currentDim = dimensionStates[field.key] || { length: '', width: '', height: '', unit: 'cm', mode: '3d' };
                        const is3D = currentDim.mode !== 'free';

                        return (
                          <div>
                            {/* Mode Switcher Tabs */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {is3D ? (isRTL ? 'الأبعاد الثلاثية (طول × عرض × ارتفاع)' : '3 Dimensions (L × W × H)') : (isRTL ? 'نص حر' : 'Free Text')}
                              </span>
                              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--surface-hover)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                <button
                                  type="button"
                                  onClick={() => toggleDimensionMode(field.key, '3d')}
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: is3D ? 600 : 400,
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: is3D ? 'var(--primary)' : 'transparent',
                                    color: is3D ? 'var(--primary-foreground)' : 'var(--text-muted)'
                                  }}
                                >
                                  {isRTL ? '3 أبعاد (طول × عرض × ارتفاع)' : '3 Dimensions'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleDimensionMode(field.key, 'free')}
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: !is3D ? 600 : 400,
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: !is3D ? 'var(--primary)' : 'transparent',
                                    color: !is3D ? 'var(--primary-foreground)' : 'var(--text-muted)'
                                  }}
                                >
                                  {isRTL ? 'نص حر' : 'Free Text'}
                                </button>
                              </div>
                            </div>

                            {is3D ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: '0.65rem', alignItems: 'center' }}>
                                  {/* Length (الطول) */}
                                  <div>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                      {t('length') || (isRTL ? 'الطول' : 'Length')}
                                    </span>
                                    <input
                                      type="number"
                                      step="any"
                                      placeholder={isRTL ? 'طول' : 'Length'}
                                      value={currentDim.length || ''}
                                      onChange={e => updateDimension(field.key, 'length', e.target.value)}
                                      className="modern-input"
                                      style={{ width: '100%' }}
                                    />
                                  </div>

                                  {/* Width (العرض) */}
                                  <div>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                      {t('width') || (isRTL ? 'العرض' : 'Width')}
                                    </span>
                                    <input
                                      type="number"
                                      step="any"
                                      placeholder={isRTL ? 'عرض' : 'Width'}
                                      value={currentDim.width || ''}
                                      onChange={e => updateDimension(field.key, 'width', e.target.value)}
                                      className="modern-input"
                                      style={{ width: '100%' }}
                                    />
                                  </div>

                                  {/* Height (الارتفاع / High) */}
                                  <div>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                      {t('height') || (isRTL ? 'الارتفاع' : 'Height')}
                                    </span>
                                    <input
                                      type="number"
                                      step="any"
                                      placeholder={isRTL ? 'ارتفاع' : 'Height'}
                                      value={currentDim.height || ''}
                                      onChange={e => updateDimension(field.key, 'height', e.target.value)}
                                      className="modern-input"
                                      style={{ width: '100%' }}
                                    />
                                  </div>

                                  {/* Dimension Unit */}
                                  <div>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                      {isRTL ? 'الوحدة' : 'Unit'}
                                    </span>
                                    <select
                                      value={currentDim.unit || 'cm'}
                                      onChange={e => updateDimension(field.key, 'unit', e.target.value)}
                                      className="modern-input"
                                      style={{ fontWeight: 600 }}
                                    >
                                      <option value="cm">cm / سم</option>
                                      <option value="mm">mm / مم</option>
                                      <option value="m">m / م</option>
                                      <option value="in">in / بوصة</option>
                                    </select>
                                  </div>
                                </div>

                                {formData[field.key] && (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-hover)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', width: 'fit-content', border: '1.5px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>📐 {t('dimensions_preview') || 'Size'}:</span>
                                    <strong style={{ color: 'var(--primary)' }}>{formData[field.key]}</strong>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="e.g. 160 cm roll, 50 KG Drum..."
                                value={formData[field.key] || ''}
                                onChange={e => updateField(field.key, e.target.value)}
                                className="modern-input"
                                style={{ width: '100%' }}
                              />
                            )}
                          </div>
                        );
                      })()}

                      {field.type === 'thickness' && (() => {
                        const currentThick = thicknessStates[field.key] || { val: '', unit: 'GSM', mode: 'structured' };
                        const isStructured = currentThick.mode !== 'free';
                        const presets = [
                          { label: '120 GSM', val: '120', unit: 'GSM' },
                          { label: '140 GSM', val: '140', unit: 'GSM' },
                          { label: '180 GSM', val: '180', unit: 'GSM' },
                          { label: '250 GSM', val: '250', unit: 'GSM' },
                          { label: '300 GSM', val: '300', unit: 'GSM' },
                          { label: '350 GSM', val: '350', unit: 'GSM' },
                          { label: '3-Ply', val: '3', unit: 'Ply' },
                          { label: '5-Ply', val: '5', unit: 'Ply' }
                        ];

                        return (
                          <div>
                            {/* Mode Switcher Tabs */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {isStructured ? (isRTL ? 'قيمة ووحدة السماكة' : 'Value & Unit') : (isRTL ? 'نص حر' : 'Free Text')}
                              </span>
                              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--surface-hover)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                <button
                                  type="button"
                                  onClick={() => toggleThicknessMode(field.key, 'structured')}
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: isStructured ? 600 : 400,
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: isStructured ? 'var(--primary)' : 'transparent',
                                    color: isStructured ? 'var(--primary-foreground)' : 'var(--text-muted)'
                                  }}
                                >
                                  {isRTL ? 'قيمة + وحدة' : 'Value + Unit'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleThicknessMode(field.key, 'free')}
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: !isStructured ? 600 : 400,
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: !isStructured ? 'var(--primary)' : 'transparent',
                                    color: !isStructured ? 'var(--primary-foreground)' : 'var(--text-muted)'
                                  }}
                                >
                                  {isRTL ? 'نص حر' : 'Free Text'}
                                </button>
                              </div>
                            </div>

                            {isStructured ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem', alignItems: 'center' }}>
                                  {/* Value */}
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder={isRTL ? 'مثال: 140 أو 250 أو 3' : 'e.g. 140, 250, 3...'}
                                    value={currentThick.val || ''}
                                    onChange={e => updateThickness(field.key, 'val', e.target.value)}
                                    className="modern-input"
                                    style={{ width: '100%' }}
                                  />

                                  {/* Unit Selector */}
                                  <select
                                    value={currentThick.unit || 'GSM'}
                                    onChange={e => updateThickness(field.key, 'unit', e.target.value)}
                                    className="modern-input"
                                    style={{ fontWeight: 600 }}
                                  >
                                    <option value="GSM">GSM / جرام</option>
                                    <option value="Micron">Micron (µm) / ميكرون</option>
                                    <option value="mm">mm / مم</option>
                                    <option value="Ply">Ply / طبقات</option>
                                    <option value="pt">pt / نقطة</option>
                                  </select>
                                </div>

                                {/* Quick Packaging Presets */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('presets') || 'Presets'}:</span>
                                  {presets.map(p => (
                                    <button
                                      key={p.label}
                                      type="button"
                                      onClick={() => {
                                        setThicknessStates(prev => ({
                                          ...prev,
                                          [field.key]: { val: p.val, unit: p.unit, mode: 'structured' }
                                        }));
                                        updateField(field.key, `${p.val} ${p.unit}`);
                                      }}
                                      style={{
                                        padding: '0.2rem 0.5rem',
                                        fontSize: '0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        background: currentThick.val === p.val && currentThick.unit === p.unit ? 'var(--primary)' : 'var(--surface-hover)',
                                        color: currentThick.val === p.val && currentThick.unit === p.unit ? 'var(--primary-foreground)' : 'var(--text-main)',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {p.label}
                                    </button>
                                  ))}
                                </div>

                                {formData[field.key] && (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-hover)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', width: 'fit-content', border: '1.5px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>📄 {t('thickness') || 'Thickness'}:</span>
                                    <strong style={{ color: 'var(--primary)' }}>{formData[field.key]}</strong>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="e.g. 3-Ply B-Flute 140 GSM..."
                                value={formData[field.key] || ''}
                                onChange={e => updateField(field.key, e.target.value)}
                                className="modern-input"
                                style={{ width: '100%' }}
                              />
                            )}
                          </div>
                        );
                      })()}

                      {field.type === 'color_palette' && (() => {
                        const currentColor = colorPaletteStates[field.key] || { hex: '#B8860B', name: '', printType: 'plain' };

                        const printOptions = [
                          { key: 'plain', labelEn: 'Plain / Unprinted', labelAr: 'سادة بدون طباعة' },
                          { key: '1_color', labelEn: '1-Color Print', labelAr: 'طباعة لون واحد' },
                          { key: '2_color', labelEn: '2-Color Print', labelAr: 'طباعة لونين' },
                          { key: 'cmyk', labelEn: 'CMYK Multi-Color', labelAr: 'طباعة 4 ألوان CMYK' },
                        ];

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* Packaging Color Palette Swatches */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {isRTL ? 'لوحة ألوان التغليف الشائعة:' : 'Common Packaging Swatches:'}
                                </span>
                                {/* Native HTML Color Picker */}
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}>
                                  <span>{isRTL ? 'ألوان أخرى 🎨' : 'Custom Palette 🎨'}</span>
                                  <input
                                    type="color"
                                    value={currentColor.hex || '#B8860B'}
                                    onChange={e => {
                                      const newHex = e.target.value;
                                      updateColorPalette(field.key, { hex: newHex });
                                    }}
                                    style={{ width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                                  />
                                </label>
                              </div>

                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
                                {PACKAGING_PALETTE.map(item => {
                                  const isSelected = currentColor.hex?.toUpperCase() === item.hex.toUpperCase();
                                  return (
                                    <button
                                      key={item.hex + item.name}
                                      type="button"
                                      onClick={() => {
                                        const displayName = isRTL ? item.nameAr : item.name;
                                        updateColorPalette(field.key, { hex: item.hex, name: displayName });
                                      }}
                                      title={isRTL ? item.nameAr : item.name}
                                      style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        backgroundColor: item.hex,
                                        border: isSelected ? '3px solid var(--primary)' : (item.border ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.15)'),
                                        boxShadow: isSelected ? '0 0 0 2px rgba(99, 102, 241, 0.4)' : '0 1px 3px rgba(0,0,0,0.15)',
                                        cursor: 'pointer',
                                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                        transition: 'transform 0.15s ease'
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            {/* Color Description & Print Details Input */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem', alignItems: 'center' }}>
                              <div
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '8px',
                                  backgroundColor: currentColor.hex || '#B8860B',
                                  border: currentColor.hex?.toUpperCase() === '#FFFFFF' ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.2)',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  flexShrink: 0
                                }}
                              />
                              <input
                                type="text"
                                placeholder={isRTL ? 'اسم اللون أو مواصفات الطباعة (مثال: كرافت بني طبيعي)' : 'Color or print details (e.g. Brown Kraft, White Duplex)...'}
                                value={currentColor.name || ''}
                                onChange={e => updateColorPalette(field.key, { name: e.target.value })}
                                className="modern-input"
                                style={{ width: '100%' }}
                              />
                            </div>

                            {/* Print Type Quick Selector */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {printOptions.map(opt => {
                                const isCurrent = currentColor.printType === opt.key;
                                return (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => {
                                      const label = isRTL ? opt.labelAr : opt.labelEn;
                                      const baseName = (currentColor.name || '').replace(/\s*-\s*(سادة بدون طباعة|طباعة لون واحد|طباعة لونين|طباعة 4 ألوان CMYK|Plain \/ Unprinted|1-Color Print|2-Color Print|CMYK Multi-Color)/g, '').trim();
                                      const combinedName = opt.key === 'plain' ? (baseName || (isRTL ? 'سادة' : 'Plain')) : `${baseName || ''} - ${label}`.trim().replace(/^-\s*/, '');
                                      updateColorPalette(field.key, { printType: opt.key, name: combinedName });
                                    }}
                                    style={{
                                      padding: '0.35rem 0.65rem',
                                      fontSize: '0.75rem',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border)',
                                      background: isCurrent ? 'var(--primary)' : 'var(--surface-hover)',
                                      color: isCurrent ? 'var(--primary-foreground)' : 'var(--text-main)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {isRTL ? opt.labelAr : opt.labelEn}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Live Badge Preview */}
                            {formData[field.key] && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-hover)', padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', width: 'fit-content', border: '1.5px solid var(--border)' }}>
                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: currentColor.hex || '#B8860B', display: 'inline-block', border: '1px solid rgba(0,0,0,0.2)' }} />
                                <span style={{ color: 'var(--text-muted)' }}>🎨 {t('color_print') || 'Color'}:</span>
                                <strong style={{ color: 'var(--primary)' }}>{formData[field.key]}</strong>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {field.type === 'select' && (() => {
                        const existingValues = Array.from(new Set((data || []).map(r => r[field.key]).filter(Boolean)));
                        const optionsMap = new Map();
                        (field.options || []).forEach(opt => {
                          if (typeof opt === 'object' && opt !== null) {
                            const val = opt.value ?? opt.key ?? opt.id;
                            if (val) optionsMap.set(val, opt);
                          } else if (opt) {
                            optionsMap.set(opt, opt);
                          }
                        });
                        existingValues.forEach(val => {
                          if (!optionsMap.has(val)) {
                            optionsMap.set(val, val);
                          }
                        });
                        const allOptions = Array.from(optionsMap.values());
                        const isCustom = customFieldActive[field.key];

                        return (
                          <div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <select 
                                dir={isRTL ? 'rtl' : 'ltr'}
                                value={isCustom ? '__MANUAL_CUSTOM__' : (formData[field.key] || '')}
                                onChange={e => {
                                  if (e.target.value === '__MANUAL_CUSTOM__') {
                                    setCustomFieldActive(prev => ({ ...prev, [field.key]: true }));
                                    updateField(field.key, '');
                                  } else {
                                    setCustomFieldActive(prev => ({ ...prev, [field.key]: false }));
                                    updateField(field.key, e.target.value);
                                  }
                                }}
                                required={field.required && !isCustom}
                                className="modern-input"
                                style={{ 
                                  flex: 1,
                                  direction: isRTL ? 'rtl' : 'ltr', 
                                  textAlign: isRTL ? 'right' : 'left'
                                }}
                              >
                                <option value="" disabled>-- {t('select')} {t(field.label)} --</option>
                                {allOptions.map((opt, optIdx) => {
                                  const optVal = (typeof opt === 'object' && opt !== null) ? (opt.value ?? opt.key ?? opt.id) : opt;
                                  let label = optVal;
                                  if (typeof opt === 'object' && opt !== null) {
                                    label = isRTL 
                                      ? (opt.nameAr || opt.labelAr || opt.label || opt.name || optVal) 
                                      : (opt.nameEn || opt.labelEn || opt.label || opt.name || optVal);
                                  } else {
                                    const lowerKey = String(opt).toLowerCase();
                                    if (i18n.exists(lowerKey)) {
                                      label = t(lowerKey);
                                    } else if (i18n.exists(String(opt))) {
                                      label = t(String(opt));
                                    }
                                  }
                                  return (
                                    <option key={optVal || optIdx} value={optVal}>
                                      {label}
                                    </option>
                                  );
                                })}
                                {field.allowCustom && (
                                  <option value="__MANUAL_CUSTOM__" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                    ✍️ {t('or_add_manual') || '+ Add / Type Manually...'}
                                  </option>
                                )}
                              </select>

                              {field.allowCustom && (
                                <button
                                  type="button"
                                  className="btn"
                                  onClick={() => {
                                    setCustomFieldActive(prev => {
                                      const nextVal = !prev[field.key];
                                      const currentInOptions = allOptions.some(opt => {
                                        const v = (typeof opt === 'object' && opt !== null) ? (opt.value ?? opt.key ?? opt.id) : opt;
                                        return v === formData[field.key];
                                      });
                                      if (!nextVal && !currentInOptions) {
                                        const firstOpt = allOptions[0];
                                        const firstVal = (typeof firstOpt === 'object' && firstOpt !== null) ? (firstOpt.value ?? firstOpt.key ?? firstOpt.id) : (firstOpt || '');
                                        updateField(field.key, firstVal);
                                      }
                                      return { ...prev, [field.key]: nextVal };
                                    });
                                  }}
                                  title={t('or_add_manual')}
                                  style={{ 
                                    padding: '0.75rem 1rem', 
                                    fontSize: '0.85rem', 
                                    whiteSpace: 'nowrap',
                                    backgroundColor: isCustom ? 'var(--primary)' : 'var(--surface-hover)',
                                    color: isCustom ? 'var(--primary-foreground)' : 'var(--text-main)',
                                    border: '1.5px solid var(--border)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem'
                                  }}
                                >
                                  <Edit3 size={15} />
                                  {isCustom ? (t('select') || 'Select') : (isRTL ? 'يدوي' : 'Manual')}
                                </button>
                              )}
                            </div>

                            {field.allowCustom && isCustom && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <input 
                                  type="text" 
                                  placeholder={t(`enter_manual_${field.key}`) || (isRTL ? `أدخل ${t(field.label)} يدوياً...` : `Enter ${t(field.label)} manually...`)}
                                  value={formData[field.key] || ''}
                                  onChange={e => updateField(field.key, e.target.value)}
                                  required={field.required}
                                  autoFocus
                                  className="modern-input"
                                  style={{ 
                                    width: '100%',
                                    border: '2px solid var(--primary)'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {field.type === 'relation' && (
                        <select 
                          dir={isRTL ? 'rtl' : 'ltr'}
                          value={formData[field.key] || ''}
                          onChange={e => updateField(field.key, e.target.value)}
                          required={field.required}
                          className="modern-input"
                          style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                        >
                          <option value="" disabled>-- {t('select')} {t(field.label)} --</option>
                          {(relationsData?.[field.relationTable] || []).map(r => {
                            let display = field.relationLabel === 'id' ? `${t(field.label)} #${String(r.id).slice(0, 8).toUpperCase()}` : r[field.relationLabel];
                            if (field.relationTable === 'sales_orders') {
                              const orderNum = String(r.id).slice(0, 8).toUpperCase();
                              let cust = '';
                              if (relationsData?.['customers'] && r.customer_id) {
                                const c = relationsData['customers'].find(x => x.id === r.customer_id);
                                if (c?.customer_name) cust = ` - ${c.customer_name}`;
                              }
                              display = `${t('sales_orders')} #${orderNum}${cust}`;
                            }
                            return (
                              <option key={r.id} value={r.id}>
                                {display}
                              </option>
                            );
                          })}
                        </select>
                      )}

                      {field.type === 'checkbox' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={formData[field.key] === 1 || formData[field.key] === true}
                            onChange={e => updateField(field.key, e.target.checked ? 1 : 0)}
                          />
                          <span>{t(field.label)}</span>
                        </label>
                      )}
                    </div>
                  );
                })}
                  </div>
                </div>
              </div>

              {/* Modal Sticky Footer */}
              <div className="modern-modal-footer">
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setIsModalOpen(false)} 
                  style={{ padding: '0.65rem 1.4rem', borderRadius: '10px' }}
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="modern-submit-btn"
                  style={{ opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
                >
                  <Save size={18} />
                  <span>{isSaving ? 'جاري الحفظ...' : (t('save') || 'Save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full size original image popup modal */}
      <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />
      {profileTarget && (
        <EntityProfileModal
          entityType={profileTarget.type}
          entityId={profileTarget.id}
          onClose={() => setProfileTarget(null)}
        />
      )}
      {viewDetailRecord && (
        <RecordDetailModal
          tableName={tableName}
          title={title}
          schema={schema.filter(f => !isSensitiveField(f))}
          record={viewDetailRecord}
          relationsData={relationsData}
          onClose={() => setViewDetailRecord(null)}
          onEdit={(rec) => {
            setViewDetailRecord(null);
            handleOpenModal(rec);
          }}
          onOpenProfile={setProfileTarget}
        />
      )}
    </div>
  );
}
