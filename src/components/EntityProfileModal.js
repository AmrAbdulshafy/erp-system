"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { 
  Users, Briefcase, Truck, Shield, ExternalLink, Printer, Edit3, Save, 
  RotateCcw, Check, Calendar, DollarSign, FileText, Package, Clock, 
  Hash, CheckCircle2, XCircle, AlertCircle, TrendingUp, Layers, Award, 
  FileSpreadsheet, Phone, Mail, MapPin, HandCoins, ChevronRight, Activity,
  ShoppingBag, Receipt, ArrowUpRight, ArrowDownLeft, Box, X
} from 'lucide-react';
import { db, useLiveQuery } from '../db';
import { formatAmount } from '../utils/format';
import { useCompanyProfile } from '../utils/companyProfile';
import { TYPE_TABLE, TYPE_ROUTE, TABLE_TO_ENTITY_TYPE } from '../utils/profileConstants';
export { TABLE_TO_ENTITY_TYPE };

/** Inline clickable name used inside table cells to open the profile modal. */
export function ProfileLink({ label, onOpen, title }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      title={title}
      className="profile-link"
      style={{
        background: 'none', border: 'none', padding: 0, margin: 0,
        font: 'inherit', color: 'var(--text-main)', fontWeight: 600,
        cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted',
        textUnderlineOffset: '3px', textAlign: 'inherit'
      }}
    >
      {label}
    </button>
  );
}

export function getEntityBadge(type, isRTL) {
  switch (type) {
    case 'employee':
      return { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.25)', label: isRTL ? 'موظف / فني' : 'Employee' };
    case 'customer':
      return { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.25)', label: isRTL ? 'عميل' : 'Customer' };
    case 'supplier':
      return { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.25)', label: isRTL ? 'مورد' : 'Supplier' };
    case 'user':
      return { bg: 'rgba(139, 92, 246, 0.12)', text: '#7c3aed', border: 'rgba(139, 92, 246, 0.25)', label: isRTL ? 'مستخدم نظام' : 'System User' };
    default:
      return { bg: 'rgba(107, 114, 128, 0.12)', text: '#4b5563', border: 'rgba(107, 114, 128, 0.25)', label: type };
  }
}

export function getEntityIcon(type, size = 18) {
  switch (type) {
    case 'employee': return <Users size={size} />;
    case 'customer': return <Briefcase size={size} />;
    case 'supplier': return <Truck size={size} />;
    case 'user': return <Shield size={size} />;
    default: return <Users size={size} />;
  }
}

const statBox = { padding: '0.85rem', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)' };
const statLabel = { color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', marginBottom: '0.2rem' };
const sectionTitle = { 
  margin: 0, 
  fontSize: '0.98rem', 
  fontWeight: 800, 
  color: 'var(--text-main)', 
  borderBottom: '2.5px solid var(--primary)', 
  paddingBottom: '0.45rem', 
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.45rem',
  marginBottom: '-1px'
};
const inputStyle = {
  width: '100%',
  padding: '0.72rem 1rem',
  borderRadius: '10px',
  border: '1.5px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-main)',
  fontSize: '0.88rem',
  marginTop: '0.35rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.15s ease'
};

function StatBox({ label, children }) {
  return (
    <div className="profile-stat-box" style={statBox}>
      <span className="profile-stat-label" style={statLabel}>{label}</span>
      {children}
    </div>
  );
}

function StatusPill({ status, isRTL }) {
  const s = String(status || 'PENDING').toUpperCase();
  let bg = 'rgba(100, 116, 139, 0.15)';
  let color = '#64748b';
  let icon = <Clock size={11} />;

  if (['PAID', 'COMPLETED', 'DELIVERED', 'ACCEPTED', 'APPROVED', 'ACTIVE', 'PRESENT'].includes(s)) {
    bg = 'rgba(16, 185, 129, 0.15)';
    color = '#10b981';
    icon = <CheckCircle2 size={11} />;
  } else if (['PARTIAL', 'IN_PROGRESS', 'IN_TRANSIT', 'LATE', 'PENDING', 'SENT', 'DRAFT'].includes(s)) {
    bg = 'rgba(245, 158, 11, 0.15)';
    color = '#f59e0b';
    icon = <Clock size={11} />;
  } else if (['UNPAID', 'REJECTED', 'RETURNED', 'ABSENT', 'INACTIVE', 'CANCELLED'].includes(s)) {
    bg = 'rgba(239, 68, 68, 0.15)';
    color = '#ef4444';
    icon = <XCircle size={11} />;
  }

  const labelMap = {
    'COMPLETED': isRTL ? 'مكتمل' : 'Completed',
    'IN_PROGRESS': isRTL ? 'قيد التشغيل' : 'In Progress',
    'PENDING': isRTL ? 'قيد الانتظار' : 'Pending',
    'PAID': isRTL ? 'مسدد بالكامل' : 'Paid',
    'PARTIAL': isRTL ? 'سداد جزئي' : 'Partial',
    'UNPAID': isRTL ? 'غير مسدد' : 'Unpaid',
    'APPROVED': isRTL ? 'معتمد' : 'Approved',
    'DRAFT': isRTL ? 'مسودة' : 'Draft',
    'ACTIVE': isRTL ? 'نشط' : 'Active',
    'INACTIVE': isRTL ? 'معطل' : 'Inactive',
    'PRESENT': isRTL ? 'حاضر' : 'Present',
    'ABSENT': isRTL ? 'غائب' : 'Absent',
    'LATE': isRTL ? 'متأخر' : 'Late'
  };

  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem',
      fontWeight: 700, display: 'inline-flex', alignItems: 'center',
      gap: '4px', background: bg, color: color, border: `1px solid ${color}33`,
      whiteSpace: 'nowrap'
    }}>
      {icon}
      <span>{labelMap[s] || s}</span>
    </span>
  );
}

/**
 * Full profile modal with rich 360-degree reports:
 * - Work Orders
 * - Payroll & Loans
 * - Sales & Quotations
 * - Purchases & Raw Materials
 * - Line Items
 * - Executive A4 Printable Dossier Report
 */
export default function EntityProfileModal({ 
  entityType, 
  entityId, 
  onClose, 
  showOpenScreen = true, 
  initialEditMode = false 
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  const router = useRouter();
  const egp = isRTL ? 'ج.م' : 'EGP';

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'work_orders' | 'financials' | 'items' | 'report'
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(null);

  const { profile, getDisplayName, getTagline } = useCompanyProfile();
  const companyName = getDisplayName(isRTL);
  const companyTagline = getTagline(isRTL);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const record = useLiveQuery(
    async () => {
      const table = db[TYPE_TABLE[entityType]];
      if (!table || entityId === undefined || entityId === null) return null;
      return (await table.get(entityId)) || null;
    },
    [entityType, entityId]
  );

  useEffect(() => {
    if (record) {
      const timer = setTimeout(() => setFormData({ ...record }), 0);
      return () => clearTimeout(timer);
    }
  }, [record]);

  useEffect(() => {
    if (initialEditMode) {
      const timer = setTimeout(() => setIsEditing(true), 0);
      return () => clearTimeout(timer);
    }
  }, [initialEditMode]);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!record || !record.id) return;
    setIsSaving(true);
    try {
      const tableName = TYPE_TABLE[entityType];
      const table = db[tableName];
      if (!table) throw new Error("Table not found for entity type: " + entityType);
      
      const payload = {
        ...formData,
        sync_status: 'PENDING',
        updated_at: new Date().toISOString()
      };
      delete payload.id;
      
      await table.update(record.id, payload);
      setSaveToast(isRTL ? 'تم حفظ التعديلات بنجاح' : 'Changes saved successfully');
      setIsEditing(false);
      setTimeout(() => setSaveToast(null), 3500);
    } catch (err) {
      console.error('Failed to update entity:', err);
      alert((isRTL ? 'فشل حفظ التعديلات: ' : 'Failed to save changes: ') + (err?.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const related = useLiveQuery(async () => {
    if (!record) return null;
    const notDeleted = (r) => !r.deleted_at;

    if (entityType === 'employee') {
      const [
        production, 
        attendance, 
        users, 
        loans, 
        payroll, 
        allWorkOrders, 
        allSalesOrders, 
        allCustomers
      ] = await Promise.all([
        db.employee_production?.filter(r => r.employee_id === record.id && notDeleted(r)).toArray() ?? [],
        db.attendance?.filter(r => r.employee_id === record.id && notDeleted(r)).toArray() ?? [],
        db.users?.filter(u => u.employee_id === record.id && notDeleted(u)).toArray() ?? [],
        db.employee_loans?.filter(l => l.employee_id === record.id && notDeleted(l)).toArray() ?? [],
        db.payroll?.filter(p => p.employee_id === record.id && notDeleted(p)).toArray() ?? [],
        db.work_orders?.filter(w => notDeleted(w)).toArray() ?? [],
        db.sales_orders?.filter(s => notDeleted(s)).toArray() ?? [],
        db.customers?.toArray() ?? []
      ]);

      const linkedUser = users[0] || null;

      // Filter work orders where this employee is assigned or logged piece production
      const prodWoIds = new Set(production.map(p => p.work_order_id).filter(Boolean));
      const workOrders = allWorkOrders.filter(w => 
        w.employee_1 === record.id || 
        w.employee_2 === record.id || 
        w.employee_3 === record.id ||
        w.employee_4 === record.id ||
        w.employee_5 === record.id ||
        w.employee_6 === record.id ||
        prodWoIds.has(w.id)
      );

      const custMap = new Map(allCustomers.map(c => [c.id, c.customer_name]));
      const salesMap = new Map(allSalesOrders.map(s => [s.id, s]));

      // Sales orders where employee is sales rep or creator
      const salesOrders = allSalesOrders.filter(s => 
        s.employee_id === record.id || 
        s.sales_rep_id === record.id || 
        (linkedUser && s.created_by === linkedUser.username)
      );

      return { 
        production, 
        attendance, 
        linkedUser, 
        loans, 
        payroll, 
        workOrders, 
        salesOrders,
        salesMap,
        custMap
      };
    }

    if (entityType === 'customer') {
      const [sales, quotes, allWorkOrders, allSalesItems, shipping] = await Promise.all([
        db.sales_orders?.filter(r => r.customer_id === record.id && notDeleted(r)).toArray() ?? [],
        db.quotations?.filter(r => r.customer_id === record.id && notDeleted(r)).toArray() ?? [],
        db.work_orders?.filter(w => notDeleted(w)).toArray() ?? [],
        (db.sales_order_items || db.sales_items)?.filter(i => notDeleted(i)).toArray() ?? [],
        db.shipping_orders?.filter(s => notDeleted(s)).toArray() ?? []
      ]);

      const salesIds = new Set(sales.map(s => s.id));
      const workOrders = allWorkOrders.filter(w => salesIds.has(w.sales_order_id));
      const salesItems = allSalesItems.filter(i => salesIds.has(i.sales_order_id));
      const customerShipping = shipping.filter(sh => salesIds.has(sh.sales_order_id));

      return { 
        sales, 
        quotes, 
        workOrders, 
        salesItems, 
        shipping: customerShipping 
      };
    }

    if (entityType === 'supplier') {
      const [purchases, allPurchaseItems, rawMaterials] = await Promise.all([
        db.purchase_orders?.filter(r => r.supplier_id === record.id && notDeleted(r)).toArray() ?? [],
        (db.purchase_order_items || db.purchase_items)?.filter(i => notDeleted(i)).toArray() ?? [],
        db.raw_materials?.toArray() ?? []
      ]);

      const purchaseIds = new Set(purchases.map(p => p.id));
      const purchaseItems = allPurchaseItems.filter(i => purchaseIds.has(i.purchase_order_id));
      const materialMap = new Map(rawMaterials.map(m => [m.id, m]));
      const inventoryMaterials = rawMaterials.filter(m => m.supplier_id === record.id && notDeleted(m));

      return { 
        purchases, 
        purchaseItems, 
        rawMaterials,
        inventoryMaterials,
        materialMap 
      };
    }

    if (entityType === 'user') {
      const emp = record.employee_id ? await db.employees?.get(record.employee_id) : null;
      return { employee: emp || null };
    }

    return {};
  }, [record, entityType]);

  const entity = useMemo(() => {
    if (!record) return null;
    const r = record;
    const rel = related || {};
    const base = {
      id: r.id,
      address: r.address || '—',
      isActive: r.is_active !== 0 && r.is_active !== false,
    };

    if (entityType === 'employee') {
      const prod = rel.production || [];
      const att = rel.attendance || [];
      const loans = rel.loans || [];
      const payroll = rel.payroll || [];
      const workOrders = rel.workOrders || [];
      const salesOrders = rel.salesOrders || [];

      const totalBasePayroll = payroll.reduce((s, p) => s + (Number(p.base_salary) || 0), 0);
      const totalNetPayroll = payroll.reduce((s, p) => s + (Number(p.net_pay) || 0), 0);
      const totalPayrollBonuses = payroll.reduce((s, p) => s + (Number(p.production_bonus) || 0), 0);
      const totalPayrollDeductions = payroll.reduce((s, p) => s + (Number(p.deductions) || 0), 0);
      const totalPayrollLoanDeductions = payroll.reduce((s, p) => s + (Number(p.loan_deductions) || 0), 0);
      const activeLoanList = loans.filter(l => l.status === 'ACTIVE' || (!l.status && Number(l.remaining_amount) > 0));
      const totalLoansAmount = loans.reduce((s, l) => s + (Number(l.loan_amount) || 0), 0);
      const totalLoansMonthlyDed = loans.reduce((s, l) => s + (Number(l.installment_amount) || 0), 0);
      const totalLoansRemaining = loans.reduce((s, l) => s + (Number(l.remaining_amount) || 0), 0);
      const totalPieces = prod.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
      const totalPieceBonus = prod.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
      const grossEarnings = totalBasePayroll + totalPayrollBonuses;
      const totalDeductionsAll = totalPayrollDeductions + totalPayrollLoanDeductions;
      const totalWorkOrdersQty = workOrders.reduce((s, w) => s + (Number(w.quantity) || 0), 0);
      const totalEmpSales = salesOrders.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
      const totalEmpSalesPaid = salesOrders.reduce((s, o) => s + (Number(o.amount_paid) || 0), 0);
      const totalEmpSalesBalance = salesOrders.reduce((s, o) => s + (Number(o.remaining_amount) || Math.max(0, (Number(o.total_amount) || 0) - (Number(o.amount_paid) || 0))), 0);

      return {
        ...base,
        name: r.full_name || '—',
        secondaryName: r.job_title || (isRTL ? 'موظف' : 'Employee'),
        department: r.department || 'GENERAL',
        phone: r.mobile_number || r.phone || '—',
        salaryType: r.salary_type || 'MONTHLY',
        salaryAmount: Number(r.salary_amount) || 0,
        shift: `${r.shift_start_time || '08:00'} - ${r.shift_end_time || '17:00'}`,
        linkedUser: rel.linkedUser,
        totalPieces,
        totalPieceBonus,
        grossEarnings,
        totalDeductionsAll,
        presentDays: att.filter(a => a.status === 'PRESENT').length,
        absentDays: att.filter(a => a.status === 'ABSENT').length,
        lateDays: att.filter(a => a.status === 'LATE').length,
        activeLoansCount: activeLoanList.length,
        activeLoanBalance: activeLoanList.reduce((sum, l) => sum + (Number(l.remaining_amount) || 0), 0),
        totalLoansAmount,
        totalLoansMonthlyDed,
        totalLoansRemaining,
        workOrdersCount: workOrders.length,
        totalWorkOrdersQty,
        completedWorkOrders: workOrders.filter(w => w.status === 'COMPLETED').length,
        inProgressWorkOrders: workOrders.filter(w => w.status === 'IN_PROGRESS' || w.status === 'PENDING').length,
        payrollCount: payroll.length,
        totalBasePayroll,
        totalNetPayroll,
        totalPayrollBonuses,
        totalPayrollDeductions,
        totalPayrollLoanDeductions,
        salesOrdersCount: salesOrders.length,
        salesOrdersVolume: totalEmpSales,
        totalEmpSales,
        totalEmpSalesPaid,
        totalEmpSalesBalance,
        production: prod,
        attendance: att,
        loans,
        payroll,
        workOrders,
        salesOrders,
        salesMap: rel.salesMap || new Map(),
        custMap: rel.custMap || new Map(),
        recent: [...att].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 5)
          .map(a => ({ key: a.id, date: a.date, label: a.status, amount: null })),
      };
    }

    if (entityType === 'customer') {
      const sales = rel.sales || [];
      const quotes = rel.quotes || [];
      const workOrders = rel.workOrders || [];
      const salesItems = rel.salesItems || [];
      const shipping = rel.shipping || [];

      const totalAmount = sales.reduce((s, o) => s + (Number(o.total_amount) || 0), 0);
      const totalPaid = sales.reduce((s, o) => s + (Number(o.amount_paid) || 0), 0);
      const balance = r.account_balance !== undefined && r.account_balance !== null && !isNaN(Number(r.account_balance))
        ? Number(r.account_balance)
        : sales.reduce((s, o) => s + (o.remaining_amount !== undefined && o.remaining_amount !== null ? Number(o.remaining_amount) : ((Number(o.total_amount) || 0) - (Number(o.amount_paid) || 0))), 0);
      const paidPercentage = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 100;
      const totalQuotesAmount = quotes.reduce((s, q) => s + (Number(q.total_amount) || 0), 0);
      const totalItemsQuantity = salesItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const totalItemsValue = salesItems.reduce((s, i) => s + (Number(i.total_price) || ((Number(i.quantity) || 0) * (Number(i.unit_price) || 0))), 0);
      const totalWorkOrdersQty = workOrders.reduce((s, w) => s + (Number(w.quantity) || 0), 0);

      return {
        ...base,
        isActive: true,
        name: r.customer_name || '—',
        secondaryName: r.company_name || (isRTL ? 'شركة / عميل' : 'Client Account'),
        department: isRTL ? 'المبيعات والعملاء' : 'Sales & Clients',
        phone: r.mobile_number || r.phone || '—',
        email: r.email || '—',
        taxNumber: r.tax_number || '—',
        commercialReg: r.commercial_registry || '—',
        paymentTerms: r.payment_terms || '—',
        creditLimit: Number(r.credit_limit) || 0,
        notes: r.notes || '',
        balance,
        paidPercentage,
        ordersCount: sales.length,
        quotesCount: quotes.length,
        totalQuotesAmount,
        workOrdersCount: workOrders.length,
        totalWorkOrdersQty,
        itemsCount: salesItems.length,
        totalItemsQuantity,
        totalItemsValue,
        totalAmount,
        totalPaid,
        sales,
        quotes,
        workOrders,
        salesItems,
        shipping,
        recent: [...sales].sort((a, b) => String(b.order_date || b.created_at || '').localeCompare(String(a.order_date || a.created_at || ''))).slice(0, 5)
          .map(o => ({ key: o.id, date: o.order_date || o.created_at, label: o.order_number || o.status || `#${o.id}`, amount: Number(o.total_amount) || 0 })),
      };
    }

    if (entityType === 'supplier') {
      const purchases = rel.purchases || [];
      const purchaseItems = rel.purchaseItems || [];
      const rawMaterials = rel.rawMaterials || [];
      const totalAmount = purchases.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
      const totalPaid = purchases.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0);
      const balance = r.account_balance !== undefined && r.account_balance !== null && !isNaN(Number(r.account_balance))
        ? Number(r.account_balance)
        : purchases.reduce((s, p) => s + (p.remaining_amount !== undefined && p.remaining_amount !== null ? Number(p.remaining_amount) : ((Number(p.total_amount) || 0) - (Number(p.amount_paid) || 0))), 0);
      const paidPercentage = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 100;
      const totalItemsQuantity = purchaseItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
      const totalItemsValue = purchaseItems.reduce((s, i) => s + (Number(i.total_price) || ((Number(i.quantity) || 0) * (Number(i.unit_price) || 0))), 0);

      return {
        ...base,
        isActive: true,
        name: r.supplier_name || '—',
        secondaryName: r.contact_person ? `${isRTL ? 'مسؤول الاتصال:' : 'Contact:'} ${r.contact_person}` : (isRTL ? 'مورد خامات' : 'Raw Materials Supplier'),
        contactPerson: r.contact_person || '—',
        department: isRTL ? 'المشتريات والموردين' : 'Purchasing & Suppliers',
        phone: r.mobile_number || r.phone || '—',
        email: r.email || '—',
        taxNumber: r.tax_number || '—',
        commercialReg: r.commercial_registry || '—',
        paymentTerms: r.payment_terms || '—',
        notes: r.notes || '',
        balance,
        paidPercentage,
        ordersCount: purchases.length,
        itemsCount: purchaseItems.length,
        totalItemsQuantity,
        totalItemsValue,
        totalAmount,
        totalPaid,
        purchases,
        purchaseItems,
        rawMaterials,
        inventoryMaterials: rel.inventoryMaterials || [],
        materialMap: rel.materialMap || new Map(),
        recent: [...purchases].sort((a, b) => String(b.order_date || b.created_at || '').localeCompare(String(a.order_date || a.created_at || ''))).slice(0, 5)
          .map(p => ({ key: p.id, date: p.order_date || p.created_at, label: p.order_number || p.status || `#${p.id}`, amount: Number(p.total_amount) || 0 })),
      };
    }

    // user
    const emp = rel.employee;
    return {
      ...base,
      address: '—',
      name: r.username || 'User',
      secondaryName: emp ? emp.full_name : (isRTL ? 'حساب نظام غير مرتبط بموظف' : 'Standalone Account'),
      department: r.role || 'ADMIN',
      phone: emp ? (emp.mobile_number || emp.phone || '—') : '—',
      role: r.role || 'ADMIN',
      hasPin: !!r.pin_code,
      employeeName: emp ? emp.full_name : null,
      employee: emp,
    };
  }, [record, related, entityType, isRTL]);

  const badge = getEntityBadge(entityType, isRTL);
  const loading = record === undefined;

  const handlePrintFullReport = () => {
    setActiveTab('report');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="modern-modal-overlay"
      style={{ zIndex: 10005 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="print-modal-container glass-card modern-modal-dialog modal-body-scroll"
        style={{
          width: activeTab === 'report' ? 'min(94vw, 960px)' : 'min(92vw, 880px)', 
          maxWidth: activeTab === 'report' ? 'min(94vw, 960px)' : 'min(92vw, 880px)', 
          maxHeight: '86vh', 
          overflowY: 'auto',
          padding: 'clamp(1.1rem, 2vw, 1.5rem)', 
          display: 'flex', flexDirection: 'column', gap: '1.1rem',
          direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left',
          transition: 'max-width 0.2s ease'
        }}
      >
        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {isRTL ? 'جاري تحميل الملف وسجلات العمليات...' : 'Loading full profile and linked records...'}
          </div>
        )}

        {!loading && !entity && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {isRTL ? 'لم يتم العثور على السجل المطلوب' : 'Record not found'}
          </div>
        )}

        {entity && (
          <>
            {/* Header Toolbar */}
            <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: badge.bg, color: badge.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {getEntityIcon(entityType, 24)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>{entity.name}</h2>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      padding: '2px 8px', 
                      borderRadius: '6px', 
                      background: badge.bg, 
                      color: badge.text, 
                      fontWeight: 700 
                    }}>
                      {badge.label}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {entity.secondaryName}
                    {' • '}
                    <span style={{ color: entity.isActive ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {entity.isActive ? (isRTL ? '● نشط' : '● Active') : (isRTL ? '○ معطل' : '○ Inactive')}
                    </span>
                    {entity.phone && entity.phone !== '—' && (
                      <>
                        {' • '}
                        <span style={{ direction: 'ltr', display: 'inline-block' }}>{entity.phone}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handlePrintFullReport}
                  className="btn"
                  title={isRTL ? 'طباعة التقرير الشامل A4' : 'Print Full A4 Report'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 700,
                    borderRadius: '8px', cursor: 'pointer',
                    background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <Printer size={15} />
                  <span>{isRTL ? 'طباعة التقرير الشامل' : 'Print Full Report'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setFormData({ ...record });
                      setIsEditing(false);
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  className="btn"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 600,
                    borderRadius: '8px', cursor: 'pointer',
                    background: isEditing ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: isEditing ? '#ef4444' : '#2563eb',
                    border: `1px solid ${isEditing ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
                  }}
                >
                  {isEditing ? <RotateCcw size={14} /> : <Edit3 size={14} />}
                  <span>{isEditing ? (isRTL ? 'إلغاء التعديل' : 'Cancel Edit') : (isRTL ? 'تعديل البيانات' : 'Edit Profile')}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="modern-modal-close-btn"
                  title={isRTL ? 'إغلاق' : 'Close'}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Save Toast notification */}
            {saveToast && (
              <div style={{
                padding: '0.75rem 1rem', borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#059669', fontSize: '0.85rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                <Check size={16} />
                <span>{saveToast}</span>
              </div>
            )}

            {/* TAB NAVIGATION HEADERBAR (Protected against flex crushing with flexShrink: 0) */}
            {!isEditing && (
              <div 
                className="hide-on-print profile-tabs-headerbar" 
                style={{ 
                  display: 'flex', 
                  gap: '0.45rem', 
                  background: 'var(--surface-hover)', 
                  padding: '0.45rem 0.65rem', 
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  overflowX: 'auto', 
                  scrollbarWidth: 'none',
                  alignItems: 'center',
                  flexShrink: 0,
                  minHeight: '52px',
                  boxSizing: 'border-box'
                }}
              >
                {/* Tab 1: Overview */}
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: activeTab === 'overview' ? '1px solid var(--border)' : '1px solid transparent',
                    background: activeTab === 'overview' ? 'var(--surface)' : 'transparent',
                    boxShadow: activeTab === 'overview' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                    color: activeTab === 'overview' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: activeTab === 'overview' ? 800 : 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    height: '38px',
                    minHeight: '38px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    transition: 'all 0.18s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'overview') {
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.background = 'var(--surface-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'overview') {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Briefcase size={16} color={activeTab === 'overview' ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                  <span style={{ position: 'relative', display: 'inline-block', paddingBottom: '3px' }}>
                    {isRTL ? 'نظرة عامة (الملف)' : 'Overview'}
                    {activeTab === 'overview' && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2.5px',
                          borderRadius: '999px',
                          background: 'var(--primary)',
                          boxShadow: '0 1px 4px rgba(99, 102, 241, 0.4)'
                        }}
                      />
                    )}
                  </span>
                </button>

                {/* Tab 2: Work Orders */}
                {(entityType === 'employee' || entityType === 'customer') && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('work_orders')}
                    style={{
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      border: activeTab === 'work_orders' ? '1px solid var(--border)' : '1px solid transparent',
                      background: activeTab === 'work_orders' ? 'var(--surface)' : 'transparent',
                      boxShadow: activeTab === 'work_orders' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                      color: activeTab === 'work_orders' ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: activeTab === 'work_orders' ? 800 : 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      height: '38px',
                      minHeight: '38px',
                      boxSizing: 'border-box',
                      position: 'relative',
                      transition: 'all 0.18s ease',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'work_orders') {
                        e.currentTarget.style.color = 'var(--text-main)';
                        e.currentTarget.style.background = 'var(--surface-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'work_orders') {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Layers size={16} color={activeTab === 'work_orders' ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                    <span style={{ position: 'relative', display: 'inline-block', paddingBottom: '3px' }}>
                      {isRTL ? 'أوامر التشغيل والإنتاج' : 'Work Orders & Production'}
                      {activeTab === 'work_orders' && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '2.5px',
                            borderRadius: '999px',
                            background: 'var(--primary)',
                            boxShadow: '0 1px 4px rgba(99, 102, 241, 0.4)'
                          }}
                        />
                      )}
                    </span>
                    <span style={{ 
                      fontSize: '0.72rem', padding: '1px 7px', borderRadius: '999px',
                      background: activeTab === 'work_orders' ? 'rgba(99, 102, 241, 0.15)' : 'var(--border)',
                      color: activeTab === 'work_orders' ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {entity.workOrdersCount || 0}
                    </span>
                  </button>
                )}

                {/* Tab 3: Financials / Payroll */}
                <button
                  type="button"
                  onClick={() => setActiveTab('financials')}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: activeTab === 'financials' ? '1px solid var(--border)' : '1px solid transparent',
                    background: activeTab === 'financials' ? 'var(--surface)' : 'transparent',
                    boxShadow: activeTab === 'financials' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                    color: activeTab === 'financials' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: activeTab === 'financials' ? 800 : 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    height: '38px',
                    minHeight: '38px',
                    boxSizing: 'border-box',
                    position: 'relative',
                    transition: 'all 0.18s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'financials') {
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.background = 'var(--surface-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'financials') {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <DollarSign size={16} color={activeTab === 'financials' ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                  <span style={{ position: 'relative', display: 'inline-block', paddingBottom: '3px' }}>
                    {entityType === 'employee' 
                      ? (isRTL ? 'الرواتب والسلف' : 'Payroll & Loans')
                      : entityType === 'customer'
                        ? (isRTL ? 'الفواتير والتحصيل' : 'Invoices & Receivables')
                        : entityType === 'supplier'
                          ? (isRTL ? 'أوامر الشراء والمستحقات' : 'Purchases & Payables')
                          : (isRTL ? 'المالية' : 'Financials')}
                    {activeTab === 'financials' && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2.5px',
                          borderRadius: '999px',
                          background: 'var(--primary)',
                          boxShadow: '0 1px 4px rgba(99, 102, 241, 0.4)'
                        }}
                      />
                    )}
                  </span>
                  <span style={{ 
                    fontSize: '0.72rem', padding: '1px 7px', borderRadius: '999px',
                    background: activeTab === 'financials' ? 'rgba(99, 102, 241, 0.15)' : 'var(--border)',
                    color: activeTab === 'financials' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {entityType === 'employee' ? (entity.payrollCount || 0) : (entity.ordersCount || 0)}
                  </span>
                </button>

                {/* Tab 4: Items */}
                {(entityType === 'customer' || entityType === 'supplier') && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('items')}
                    style={{
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      border: activeTab === 'items' ? '1px solid var(--border)' : '1px solid transparent',
                      background: activeTab === 'items' ? 'var(--surface)' : 'transparent',
                      boxShadow: activeTab === 'items' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                      color: activeTab === 'items' ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: activeTab === 'items' ? 800 : 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      height: '38px',
                      minHeight: '38px',
                      boxSizing: 'border-box',
                      position: 'relative',
                      transition: 'all 0.18s ease',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== 'items') {
                        e.currentTarget.style.color = 'var(--text-main)';
                        e.currentTarget.style.background = 'var(--surface-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== 'items') {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <Package size={16} color={activeTab === 'items' ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                    <span style={{ position: 'relative', display: 'inline-block', paddingBottom: '3px' }}>
                      {entityType === 'customer' ? (isRTL ? 'المنتجات المطلوبة' : 'Ordered Products') : (isRTL ? 'الخامات الموردة' : 'Supplied Materials')}
                      {activeTab === 'items' && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '2.5px',
                            borderRadius: '999px',
                            background: 'var(--primary)',
                            boxShadow: '0 1px 4px rgba(99, 102, 241, 0.4)'
                          }}
                        />
                      )}
                    </span>
                    <span style={{ 
                      fontSize: '0.72rem', padding: '1px 7px', borderRadius: '999px',
                      background: activeTab === 'items' ? 'rgba(99, 102, 241, 0.15)' : 'var(--border)',
                      color: activeTab === 'items' ? 'var(--primary)' : 'var(--text-muted)',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {entity.itemsCount || 0}
                    </span>
                  </button>
                )}

                {/* Tab 5: Report A4 */}
                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: activeTab === 'report' ? '1px solid var(--border)' : '1px solid transparent',
                    background: activeTab === 'report' ? 'var(--surface)' : 'transparent',
                    boxShadow: activeTab === 'report' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                    color: activeTab === 'report' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: activeTab === 'report' ? 800 : 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    height: '38px',
                    minHeight: '38px',
                    boxSizing: 'border-box',
                    marginLeft: isRTL ? '0' : 'auto',
                    marginRight: isRTL ? 'auto' : '0',
                    position: 'relative',
                    transition: 'all 0.18s ease',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'report') {
                      e.currentTarget.style.color = 'var(--text-main)';
                      e.currentTarget.style.background = 'var(--surface-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'report') {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <FileSpreadsheet size={16} color={activeTab === 'report' ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                  <span style={{ position: 'relative', display: 'inline-block', paddingBottom: '3px' }}>
                    {isRTL ? 'التقرير الشامل (طباعة A4)' : 'Full Dossier Report (A4)'}
                    {activeTab === 'report' && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2.5px',
                          borderRadius: '999px',
                          background: 'var(--primary)',
                          boxShadow: '0 1px 4px rgba(99, 102, 241, 0.4)'
                        }}
                      />
                    )}
                  </span>
                </button>
              </div>
            )}

            {/* ================== GRAND TOTAL HERO BAR ================== */}
            {!isEditing && activeTab !== 'report' && entityType !== 'user' && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(16, 185, 129, 0.08) 100%)',
                border: '1.5px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '14px',
                padding: '1.15rem 1.35rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                flexShrink: 0,
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '8px',
                      background: 'var(--primary)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>
                        {isRTL ? 'ملخص الإجماليات الكلية المعتمدة (Grand Total Summary)' : 'Grand Total Summary & Balances'}
                      </span>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {entityType === 'customer' && (isRTL ? 'إجمالي المبيعات، المدفوعات المحصلة، والرصيد القائم المتبقي' : 'Total sales, collections and outstanding balance')}
                        {entityType === 'supplier' && (isRTL ? 'إجمالي المشتريات، المدفوعات المسددة، ومستحقات المورد' : 'Total purchases, disbursements and payables due')}
                        {entityType === 'employee' && (isRTL ? 'إجمالي الاستحقاقات الشاملة، صافي الرواتب المصروفة، ومتبقي السلف' : 'Gross earnings, net disbursements and remaining loan balance')}
                      </div>
                    </div>
                  </div>

                  {/* Progress pill for Customers and Suppliers */}
                  {(entityType === 'customer' || entityType === 'supplier') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'var(--surface)', padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {entityType === 'customer' ? (isRTL ? 'نسبة التحصيل:' : 'Collection Rate:') : (isRTL ? 'نسبة السداد:' : 'Payment Rate:')}
                      </div>
                      <strong style={{ fontSize: '0.9rem', color: Number(entity.paidPercentage) >= 100 ? '#10b981' : (Number(entity.paidPercentage) > 50 ? '#3b82f6' : '#f59e0b') }}>
                        {entity.paidPercentage}%
                      </strong>
                    </div>
                  )}
                </div>

                {/* Metric Cards Grid */}
                {entityType === 'customer' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {/* Grand Total Invoiced */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'الإجمالي الكلي للمبيعات' : 'Grand Total Invoiced'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>
                        {formatAmount(entity.totalAmount)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{egp}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {isRTL ? `${entity.ordersCount} أمر بيع معتمد` : `${entity.ordersCount} confirmed orders`}
                      </div>
                    </div>

                    {/* Total Collected */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'إجمالي المحصل / المسدد' : 'Grand Total Collected'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                        {formatAmount(entity.totalPaid)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{egp}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '2px' }}>
                        {isRTL ? `تم تحصيل ${entity.paidPercentage}%` : `${entity.paidPercentage}% collected`}
                      </div>
                    </div>

                    {/* Net Balance Due */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: Number(entity.balance) > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : (Number(entity.balance) < 0 ? '1px solid rgba(37, 99, 235, 0.4)' : '1px solid var(--border)') }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'صافي الرصيد المتبقي (مستحق)' : 'Net Balance Due'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: Number(entity.balance) < 0 ? '#2563eb' : (Number(entity.balance) > 0 ? '#ef4444' : '#10b981'), marginTop: '2px' }}>
                        {formatAmount(entity.balance)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{egp}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: Number(entity.balance) < 0 ? '#2563eb' : (Number(entity.balance) > 0 ? '#ef4444' : '#10b981'), marginTop: '2px' }}>
                        {Number(entity.balance) < 0 ? 'دفعة مقدمة' : (Number(entity.balance) > 0 ? (isRTL ? 'متبقي للتحصيل من العميل' : 'Pending customer settlement') : (isRTL ? 'تم تصفية كامل الحساب' : 'Fully settled'))}
                      </div>
                    </div>

                    {/* Total Items Output */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'إجمالي كميات المنتجات المباعة' : 'Total Items Sold'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#3b82f6', marginTop: '2px' }}>
                        {formatAmount(entity.totalItemsQuantity)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{isRTL ? 'قطعة/وحدة' : 'units'}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {isRTL ? `عروض أسعار: ${formatAmount(entity.totalQuotesAmount)} ${egp}` : `Quotes: ${formatAmount(entity.totalQuotesAmount)} ${egp}`}
                      </div>
                    </div>
                  </div>
                )}

                {entityType === 'supplier' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {/* Grand Total Purchases */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'الإجمالي الكلي للمشتريات' : 'Grand Total Purchases'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>
                        {formatAmount(entity.totalAmount)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{egp}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {isRTL ? `${entity.ordersCount} أمر توريد وشراء` : `${entity.ordersCount} purchase orders`}
                      </div>
                    </div>

                    {/* Total Paid */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'إجمالي المدفوع للمورد' : 'Grand Total Paid'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                        {formatAmount(entity.totalPaid)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{egp}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '2px' }}>
                        {isRTL ? `تم سداد ${entity.paidPercentage}%` : `${entity.paidPercentage}% disbursed`}
                      </div>
                    </div>

                    {/* Net Payables Due */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: Number(entity.balance) > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : (Number(entity.balance) < 0 ? '1px solid rgba(37, 99, 235, 0.4)' : '1px solid var(--border)') }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'صافي المستحق للمورد (مديونية)' : 'Net Payables Due'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: Number(entity.balance) < 0 ? '#2563eb' : (Number(entity.balance) > 0 ? '#ef4444' : '#10b981'), marginTop: '2px' }}>
                        {formatAmount(entity.balance)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{egp}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: Number(entity.balance) < 0 ? '#2563eb' : (Number(entity.balance) > 0 ? '#ef4444' : '#10b981'), marginTop: '2px' }}>
                        {Number(entity.balance) < 0 ? 'دفعة مقدمة' : (Number(entity.balance) > 0 ? (isRTL ? 'مطلوب سداده للمورد' : 'Payable to supplier') : (isRTL ? 'تم تصفية كامل المستحقات' : 'All payables cleared'))}
                      </div>
                    </div>

                    {/* Total Raw Materials */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'إجمالي كميات الخامات المستلمة' : 'Total Materials Received'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#3b82f6', marginTop: '2px' }}>
                        {formatAmount(entity.totalItemsQuantity)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{isRTL ? 'وحدة خامة' : 'units'}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {isRTL ? `إجمالي القيمة: ${formatAmount(entity.totalItemsValue)} ${egp}` : `Items value: ${formatAmount(entity.totalItemsValue)} ${egp}`}
                      </div>
                    </div>
                  </div>
                )}

                {entityType === 'employee' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                    {/* Gross Total Earnings */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'إجمالي الاستحقاقات الشاملة' : 'Grand Total Gross Earnings'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>
                        {formatAmount(entity.grossEarnings)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{egp}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {isRTL ? 'أساسي + حوافز + إنتاج قطعة' : 'Base + Bonuses + Piecework'}
                      </div>
                    </div>

                    {/* Total Net Payroll Paid */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'صافي الرواتب المصروفة' : 'Grand Total Net Disbursed'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                        {formatAmount(entity.totalNetPayroll)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{egp}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '2px' }}>
                        {isRTL ? `${entity.payroll?.length || 0} مسير راتب معتمد` : `${entity.payroll?.length || 0} payroll slips`}
                      </div>
                    </div>

                    {/* Total Deductions & Loans */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'إجمالي الاستقطاعات وخصم السلف' : 'Total Deductions & Loans'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ef4444', marginTop: '2px' }}>
                        -{formatAmount(entity.totalDeductionsAll)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{egp}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '2px' }}>
                        {isRTL ? `سلف متبقية: ${formatAmount(entity.totalLoansRemaining)} ${egp}` : `Remaining loans: ${formatAmount(entity.totalLoansRemaining)} ${egp}`}
                      </div>
                    </div>

                    {/* Piece Work & Production */}
                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'إجمالي إنتاجية القطع' : 'Total Piece Production'}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#7c3aed', marginTop: '2px' }}>
                        {formatAmount(entity.totalPieces)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{isRTL ? 'قطعة' : 'pcs'}</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#7c3aed', marginTop: '2px' }}>
                        {isRTL ? `حافز إنتاج: +${formatAmount(entity.totalPieceBonus)} ${egp}` : `Piece bonus: +${formatAmount(entity.totalPieceBonus)} ${egp}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Mathematical Equation Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '0.65rem',
                  background: 'var(--surface)',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  border: '1.5px solid var(--border)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
                  color: 'var(--text-main)'
                }}>
                  {entityType === 'customer' && (
                    <>
                      <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{isRTL ? 'إجمالي المبيعات:' : 'Total Invoiced:'} {formatAmount(entity.totalAmount)} {egp}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>—</span>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>{isRTL ? 'المحصل:' : 'Collected:'} {formatAmount(entity.totalPaid)} {egp}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>=</span>
                      <span style={{ color: Number(entity.balance) < 0 ? '#2563eb' : (Number(entity.balance) > 0 ? '#ef4444' : '#10b981'), fontWeight: 800 }}>
                        {isRTL ? 'صافي المتبقي للتحصيل:' : 'Net Balance Due:'} {formatAmount(entity.balance)} {egp}{Number(entity.balance) < 0 ? ' (دفعة مقدمة)' : ''}
                      </span>
                    </>
                  )}
                  {entityType === 'supplier' && (
                    <>
                      <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{isRTL ? 'إجمالي المشتريات:' : 'Total Purchases:'} {formatAmount(entity.totalAmount)} {egp}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>—</span>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>{isRTL ? 'المدفوع:' : 'Paid:'} {formatAmount(entity.totalPaid)} {egp}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>=</span>
                      <span style={{ color: Number(entity.balance) < 0 ? '#2563eb' : (Number(entity.balance) > 0 ? '#ef4444' : '#10b981'), fontWeight: 800 }}>
                        {isRTL ? 'صافي المستحق للمورد:' : 'Net Payables Due:'} {formatAmount(entity.balance)} {egp}{Number(entity.balance) < 0 ? ' (دفعة مقدمة)' : ''}
                      </span>
                    </>
                  )}
                  {entityType === 'employee' && (
                    <>
                      <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{isRTL ? 'الاستحقاقات الشاملة:' : 'Gross Earnings:'} {formatAmount(entity.grossEarnings)} {egp}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>—</span>
                      <span style={{ color: '#ef4444', fontWeight: 800 }}>{isRTL ? 'الاستقطاعات:' : 'Deductions:'} {formatAmount(entity.totalDeductionsAll)} {egp}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>=</span>
                      <span style={{ color: '#10b981', fontWeight: 800 }}>{isRTL ? 'صافي الرواتب المصروفة:' : 'Net Disbursed:'} {formatAmount(entity.totalNetPayroll)} {egp}</span>
                      {entity.totalLoansRemaining > 0 && (
                        <span style={{ 
                          color: '#ef4444', 
                          fontWeight: 800,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          marginInlineStart: '0.35rem'
                        }}>
                          {isRTL ? `(سلف قائمة: ${formatAmount(entity.totalLoansRemaining)} ${egp})` : `(Active Debt: ${formatAmount(entity.totalLoansRemaining)} ${egp})`}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT */}
            {isEditing ? (
              /* ================== IN-MODAL EDIT FORM ================== */
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)',
                  color: '#2563eb', fontSize: '0.85rem', fontWeight: 600
                }}>
                  {isRTL ? 'وضع التعديل المباشر: يمكنك تعديل الحقول وحفظها مباشرة في قاعدة البيانات.' : 'In-Modal Edit Mode: Modify fields and save directly to the database.'}
                </div>

                {entityType === 'customer' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={statLabel}>{isRTL ? 'اسم العميل *' : 'Customer Name *'}</label>
                      <input
                        type="text"
                        required
                        value={formData.customer_name || ''}
                        onChange={e => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'اسم الشركة' : 'Company Name'}</label>
                      <input
                        type="text"
                        value={formData.company_name || ''}
                        onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'رقم الهاتف / الموبايل' : 'Phone / Mobile'}</label>
                      <input
                        type="text"
                        value={formData.phone || formData.mobile_number || ''}
                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value, mobile_number: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'الرقم الضريبي' : 'Tax Number'}</label>
                      <input
                        type="text"
                        value={formData.tax_number || ''}
                        onChange={e => setFormData(p => ({ ...p, tax_number: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'السجل التجاري' : 'Commercial Registry'}</label>
                      <input
                        type="text"
                        value={formData.commercial_registry || ''}
                        onChange={e => setFormData(p => ({ ...p, commercial_registry: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'شروط السداد / الدفع' : 'Payment Terms'}</label>
                      <input
                        type="text"
                        value={formData.payment_terms || ''}
                        onChange={e => setFormData(p => ({ ...p, payment_terms: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'الحد الائتماني (ج.م)' : 'Credit Limit (EGP)'}</label>
                      <input
                        type="number"
                        value={formData.credit_limit ?? ''}
                        onChange={e => setFormData(p => ({ ...p, credit_limit: e.target.value ? Number(e.target.value) : '' }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={statLabel}>{isRTL ? 'العنوان الفعلي' : 'Physical Address'}</label>
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={statLabel}>{isRTL ? 'ملاحظات إضافية' : 'Notes / Remarks'}</label>
                      <textarea
                        rows={3}
                        value={formData.notes || ''}
                        onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                        className="form-input"
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}

                {entityType === 'employee' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={statLabel}>{isRTL ? 'الاسم الكامل *' : 'Full Name *'}</label>
                      <input
                        type="text"
                        required
                        value={formData.full_name || ''}
                        onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'المسمى الوظيفي' : 'Job Title'}</label>
                      <input
                        type="text"
                        value={formData.job_title || ''}
                        onChange={e => setFormData(p => ({ ...p, job_title: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'القسم' : 'Department'}</label>
                      <select
                        dir={isRTL ? 'rtl' : 'ltr'}
                        value={formData.department || 'GENERAL'}
                        onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                        className="form-input"
                        style={{ ...inputStyle, direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
                      >
                        <option value="EXECUTIVE">{isRTL ? 'الإدارة التنفيذية والعامة' : 'Executive & General Management'}</option>
                        <option value="FINANCE">{isRTL ? 'الإدارة المالية والحسابات' : 'Finance & Accounting'}</option>
                        <option value="SALES">{isRTL ? 'إدارة المبيعات والتسويق' : 'Sales & Marketing'}</option>
                        <option value="MANUFACTURING">{isRTL ? 'إدارة الإنتاج والتشغيل' : 'Production & Manufacturing'}</option>
                        <option value="WAREHOUSE">{isRTL ? 'المستودعات والخامات' : 'Warehouse & Raw Materials'}</option>
                        <option value="LOGISTICS">{isRTL ? 'الحركة واللوجستيات والشحن' : 'Logistics & Dispatch'}</option>
                        <option value="HR">{isRTL ? 'الموارد البشرية وشؤون الموظفين' : 'Human Resources'}</option>
                        <option value="GENERAL">{isRTL ? 'عام / إداري' : 'General / Admin'}</option>
                        <option value="PRODUCTION">{isRTL ? 'خطوط الإنتاج والتصنيع' : 'Production'}</option>
                        <option value="PRINTING">{isRTL ? 'قسم الطباعة والتجهيز' : 'Printing'}</option>
                        <option value="PACKAGING">{isRTL ? 'قسم التعبئة والتغليف' : 'Packaging'}</option>
                        <option value="MAINTENANCE">{isRTL ? 'الصيانة والتشغيل' : 'Maintenance'}</option>
                        <option value="ACCOUNTS">{isRTL ? 'الحسابات والمالية' : 'Accounts'}</option>
                      </select>
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'رقم الهاتف / الموبايل' : 'Phone / Mobile'}</label>
                      <input
                        type="text"
                        value={formData.mobile_number || formData.phone || ''}
                        onChange={e => setFormData(p => ({ ...p, mobile_number: e.target.value, phone: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'نظام الراتب' : 'Salary Type'}</label>
                      <select
                        value={formData.salary_type || 'MONTHLY'}
                        onChange={e => setFormData(p => ({ ...p, salary_type: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      >
                        <option value="MONTHLY">{isRTL ? 'راتب شهري ثابت' : 'Monthly'}</option>
                        <option value="DAILY">{isRTL ? 'يوميات' : 'Daily'}</option>
                        <option value="PRODUCTION">{isRTL ? 'بالقطعة / إنتاجية' : 'Piece-work'}</option>
                      </select>
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'قيمة الراتب (ج.م)' : 'Salary Amount (EGP)'}</label>
                      <input
                        type="number"
                        value={formData.salary_amount ?? ''}
                        onChange={e => setFormData(p => ({ ...p, salary_amount: e.target.value ? Number(e.target.value) : 0 }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'بداية الوردية' : 'Shift Start'}</label>
                      <input
                        type="time"
                        value={formData.shift_start_time || '08:00'}
                        onChange={e => setFormData(p => ({ ...p, shift_start_time: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'نهاية الوردية' : 'Shift End'}</label>
                      <input
                        type="time"
                        value={formData.shift_end_time || '17:00'}
                        onChange={e => setFormData(p => ({ ...p, shift_end_time: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'حالة الموظف' : 'Status'}</label>
                      <select
                        value={formData.is_active !== 0 && formData.is_active !== false ? '1' : '0'}
                        onChange={e => setFormData(p => ({ ...p, is_active: e.target.value === '1' ? 1 : 0 }))}
                        className="form-input"
                        style={inputStyle}
                      >
                        <option value="1">{isRTL ? 'نشط' : 'Active'}</option>
                        <option value="0">{isRTL ? 'معطل / غير نشط' : 'Inactive'}</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={statLabel}>{isRTL ? 'العنوان' : 'Address'}</label>
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={statLabel}>{isRTL ? 'ملاحظات' : 'Notes'}</label>
                      <textarea
                        rows={3}
                        value={formData.notes || ''}
                        onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                        className="form-input"
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}

                {entityType === 'supplier' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={statLabel}>{isRTL ? 'اسم المورد *' : 'Supplier Name *'}</label>
                      <input
                        type="text"
                        required
                        value={formData.supplier_name || ''}
                        onChange={e => setFormData(p => ({ ...p, supplier_name: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'مسؤول الاتصال' : 'Contact Person'}</label>
                      <input
                        type="text"
                        value={formData.contact_person || ''}
                        onChange={e => setFormData(p => ({ ...p, contact_person: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'رقم الهاتف / الموبايل' : 'Phone / Mobile'}</label>
                      <input
                        type="text"
                        value={formData.phone || formData.mobile_number || ''}
                        onChange={e => setFormData(p => ({ ...p, phone: e.target.value, mobile_number: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'البريد الإلكتروني' : 'Email Address'}</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'الرقم الضريبي' : 'Tax Number'}</label>
                      <input
                        type="text"
                        value={formData.tax_number || ''}
                        onChange={e => setFormData(p => ({ ...p, tax_number: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'السجل التجاري' : 'Commercial Registry'}</label>
                      <input
                        type="text"
                        value={formData.commercial_registry || ''}
                        onChange={e => setFormData(p => ({ ...p, commercial_registry: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'شروط السداد' : 'Payment Terms'}</label>
                      <input
                        type="text"
                        value={formData.payment_terms || ''}
                        onChange={e => setFormData(p => ({ ...p, payment_terms: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={statLabel}>{isRTL ? 'العنوان' : 'Address'}</label>
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={statLabel}>{isRTL ? 'ملاحظات المورد' : 'Supplier Notes'}</label>
                      <textarea
                        rows={3}
                        value={formData.notes || ''}
                        onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                        className="form-input"
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}

                {entityType === 'user' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={statLabel}>{isRTL ? 'اسم المستخدم *' : 'Username *'}</label>
                      <input
                        type="text"
                        required
                        value={formData.username || ''}
                        onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'الدور / الصلاحية' : 'Role / Permission'}</label>
                      <select
                        value={formData.role || 'ADMIN'}
                        onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="CASHIER">CASHIER</option>
                        <option value="OPERATOR">OPERATOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'رمز PIN السريع (4 أرقام)' : 'Quick PIN (4 digits)'}</label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="••••"
                        value={formData.pin_code || ''}
                        onChange={e => setFormData(p => ({ ...p, pin_code: e.target.value }))}
                        className="form-input"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={statLabel}>{isRTL ? 'حالة الحساب' : 'Account Status'}</label>
                      <select
                        value={formData.is_active !== 0 && formData.is_active !== false ? '1' : '0'}
                        onChange={e => setFormData(p => ({ ...p, is_active: e.target.value === '1' ? 1 : 0 }))}
                        className="form-input"
                        style={inputStyle}
                      >
                        <option value="1">{isRTL ? 'نشط ومصرح له بالدخول' : 'Active'}</option>
                        <option value="0">{isRTL ? 'معطل / موقوف' : 'Inactive'}</option>
                      </select>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <>
                {/* ================== TAB 1: OVERVIEW ================== */}
                {activeTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Identity Cards */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '0.85rem', 
                      background: 'var(--surface-hover)', 
                      padding: '1.15rem', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border)', 
                      fontSize: '0.85rem' 
                    }}>
                      <div>
                        <span className="profile-stat-label" style={statLabel}>{isRTL ? 'المعرف الفريد (ID):' : 'System ID:'}</span>
                        <strong style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>{entity.id}</strong>
                      </div>
                      <div>
                        <span className="profile-stat-label" style={statLabel}>{isRTL ? 'رقم الهاتف / الموبايل:' : 'Phone Number:'}</span>
                        <strong style={{ direction: 'ltr', display: 'inline-block' }}>{entity.phone}</strong>
                      </div>
                      <div>
                        <span className="profile-stat-label" style={statLabel}>{isRTL ? 'القسم / النشاط:' : 'Department / Sector:'}</span>
                        <strong>{i18n.exists(String(entity.department).toLowerCase()) ? t(String(entity.department).toLowerCase()) : (i18n.exists(String(entity.department)) ? t(String(entity.department)) : entity.department)}</strong>
                      </div>
                      <div>
                        <span className="profile-stat-label" style={statLabel}>{isRTL ? 'العنوان / الموقع:' : 'Physical Address:'}</span>
                        <strong>{entity.address || '—'}</strong>
                      </div>
                      {entityType === 'customer' && (
                        <>
                          <div>
                            <span className="profile-stat-label" style={statLabel}>{isRTL ? 'الرقم الضريبي:' : 'Tax Number:'}</span>
                            <strong>{entity.taxNumber}</strong>
                          </div>
                          <div>
                            <span className="profile-stat-label" style={statLabel}>{isRTL ? 'الحد الائتماني:' : 'Credit Limit:'}</span>
                            <strong style={{ color: '#10b981' }}>{formatAmount(entity.creditLimit)} {egp}</strong>
                          </div>
                        </>
                      )}
                      {entityType === 'supplier' && (
                        <>
                          <div>
                            <span className="profile-stat-label" style={statLabel}>{isRTL ? 'مسؤول الاتصال:' : 'Contact Person:'}</span>
                            <strong>{entity.contactPerson}</strong>
                          </div>
                          <div>
                            <span className="profile-stat-label" style={statLabel}>{isRTL ? 'الرقم الضريبي:' : 'Tax Number:'}</span>
                            <strong>{entity.taxNumber}</strong>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Employee Overview KPIs */}
                    {entityType === 'employee' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div style={{ borderBottom: '1.5px solid var(--border)', paddingBottom: '0.15rem' }}>
                          <h4 className="profile-section-title" style={sectionTitle}>
                            <Briefcase size={16} color="var(--primary)" />
                            <span>{isRTL ? 'مؤشرات الأداء وبيانات العمل والرواتب' : 'Employment & Financial Standing'}</span>
                          </h4>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
                          <StatBox label={isRTL ? 'نظام الراتب:' : 'Salary Type:'}><strong style={{ color: '#10b981' }}>{entity.salaryType}</strong></StatBox>
                          <StatBox label={isRTL ? 'الراتب الأساسي:' : 'Base Salary:'}><strong style={{ color: '#10b981' }}>{formatAmount(entity.salaryAmount)} {egp}</strong></StatBox>
                          <StatBox label={isRTL ? 'إجمالي الاستحقاقات:' : 'Gross Earnings:'}><strong style={{ color: 'var(--primary)' }}>{formatAmount(entity.grossEarnings)} {egp}</strong></StatBox>
                          <StatBox label={isRTL ? 'أوامر التشغيل:' : 'Work Orders:'}><strong style={{ color: '#3b82f6' }}>{entity.workOrdersCount}</strong></StatBox>
                          <StatBox label={isRTL ? 'الإنتاج بالقطعة:' : 'Piece Units:'}><strong style={{ color: '#7c3aed' }}>{entity.totalPieces}</strong></StatBox>
                          <StatBox label={isRTL ? 'صافي الرواتب المصروفة:' : 'Total Net Payroll:'}><strong style={{ color: '#10b981' }}>{formatAmount(entity.totalNetPayroll)} {egp}</strong></StatBox>
                          <StatBox label={isRTL ? 'سلف متبقية:' : 'Remaining Loans:'}>
                            <strong style={{ color: entity.activeLoanBalance > 0 ? '#ef4444' : '#10b981' }}>
                              {formatAmount(entity.activeLoanBalance)} {egp}
                            </strong>
                          </StatBox>
                        </div>
                      </div>
                    )}

                    {/* Customer / Supplier Overview KPIs */}
                    {(entityType === 'customer' || entityType === 'supplier') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div style={{ borderBottom: '1.5px solid var(--border)', paddingBottom: '0.15rem' }}>
                          <h4 className="profile-section-title" style={sectionTitle}>
                            <TrendingUp size={16} color="var(--primary)" />
                            <span>{entityType === 'customer' ? (isRTL ? 'الموقف المالي والتعاقدات' : 'Financials & Orders') : (isRTL ? 'أوامر الشراء والمستحقات' : 'Purchasing & Payables')}</span>
                          </h4>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
                          <StatBox label={isRTL ? 'إجمالي الأوامر:' : 'Total Orders:'}><strong>{entity.ordersCount}</strong></StatBox>
                          {entityType === 'customer' && (
                            <>
                              <StatBox label={isRTL ? 'عروض الأسعار:' : 'Quotations:'}><strong>{entity.quotesCount}</strong></StatBox>
                              <StatBox label={isRTL ? 'أوامر تشغيل المصنع:' : 'Work Orders:'}><strong style={{ color: '#3b82f6' }}>{entity.workOrdersCount}</strong></StatBox>
                            </>
                          )}
                          <StatBox label={isRTL ? 'إجمالي القيمة:' : 'Total Value:'}><strong style={{ color: '#10b981' }}>{formatAmount(entity.totalAmount)} {egp}</strong></StatBox>
                          <StatBox label={isRTL ? 'المدفوع / المسدد:' : 'Paid:'}><strong style={{ color: '#3b82f6' }}>{formatAmount(entity.totalPaid)} {egp}</strong></StatBox>
                          <StatBox label={isRTL ? 'الرصيد القائم:' : 'Outstanding Balance:'}>
                            <strong style={{ color: entity.balance < 0 ? '#2563eb' : (entity.balance > 0 ? '#ef4444' : '#10b981') }}>
                              {formatAmount(entity.balance)} {egp}{entity.balance < 0 ? ' (دفعة مقدمة)' : ''}
                            </strong>
                          </StatBox>
                        </div>
                      </div>
                    )}

                    {/* User Overview */}
                    {entityType === 'user' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div style={{ borderBottom: '1.5px solid var(--border)', paddingBottom: '0.15rem' }}>
                          <h4 className="profile-section-title" style={sectionTitle}>
                            <Shield size={16} color="var(--primary)" />
                            <span>{isRTL ? 'بيانات الحساب والصلاحيات' : 'Account & Access'}</span>
                          </h4>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}>
                          <StatBox label={isRTL ? 'الدور / الصلاحية:' : 'Role:'}><strong style={{ color: '#7c3aed' }}>{entity.role}</strong></StatBox>
                          <StatBox label={isRTL ? 'الموظف المرتبط:' : 'Linked Employee:'}><strong>{entity.employeeName || '—'}</strong></StatBox>
                          <StatBox label={isRTL ? 'رمز PIN السريع:' : 'Quick PIN:'}><strong style={{ fontFamily: 'monospace' }}>{entity.hasPin ? '••••' : '—'}</strong></StatBox>
                        </div>
                      </div>
                    )}

                    {/* Recent Activity */}
                    {entity.recent && entity.recent.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div style={{ borderBottom: '1.5px solid var(--border)', paddingBottom: '0.15rem' }}>
                          <h4 className="profile-section-title" style={sectionTitle}>
                            <Clock size={16} color="var(--primary)" />
                            <span>{isRTL ? 'آخر النشاطات المسجلة' : 'Recent Recorded Activity'}</span>
                          </h4>
                        </div>
                        <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', fontSize: '0.82rem' }}>
                          {entity.recent.map((item, i) => (
                            <div key={item.key ?? i} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.6rem 0.9rem', borderTop: i ? '1px solid var(--border)' : 'none', background: i % 2 ? 'var(--surface-hover)' : 'var(--surface)' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{item.date ? String(item.date).slice(0, 10) : '—'}</span>
                              <span style={{ fontWeight: 600 }}>{item.label}</span>
                              {item.amount !== null && <strong>{formatAmount(item.amount)} {egp}</strong>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ================== TAB 2: WORK ORDERS & PRODUCTION ================== */}
                {activeTab === 'work_orders' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1.5px solid var(--border)', paddingBottom: '0.15rem' }}>
                      <h4 className="profile-section-title" style={sectionTitle}>
                        <Layers size={16} color="var(--primary)" />
                        <span>{entityType === 'employee' ? (isRTL ? 'أوامر التشغيل المسندة للموظف والإنتاجية' : 'Assigned Work Orders & Piece Production') : (isRTL ? 'أوامر تصنيع طلبات العميل بالمصنع' : 'Factory Work Orders for Customer Orders')}</span>
                      </h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {isRTL ? `إجمالي الأوامر: ${entity.workOrdersCount}` : `Total Orders: ${entity.workOrdersCount}`}
                      </span>
                    </div>

                    {/* Work Orders Table */}
                    {entity.workOrders && entity.workOrders.length > 0 ? (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', background: 'var(--surface)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: isRTL ? 'right' : 'left' }}>
                          <thead>
                            <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                              <th style={{ padding: '0.6rem 0.8rem' }}>#</th>
                              <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'رقم أمر التشغيل' : 'Work Order'}</th>
                              <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'أمر البيع المرتبط' : 'Sales Order'}</th>
                              <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'الحالة' : 'Status'}</th>
                              <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'تاريخ البدء' : 'Start Date'}</th>
                              <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'تاريخ الإنهاء' : 'End Date'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entity.workOrders.map((wo, i) => {
                              const sOrder = entity.salesMap?.get(wo.sales_order_id);
                              const custName = sOrder ? entity.custMap?.get(sOrder.customer_id) : null;
                              return (
                                <tr key={wo.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                                  <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                    #{String(wo.id).slice(0, 8).toUpperCase()}
                                  </td>
                                  <td style={{ padding: '0.6rem 0.8rem' }}>
                                    {wo.sales_order_id ? (
                                      <span>
                                        #{String(wo.sales_order_id).slice(0, 8).toUpperCase()}
                                        {custName ? <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> ({custName})</span> : ''}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td style={{ padding: '0.6rem 0.8rem' }}>
                                    <StatusPill status={wo.status} isRTL={isRTL} />
                                  </td>
                                  <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{wo.start_date || '—'}</td>
                                  <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{wo.end_date || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                        {isRTL ? 'لا توجد أوامر تشغيل مرتبطة مسجلة حتى الآن' : 'No linked work orders found'}
                      </div>
                    )}

                    {/* Employee Piece-Work Output Sub-Section */}
                    {entityType === 'employee' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 className="profile-section-title" style={sectionTitle}>{isRTL ? 'سجل الإنتاج وحوافز القطع (Piece-work Log)' : 'Piece-work Production Log'}</h4>
                          <span style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: 700 }}>
                            {isRTL ? `الإجمالي: ${entity.totalPieces} قطعة / ${formatAmount(entity.totalPieceBonus)} ${egp}` : `Total: ${entity.totalPieces} pcs / ${formatAmount(entity.totalPieceBonus)} ${egp}`}
                          </span>
                        </div>

                        {entity.production && entity.production.length > 0 ? (
                          <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', background: 'var(--surface)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: isRTL ? 'right' : 'left' }}>
                              <thead>
                                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                  <th style={{ padding: '0.55rem 0.75rem' }}>{isRTL ? 'التاريخ' : 'Date'}</th>
                                  <th style={{ padding: '0.55rem 0.75rem' }}>{isRTL ? 'أمر التشغيل' : 'Work Order'}</th>
                                  <th style={{ padding: '0.55rem 0.75rem' }}>{isRTL ? 'الكمية (قطع)' : 'Quantity (Pcs)'}</th>
                                  <th style={{ padding: '0.55rem 0.75rem' }}>{isRTL ? 'فئة القطعة' : 'Rate/Pc'}</th>
                                  <th style={{ padding: '0.55rem 0.75rem' }}>{isRTL ? 'إجمالي الحافز' : 'Total Bonus'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entity.production.map((p, i) => (
                                  <tr key={p.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.55rem 0.75rem' }}>{p.production_date || p.created_at?.slice(0, 10) || '—'}</td>
                                    <td style={{ padding: '0.55rem 0.75rem', fontFamily: 'monospace' }}>
                                      {p.work_order_id ? `#${String(p.work_order_id).slice(0, 8).toUpperCase()}` : '—'}
                                    </td>
                                    <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>{p.quantity || 0}</td>
                                    <td style={{ padding: '0.55rem 0.75rem' }}>{formatAmount(p.rate_per_piece || 0)} {egp}</td>
                                    <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700, color: '#7c3aed' }}>
                                      {formatAmount(p.total_amount || 0)} {egp}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot style={{ background: 'var(--surface-hover)', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                                <tr>
                                  <td colSpan={2} style={{ padding: '0.65rem 0.75rem', textAlign: isRTL ? 'right' : 'left' }}>
                                    {isRTL ? 'الإجمالي الكلي للإنتاج بالقطع:' : 'Total Piece Production:'}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.75rem', color: '#7c3aed', fontSize: '0.9rem' }}>
                                    {formatAmount(entity.totalPieces)} {isRTL ? 'قطعة' : 'pcs'}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)' }}>—</td>
                                  <td style={{ padding: '0.65rem 0.75rem', color: '#10b981', fontSize: '0.92rem' }}>
                                    {formatAmount(entity.totalPieceBonus)} {egp}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px', fontSize: '0.85rem' }}>
                            {isRTL ? 'لا توجد إنتاجية بالقطعة مسجلة لهذا الموظف' : 'No piece-work records logged for this employee'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ================== TAB 3: FINANCIALS & PAYROLL ================== */}
                {activeTab === 'financials' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Employee Payroll & Loans */}
                    {entityType === 'employee' && (
                      <>
                        {/* Financial Equation Card */}
                        <div style={{
                          background: 'var(--surface-hover)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <h4 className="profile-section-title" style={sectionTitle}>
                              <Receipt size={16} color="var(--primary)" />
                              <span>{isRTL ? 'معادلة الإجمالي الكلي للرواتب والاستحقاقات' : 'Grand Total Compensation & Net Pay Equation'}</span>
                            </h4>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {isRTL ? 'احتساب تلقائي شامل لكافة مسيرات الرواتب وحوافز الإنتاج' : 'Automated aggregate of all payroll slips and production incentives'}
                            </span>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: '0.75rem',
                            alignItems: 'center'
                          }}>
                            <div style={{ background: 'var(--surface)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? '1. إجمالي الاستحقاقات (Gross)' : '1. Total Gross'}</div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>
                                {formatAmount(entity.grossEarnings)} {egp}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {isRTL ? `أساسي: ${formatAmount(entity.totalBasePayroll)} | حوافز: ${formatAmount(entity.totalPayrollBonuses + entity.totalPieceBonus)}` : `Base: ${formatAmount(entity.totalBasePayroll)} | Bonus: ${formatAmount(entity.totalPayrollBonuses + entity.totalPieceBonus)}`}
                              </div>
                            </div>

                            <div style={{ background: 'var(--surface)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? '2. إجمالي الخصومات والسلف' : '2. Total Deductions'}</div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ef4444', marginTop: '2px' }}>
                                -{formatAmount(entity.totalDeductionsAll)} {egp}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#ef4444' }}>
                                {isRTL ? `خصومات: ${formatAmount(entity.totalPayrollDeductions)} | سلف: ${formatAmount(entity.totalPayrollLoanDeductions)}` : `Deductions: ${formatAmount(entity.totalPayrollDeductions)} | Loans: ${formatAmount(entity.totalPayrollLoanDeductions)}`}
                              </div>
                            </div>

                            <div style={{ background: 'var(--surface)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1.5px solid rgba(16, 185, 129, 0.4)' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? '3. صافي الرواتب المصروفة' : '3. Total Net Disbursed'}</div>
                              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                                {formatAmount(entity.totalNetPayroll)} {egp}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#10b981' }}>
                                {isRTL ? 'تم الصرف بنجاح' : 'Disbursed to employee'}
                              </div>
                            </div>

                            <div style={{ background: 'var(--surface)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: Number(entity.totalLoansRemaining) > 0 ? '1.5px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? '4. رصيد السلف القائم' : '4. Active Loan Debt'}</div>
                              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: Number(entity.totalLoansRemaining) > 0 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                                {formatAmount(entity.totalLoansRemaining)} {egp}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {isRTL ? `إجمالي السلف: ${formatAmount(entity.totalLoansAmount)}` : `Total borrowed: ${formatAmount(entity.totalLoansAmount)}`}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* If employee is an agent/salesperson with sales */}
                        {entity.totalEmpSales > 0 && (
                          <div style={{
                            background: 'rgba(59, 130, 246, 0.06)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            borderRadius: '10px',
                            padding: '0.85rem 1.15rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.75rem'
                          }}>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb' }}>
                                {isRTL ? 'إجمالي مبيعات الموظف كمندوب / مسؤول بيع' : 'Employee Sales Performance'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {isRTL ? 'إجمالي فواتير المبيعات المسجلة برقم هذا الموظف' : 'Total sales orders registered under this employee'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? 'إجمالي المبيعات:' : 'Total Sales:'} </span>
                                <strong style={{ color: '#2563eb' }}>{formatAmount(entity.totalEmpSales)} {egp}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? 'المحصل منها:' : 'Collected:'} </span>
                                <strong style={{ color: '#10b981' }}>{formatAmount(entity.totalEmpSalesPaid)} {egp}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? 'المتبقي:' : 'Balance:'} </span>
                                <strong style={{ color: entity.totalEmpSalesBalance > 0 ? '#ef4444' : '#10b981' }}>{formatAmount(entity.totalEmpSalesBalance)} {egp}</strong>
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1.5px solid var(--border)', paddingBottom: '0.15rem' }}>
                          <h4 className="profile-section-title" style={sectionTitle}>
                            <FileSpreadsheet size={16} color="var(--primary)" />
                            <span>{isRTL ? 'سجل الرواتب والمسيرات الشهرية' : 'Monthly Payroll Slips History'}</span>
                          </h4>
                          <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 800 }}>
                            {isRTL ? `إجمالي المصروف: ${formatAmount(entity.totalNetPayroll)} ${egp}` : `Total Disbursed: ${formatAmount(entity.totalNetPayroll)} ${egp}`}
                          </span>
                        </div>

                        {entity.payroll && entity.payroll.length > 0 ? (
                          <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', background: 'var(--surface)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: isRTL ? 'right' : 'left' }}>
                              <thead>
                                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'الفترة' : 'Period'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'الأساسي' : 'Base'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'حافز الإنتاج' : 'Bonus'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'الخصومات' : 'Deductions'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'خصم السلف' : 'Loan Ded.'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'صافي الراتب' : 'Net Pay'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'الحالة' : 'Status'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entity.payroll.map((pay, i) => (
                                  <tr key={pay.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>
                                      {pay.period_start} → {pay.period_end}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.8rem' }}>{formatAmount(pay.base_salary)} {egp}</td>
                                    <td style={{ padding: '0.6rem 0.8rem', color: '#7c3aed' }}>+{formatAmount(pay.production_bonus)} {egp}</td>
                                    <td style={{ padding: '0.6rem 0.8rem', color: '#ef4444' }}>-{formatAmount(pay.deductions)} {egp}</td>
                                    <td style={{ padding: '0.6rem 0.8rem', color: '#ef4444' }}>-{formatAmount(pay.loan_deductions)} {egp}</td>
                                    <td style={{ padding: '0.6rem 0.8rem', fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>
                                      {formatAmount(pay.net_pay)} {egp}
                                    </td>
                                    <td style={{ padding: '0.6rem 0.8rem' }}>
                                      <StatusPill status={pay.status} isRTL={isRTL} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot style={{ background: 'var(--surface-hover)', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                                <tr>
                                  <td style={{ padding: '0.65rem 0.8rem' }}>
                                    {isRTL ? 'الإجمالي الكلي:' : 'Grand Total:'}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem' }}>
                                    {formatAmount(entity.totalBasePayroll)} {egp}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem', color: '#7c3aed' }}>
                                    +{formatAmount(entity.totalPayrollBonuses)} {egp}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem', color: '#ef4444' }}>
                                    -{formatAmount(entity.totalPayrollDeductions)} {egp}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem', color: '#ef4444' }}>
                                    -{formatAmount(entity.totalPayrollLoanDeductions)} {egp}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem', fontWeight: 900, color: '#10b981', fontSize: '0.95rem' }}>
                                    {formatAmount(entity.totalNetPayroll)} {egp}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem' }}></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                            {isRTL ? 'لا توجد مسيرات رواتب مسجلة حتى الآن' : 'No payroll slips recorded'}
                          </div>
                        )}

                        {/* Loans Sub-Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <div style={{ borderBottom: '1.5px solid var(--border)', paddingBottom: '0.15rem' }}>
                            <h4 className="profile-section-title" style={sectionTitle}>
                              <HandCoins size={16} color="var(--primary)" />
                              <span>{isRTL ? 'السلف والقروض القائمة والمسددة' : 'Loans & Advances Ledger'}</span>
                            </h4>
                          </div>
                          {entity.loans && entity.loans.length > 0 ? (
                            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', background: 'var(--surface)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: isRTL ? 'right' : 'left' }}>
                                <thead>
                                  <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '0.55rem 0.75rem' }}>{isRTL ? 'تاريخ السلفة' : 'Date'}</th>
                                    <th style={{ padding: '0.55rem 0.75rem' }}>{isRTL ? 'قيمة السلفة' : 'Loan Amount'}</th>
                                    <th style={{ padding: '0.55rem 0.75rem' }}>{isRTL ? 'القسط الشهري' : 'Deduction'}</th>
                                    <th style={{ padding: '0.55rem 0.75rem' }}>{isRTL ? 'المتبقي للسداد' : 'Remaining'}</th>
                                    <th style={{ padding: '0.55rem 0.75rem' }}>{isRTL ? 'الحالة' : 'Status'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entity.loans.map((l, i) => (
                                    <tr key={l.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '0.55rem 0.75rem' }}>{l.loan_date || '—'}</td>
                                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{formatAmount(l.loan_amount)} {egp}</td>
                                      <td style={{ padding: '0.55rem 0.75rem' }}>{formatAmount(l.installment_amount || 0)} {egp}</td>
                                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700, color: Number(l.remaining_amount) > 0 ? '#ef4444' : '#10b981' }}>
                                        {formatAmount(l.remaining_amount || 0)} {egp}
                                      </td>
                                      <td style={{ padding: '0.55rem 0.75rem' }}>
                                        <StatusPill status={l.status || (Number(l.remaining_amount) > 0 ? 'ACTIVE' : 'COMPLETED')} isRTL={isRTL} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot style={{ background: 'var(--surface-hover)', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                                  <tr>
                                    <td style={{ padding: '0.65rem 0.75rem' }}>
                                      {isRTL ? 'إجمالي السلف:' : 'Total Loans:'}
                                    </td>
                                    <td style={{ padding: '0.65rem 0.75rem' }}>
                                      {formatAmount(entity.totalLoansAmount)} {egp}
                                    </td>
                                    <td style={{ padding: '0.65rem 0.75rem' }}>
                                      {formatAmount(entity.totalLoansMonthlyDed)} {egp}
                                    </td>
                                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 900, color: entity.totalLoansRemaining > 0 ? '#ef4444' : '#10b981', fontSize: '0.92rem' }}>
                                      {formatAmount(entity.totalLoansRemaining)} {egp}
                                    </td>
                                    <td style={{ padding: '0.65rem 0.75rem' }}></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          ) : (
                            <div style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                              {isRTL ? 'سجل السلف نظيف، لا توجد سلف مسجلة' : 'No loans recorded'}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Customer Invoices & Ledger */}
                    {entityType === 'customer' && (
                      <>
                        {/* Financial Equation Card */}
                        <div style={{
                          background: 'var(--surface-hover)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <h4 className="profile-section-title" style={sectionTitle}>
                              <Receipt size={16} color="var(--primary)" />
                              <span>{isRTL ? 'معادلة الإجمالي الكلي ومستحقات العميل' : 'Grand Total Customer Billing Equation'}</span>
                            </h4>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {isRTL ? `نسبة السداد: ${entity.paidPercentage}%` : `Settlement: ${entity.paidPercentage}%`}
                            </div>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '0.75rem',
                            alignItems: 'center'
                          }}>
                            <div style={{ background: 'var(--surface)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? '1. إجمالي فواتير المبيعات' : '1. Total Billed'}</div>
                              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>
                                {formatAmount(entity.totalAmount)} {egp}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {isRTL ? `${entity.ordersCount} أمر بيع معتمد` : `${entity.ordersCount} confirmed orders`}
                              </div>
                            </div>

                            <div style={{ background: 'var(--surface)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? '2. إجمالي المدفوع والمحصل' : '2. Total Collected'}</div>
                              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                                {formatAmount(entity.totalPaid)} {egp}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#10b981' }}>
                                {isRTL ? `تم تحصيل ${entity.paidPercentage}% من المبيعات` : `${entity.paidPercentage}% collected`}
                              </div>
                            </div>

                            <div style={{ background: 'var(--surface)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: Number(entity.balance) > 0 ? '1.5px solid rgba(239, 68, 68, 0.4)' : (Number(entity.balance) < 0 ? '1.5px solid rgba(37, 99, 235, 0.4)' : '1px solid var(--border)') }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? '3. صافي الرصيد المتبقي (مستحق)' : '3. Net Balance Due'}</div>
                              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: Number(entity.balance) < 0 ? '#2563eb' : (Number(entity.balance) > 0 ? '#ef4444' : '#10b981'), marginTop: '2px' }}>
                                {formatAmount(entity.balance)} {egp}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: Number(entity.balance) < 0 ? '#2563eb' : (Number(entity.balance) > 0 ? '#ef4444' : '#10b981') }}>
                                {Number(entity.balance) < 0 ? 'دفعة مقدمة' : (Number(entity.balance) > 0 ? (isRTL ? 'مطلوب تحصيله من العميل' : 'Pending payment') : (isRTL ? 'الحساب خالص بالكامل' : 'Settled'))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1.5px solid var(--border)', paddingBottom: '0.15rem' }}>
                          <h4 className="profile-section-title" style={sectionTitle}>
                            <Receipt size={16} color="var(--primary)" />
                            <span>{isRTL ? 'فواتير أوامر البيع والتحصيلات' : 'Sales Orders & Invoices Ledger'}</span>
                          </h4>
                          <span style={{ fontSize: '0.85rem', color: entity.balance < 0 ? '#2563eb' : (entity.balance > 0 ? '#ef4444' : '#10b981'), fontWeight: 800 }}>
                            {isRTL ? `الرصيد المتبقي: ${formatAmount(entity.balance)} ${egp}${entity.balance < 0 ? ' (دفعة مقدمة)' : ''}` : `Balance Due: ${formatAmount(entity.balance)} ${egp}${entity.balance < 0 ? ' (دفعة مقدمة)' : ''}`}
                          </span>
                        </div>

                        {entity.sales && entity.sales.length > 0 ? (
                          <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', background: 'var(--surface)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: isRTL ? 'right' : 'left' }}>
                              <thead>
                                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'رقم الفاتورة / الأمر' : 'Order #'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'التاريخ' : 'Date'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'إجمالي القيمة' : 'Total'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'المدفوع' : 'Paid'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'المتبقي' : 'Remaining'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'حالة السداد' : 'Payment Status'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entity.sales.map((o, i) => {
                                  const rowRem = o.remaining_amount !== undefined && o.remaining_amount !== null ? Number(o.remaining_amount) : ((Number(o.total_amount) || 0) - (Number(o.amount_paid) || 0));
                                  return (
                                    <tr key={o.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                        {o.order_number || `#${String(o.id).slice(0, 8).toUpperCase()}`}
                                      </td>
                                      <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{o.order_date || o.created_at?.slice(0, 10)}</td>
                                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700 }}>{formatAmount(o.total_amount)} {egp}</td>
                                      <td style={{ padding: '0.6rem 0.8rem', color: '#10b981' }}>{formatAmount(o.amount_paid)} {egp}</td>
                                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: rowRem < 0 ? '#2563eb' : (rowRem > 0 ? '#ef4444' : '#10b981') }}>
                                        {formatAmount(rowRem)} {egp}{rowRem < 0 ? ' (دفعة مقدمة)' : ''}
                                      </td>
                                      <td style={{ padding: '0.6rem 0.8rem' }}>
                                        <StatusPill status={o.payment_status} isRTL={isRTL} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot style={{ background: 'var(--surface-hover)', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                                <tr>
                                  <td colSpan={2} style={{ padding: '0.65rem 0.8rem' }}>
                                    {isRTL ? `الإجمالي الكلي (${entity.ordersCount} أمر بيع):` : `Grand Total (${entity.ordersCount} orders):`}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem', fontSize: '0.92rem' }}>
                                    {formatAmount(entity.totalAmount)} {egp}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem', color: '#10b981', fontSize: '0.92rem' }}>
                                    {formatAmount(entity.totalPaid)} {egp}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem', fontWeight: 900, color: entity.balance < 0 ? '#2563eb' : (entity.balance > 0 ? '#ef4444' : '#10b981'), fontSize: '0.95rem' }}>
                                    {formatAmount(entity.balance)} {egp}{entity.balance < 0 ? ' (دفعة مقدمة)' : ''}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem' }}></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                            {isRTL ? 'لا توجد فواتير مبيعات مسجلة لهذا العميل' : 'No sales orders found'}
                          </div>
                        )}
                      </>
                    )}

                    {/* Supplier Purchases & Ledger */}
                    {entityType === 'supplier' && (
                      <>
                        {/* Financial Equation Card */}
                        <div style={{
                          background: 'var(--surface-hover)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                            <h4 className="profile-section-title" style={sectionTitle}>
                              <Receipt size={16} color="var(--primary)" />
                              <span>{isRTL ? 'معادلة الإجمالي الكلي ومستحقات المورد' : 'Grand Total Supplier Payables Equation'}</span>
                            </h4>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {isRTL ? `نسبة السداد: ${entity.paidPercentage}%` : `Disbursed: ${entity.paidPercentage}%`}
                            </div>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '0.75rem',
                            alignItems: 'center'
                          }}>
                            <div style={{ background: 'var(--surface)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? '1. إجمالي فواتير المشتريات' : '1. Total Purchases'}</div>
                              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>
                                {formatAmount(entity.totalAmount)} {egp}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {isRTL ? `${entity.ordersCount} أمر شراء وتوريد` : `${entity.ordersCount} purchase orders`}
                              </div>
                            </div>

                            <div style={{ background: 'var(--surface)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? '2. إجمالي المسدد للمورد' : '2. Total Paid Out'}</div>
                              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                                {formatAmount(entity.totalPaid)} {egp}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#10b981' }}>
                                {isRTL ? `تم سداد ${entity.paidPercentage}% للمورد` : `${entity.paidPercentage}% disbursed`}
                              </div>
                            </div>

                            <div style={{ background: 'var(--surface)', padding: '0.75rem 0.9rem', borderRadius: '10px', border: Number(entity.balance) > 0 ? '1.5px solid rgba(239, 68, 68, 0.4)' : (Number(entity.balance) < 0 ? '1.5px solid rgba(37, 99, 235, 0.4)' : '1px solid var(--border)') }}>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isRTL ? '3. صافي المستحق للمورد (مديونية)' : '3. Net Payables Due'}</div>
                              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: Number(entity.balance) < 0 ? '#2563eb' : (Number(entity.balance) > 0 ? '#ef4444' : '#10b981'), marginTop: '2px' }}>
                                {formatAmount(entity.balance)} {egp}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: Number(entity.balance) < 0 ? '#2563eb' : (Number(entity.balance) > 0 ? '#ef4444' : '#10b981') }}>
                                {Number(entity.balance) < 0 ? 'دفعة مقدمة' : (Number(entity.balance) > 0 ? (isRTL ? 'مطلوب سداده للمورد' : 'Pending payment to supplier') : (isRTL ? 'تم تصفية كامل المستحقات' : 'All payables cleared'))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1.5px solid var(--border)', paddingBottom: '0.15rem' }}>
                          <h4 className="profile-section-title" style={sectionTitle}>
                            <Truck size={16} color="var(--primary)" />
                            <span>{isRTL ? 'أوامر التوريد وفواتير المشتريات' : 'Purchase Orders & Invoices'}</span>
                          </h4>
                          <span style={{ fontSize: '0.85rem', color: entity.balance < 0 ? '#2563eb' : (entity.balance > 0 ? '#ef4444' : '#10b981'), fontWeight: 800 }}>
                            {isRTL ? `المستحق للمورد: ${formatAmount(entity.balance)} ${egp}${entity.balance < 0 ? ' (دفعة مقدمة)' : ''}` : `Payables Due: ${formatAmount(entity.balance)} ${egp}${entity.balance < 0 ? ' (دفعة مقدمة)' : ''}`}
                          </span>
                        </div>

                        {entity.purchases && entity.purchases.length > 0 ? (
                          <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', background: 'var(--surface)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: isRTL ? 'right' : 'left' }}>
                              <thead>
                                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'رقم أمر الشراء' : 'PO #'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'التاريخ' : 'Date'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'إجمالي القيمة' : 'Total'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'المدفوع' : 'Paid'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'المتبقي للسداد' : 'Remaining'}</th>
                                  <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'حالة السداد' : 'Payment Status'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {entity.purchases.map((p, i) => {
                                  const rowRem = p.remaining_amount !== undefined && p.remaining_amount !== null ? Number(p.remaining_amount) : ((Number(p.total_amount) || 0) - (Number(p.amount_paid) || 0));
                                  return (
                                    <tr key={p.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                        {p.order_number || `#${String(p.id).slice(0, 8).toUpperCase()}`}
                                      </td>
                                      <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{p.order_date || p.created_at?.slice(0, 10)}</td>
                                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700 }}>{formatAmount(p.total_amount)} {egp}</td>
                                      <td style={{ padding: '0.6rem 0.8rem', color: '#10b981' }}>{formatAmount(p.amount_paid)} {egp}</td>
                                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: rowRem < 0 ? '#2563eb' : (rowRem > 0 ? '#ef4444' : '#10b981') }}>
                                        {formatAmount(rowRem)} {egp}{rowRem < 0 ? ' (دفعة مقدمة)' : ''}
                                      </td>
                                      <td style={{ padding: '0.6rem 0.8rem' }}>
                                        <StatusPill status={p.payment_status} isRTL={isRTL} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot style={{ background: 'var(--surface-hover)', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                                <tr>
                                  <td colSpan={2} style={{ padding: '0.65rem 0.8rem' }}>
                                    {isRTL ? `الإجمالي الكلي (${entity.ordersCount} أمر توريد):` : `Grand Total (${entity.ordersCount} POs):`}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem', fontSize: '0.92rem' }}>
                                    {formatAmount(entity.totalAmount)} {egp}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem', color: '#10b981', fontSize: '0.92rem' }}>
                                    {formatAmount(entity.totalPaid)} {egp}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem', fontWeight: 900, color: entity.balance < 0 ? '#2563eb' : (entity.balance > 0 ? '#ef4444' : '#10b981'), fontSize: '0.95rem' }}>
                                    {formatAmount(entity.balance)} {egp}{entity.balance < 0 ? ' (دفعة مقدمة)' : ''}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.8rem' }}></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                            {isRTL ? 'لا توجد أوامر شراء مسجلة لهذا المورد' : 'No purchase orders found'}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ================== TAB 4: LINE ITEMS & PRODUCTS ================== */}
                {activeTab === 'items' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 className="profile-section-title" style={sectionTitle}>
                        {entityType === 'customer' ? (isRTL ? 'سجل المنتجات والكرتون المطلوب' : 'Ordered Packaging Line Items') : (isRTL ? 'سجل الخامات الموردة للمصنع' : 'Supplied Raw Materials Log')}
                      </h4>
                      <span style={{ fontSize: '0.82rem', color: '#2563eb', fontWeight: 700 }}>
                        {isRTL ? `إجمالي الكميات: ${formatAmount(entity.totalItemsQuantity)} وحدة` : `Total Quantity: ${formatAmount(entity.totalItemsQuantity)} units`}
                      </span>
                    </div>

                    {/* Customer Sales Items */}
                    {entityType === 'customer' && (
                      entity.salesItems && entity.salesItems.length > 0 ? (
                        <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', background: 'var(--surface)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: isRTL ? 'right' : 'left' }}>
                            <thead>
                              <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '0.6rem 0.8rem' }}>#</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'اسم الصنف / المنتج' : 'Product / Box Name'}</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'رقم أمر البيع' : 'Sales Order'}</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'الكمية' : 'Quantity'}</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
                                <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'إجمالي السعر' : 'Total Price'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entity.salesItems.map((item, i) => (
                                <tr key={item.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                                  <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700 }}>{item.product_name || item.item_name || '—'}</td>
                                  <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'monospace' }}>#{String(item.sales_order_id).slice(0, 8).toUpperCase()}</td>
                                  <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700 }}>{formatAmount(item.quantity)}</td>
                                  <td style={{ padding: '0.6rem 0.8rem' }}>{formatAmount(item.unit_price)} {egp}</td>
                                  <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#10b981' }}>{formatAmount(item.total_price || (Number(item.quantity) * Number(item.unit_price)))} {egp}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot style={{ background: 'var(--surface-hover)', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                              <tr>
                                <td colSpan={3} style={{ padding: '0.65rem 0.8rem' }}>
                                  {isRTL ? `إجمالي بنود وكميات المنتجات (${entity.itemsCount} صنف):` : `Total Items & Quantities (${entity.itemsCount} items):`}
                                </td>
                                <td style={{ padding: '0.65rem 0.8rem', color: '#2563eb', fontSize: '0.92rem' }}>
                                  {formatAmount(entity.totalItemsQuantity)}
                                </td>
                                <td style={{ padding: '0.65rem 0.8rem', color: 'var(--text-muted)' }}>—</td>
                                <td style={{ padding: '0.65rem 0.8rem', fontWeight: 900, color: '#10b981', fontSize: '0.95rem' }}>
                                  {formatAmount(entity.totalItemsValue)} {egp}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                          {isRTL ? 'لا توجد بنود منتجات مسجلة' : 'No items recorded'}
                        </div>
                      )
                    )}

                    {/* Supplier Purchase & Stock Items */}
                    {entityType === 'supplier' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {entity.inventoryMaterials && entity.inventoryMaterials.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <Box size={16} color="var(--primary)" />
                                <span>{isRTL ? 'أصناف وخامات المخزن المسندة لهذا المورد' : 'Warehouse Stock Materials Supplied'}</span>
                                <span style={{ fontSize: '0.75rem', padding: '1px 7px', borderRadius: '999px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', fontWeight: 700 }}>
                                  {entity.inventoryMaterials.length}
                                </span>
                              </h4>
                            </div>

                            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', background: 'var(--surface)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: isRTL ? 'right' : 'left' }}>
                                <thead>
                                  <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>#</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'اسم الخامة / الصنف' : 'Material Name'}</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'التصنيف' : 'Category'}</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'الرصيد بالمخزن' : 'Stock Quantity'}</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'الوحدة' : 'Unit'}</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'سعر التكلفة' : 'Cost Price'}</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'إجمالي قيمة المخزون' : 'Total Stock Value'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entity.inventoryMaterials.map((mat, idx) => {
                                    const qty = Number(mat.stock_quantity) || 0;
                                    const price = Number(mat.unit_price) || 0;
                                    const totalVal = qty * price;
                                    const isLow = Number(mat.min_stock_alert) > 0 && qty <= Number(mat.min_stock_alert);

                                    return (
                                      <tr key={mat.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                          {mat.material_name}
                                        </td>
                                        <td style={{ padding: '0.6rem 0.8rem' }}>
                                          <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--surface-hover)', fontSize: '0.75rem', fontWeight: 600 }}>
                                            {t(mat.category) || mat.category}
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 800, color: isLow ? '#ef4444' : '#10b981' }}>
                                          {formatAmount(qty)} {isLow && <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>⚠️</span>}
                                        </td>
                                        <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{t(mat.unit) || mat.unit}</td>
                                        <td style={{ padding: '0.6rem 0.8rem' }}>{formatAmount(price)} {egp}</td>
                                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#10b981' }}>{formatAmount(totalVal)} {egp}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <ShoppingBag size={16} color="var(--primary)" />
                            <span>{isRTL ? 'سجل توريدات أوامر الشراء' : 'Purchase Orders Items History'}</span>
                          </h4>

                          {entity.purchaseItems && entity.purchaseItems.length > 0 ? (
                            <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflowX: 'auto', background: 'var(--surface)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: isRTL ? 'right' : 'left' }}>
                                <thead>
                                  <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>#</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'الخامة / الصنف' : 'Raw Material'}</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'رقم أمر الشراء' : 'PO Ref'}</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'الكمية' : 'Quantity'}</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
                                    <th style={{ padding: '0.6rem 0.8rem' }}>{isRTL ? 'إجمالي القيمة' : 'Total'}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entity.purchaseItems.map((item, i) => {
                                    const mat = entity.materialMap?.get(item.raw_material_id);
                                    return (
                                      <tr key={item.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700 }}>
                                          {mat ? mat.material_name : (item.material_name || item.raw_material_id || '—')}
                                          {mat?.category && <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> ({mat.category})</span>}
                                        </td>
                                        <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'monospace' }}>#{String(item.purchase_order_id).slice(0, 8).toUpperCase()}</td>
                                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700 }}>{formatAmount(item.quantity)}</td>
                                        <td style={{ padding: '0.6rem 0.8rem' }}>{formatAmount(item.unit_price)} {egp}</td>
                                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700, color: '#10b981' }}>{formatAmount(item.total_price || (Number(item.quantity) * Number(item.unit_price)))} {egp}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot style={{ background: 'var(--surface-hover)', borderTop: '2px solid var(--border)', fontWeight: 800 }}>
                                  <tr>
                                    <td colSpan={3} style={{ padding: '0.65rem 0.8rem' }}>
                                      {isRTL ? `إجمالي خامات التوريد (${entity.itemsCount} خامة):` : `Total Supplied Materials (${entity.itemsCount} materials):`}
                                    </td>
                                    <td style={{ padding: '0.65rem 0.8rem', color: '#2563eb', fontSize: '0.92rem' }}>
                                      {formatAmount(entity.totalItemsQuantity)}
                                    </td>
                                    <td style={{ padding: '0.65rem 0.8rem', color: 'var(--text-muted)' }}>—</td>
                                    <td style={{ padding: '0.65rem 0.8rem', fontWeight: 900, color: '#10b981', fontSize: '0.95rem' }}>
                                      {formatAmount(entity.totalItemsValue)} {egp}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          ) : (
                            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                              {isRTL ? 'لا توجد بنود مشتريات مسجلة بأوامر الشراء' : 'No purchase order items recorded'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ================== TAB 5: FULL DOSSIER REPORT (PRINTABLE) ================== */}
                {activeTab === 'report' && (
                  <div className="entity-print-dossier" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#fff', color: '#18181b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
                    {/* Top print action button for user */}
                    <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px dashed #e4e4e7' }}>
                      <span style={{ fontSize: '0.85rem', color: '#71717a', fontWeight: 600 }}>
                        {isRTL ? 'معاينة جاهزة للطباعة والتصدير الورقي القياسي A4' : 'A4 Ready Standard Printable Executive Dossier'}
                      </span>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.45rem',
                          padding: '0.6rem 1.4rem', borderRadius: '8px',
                          background: '#2563eb', color: '#fff', border: 'none',
                          fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
                          boxShadow: '0 2px 8px rgba(37,99,235,0.3)'
                        }}
                      >
                        <Printer size={16} />
                        <span>{isRTL ? 'طباعة هذا التقرير الآن' : 'Print This Report Now'}</span>
                      </button>
                    </div>

                    {/* Official Letterhead */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #18181b', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        {profile?.logo ? (
                          <img src={profile.logo} alt="Logo" style={{ height: '54px', maxWidth: '140px', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ width: 50, height: 50, borderRadius: '10px', background: '#18181b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900 }}>
                            {profile?.logo_symbol || 'J'}
                          </div>
                        )}
                        <div>
                          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#09090b', letterSpacing: '-0.5px' }}>{companyName}</h1>
                          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#52525b', fontWeight: 500 }}>{companyTagline}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#71717a' }}>{profile?.address_ar || profile?.address_en}</p>
                        </div>
                      </div>

                      <div style={{ textAlign: isRTL ? 'left' : 'right', fontSize: '0.78rem', color: '#52525b', lineHeight: 1.6 }}>
                        <div><strong>{isRTL ? 'هاتف / تواصل:' : 'Phone:'}</strong> {profile?.phone || profile?.mobile || '01000000000'}</div>
                        <div><strong>{isRTL ? 'سجل تجاري:' : 'CR No:'}</strong> {profile?.commercial_reg || '89421'}</div>
                        <div><strong>{isRTL ? 'بطاقة ضريبية:' : 'Tax No:'}</strong> {profile?.tax_number || '100-234-567'}</div>
                        <div><strong>{isRTL ? 'تاريخ التقرير:' : 'Date:'}</strong> {new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB')}</div>
                      </div>
                    </div>

                    {/* Report Subject Banner */}
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800 }}>
                          {entityType === 'employee' ? (isRTL ? 'الملف الوظيفي الشامل للكوادر' : 'EMPLOYEE OFFICIAL PROFILE DOSSIER')
                            : entityType === 'customer' ? (isRTL ? 'الملف والتقرير الشامل للعميل' : 'CUSTOMER OFFICIAL 360 ACCOUNT DOSSIER')
                            : (isRTL ? 'الملف والتقرير الشامل للمورد' : 'SUPPLIER OFFICIAL 360 ACCOUNT DOSSIER')}
                        </div>
                        <h2 style={{ margin: '4px 0 0', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>{entity.name}</h2>
                        <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                          {entity.secondaryName} • {badge.label} • {isRTL ? 'كود السجل: ' : 'Ref: '}<strong>#{String(entity.id).slice(0, 8).toUpperCase()}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: isRTL ? 'left' : 'right', fontSize: '0.85rem' }}>
                        <div>{isRTL ? 'حالة السجل:' : 'Status:'} <strong style={{ color: entity.isActive ? '#15803d' : '#b91c1c' }}>{entity.isActive ? (isRTL ? 'نشط ومصرح' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}</strong></div>
                        <div>{isRTL ? 'رقم الهاتف:' : 'Phone:'} <strong style={{ direction: 'ltr', display: 'inline-block' }}>{entity.phone}</strong></div>
                      </div>
                    </div>

                    {/* Executive KPI Summary Tiles */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                      {entityType === 'employee' ? (
                        <>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'أوامر التشغيل' : 'Work Orders'}</span>
                            <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{entity.workOrdersCount}</strong>
                          </div>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'الإنتاج بالقطعة' : 'Piece Units'}</span>
                            <strong style={{ fontSize: '1.1rem', color: '#7c3aed' }}>{formatAmount(entity.totalPieces)}</strong>
                            <span style={{ fontSize: '0.72rem', color: '#059669', display: 'block', marginTop: '2px' }}>+{formatAmount(entity.totalPieceBonus)} {egp}</span>
                          </div>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'الراتب الأساسي' : 'Base Salary'}</span>
                            <strong style={{ fontSize: '1.1rem', color: '#059669' }}>{formatAmount(entity.salaryAmount)} {egp}</strong>
                          </div>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'إجمالي الاستحقاقات (Gross)' : 'Gross Earnings'}</span>
                            <strong style={{ fontSize: '1.1rem', color: '#2563eb' }}>{formatAmount(entity.grossEarnings)} {egp}</strong>
                          </div>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'صافي الرواتب المصروفة' : 'Net Paid'}</span>
                            <strong style={{ fontSize: '1.1rem', color: '#059669' }}>{formatAmount(entity.totalNetPayroll)} {egp}</strong>
                          </div>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'متبقي السلف القائمة' : 'Outstanding Loans'}</span>
                            <strong style={{ fontSize: '1.1rem', color: entity.totalLoansRemaining > 0 ? '#b91c1c' : '#059669' }}>{formatAmount(entity.totalLoansRemaining)} {egp}</strong>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'إجمالي الأوامر' : 'Orders'}</span>
                            <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>{entity.ordersCount}</strong>
                          </div>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'إجمالي القيمة التعاقدية' : 'Total Billed'}</span>
                            <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{formatAmount(entity.totalAmount)} {egp}</strong>
                          </div>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'المحصل / المسدد' : 'Paid'}</span>
                            <strong style={{ fontSize: '1.1rem', color: '#059669' }}>{formatAmount(entity.totalPaid)} {egp}</strong>
                          </div>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'الرصيد القائم المتبقي' : 'Outstanding Balance'}</span>
                            <strong style={{ fontSize: '1.1rem', color: entity.balance < 0 ? '#2563eb' : (entity.balance > 0 ? '#b91c1c' : '#059669') }}>
                              {formatAmount(entity.balance)} {egp}{entity.balance < 0 ? ' (دفعة مقدمة)' : ''}
                            </strong>
                          </div>
                          <div style={{ padding: '0.7rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>{isRTL ? 'إجمالي الأصناف' : 'Total Units'}</span>
                            <strong style={{ fontSize: '1.1rem', color: '#2563eb' }}>{formatAmount(entity.totalItemsQuantity)}</strong>
                            <span style={{ fontSize: '0.72rem', color: '#059669', display: 'block', marginTop: '2px' }}>{formatAmount(entity.totalItemsValue)} {egp}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Section 1: Work Orders in Report */}
                    {entity.workOrders && entity.workOrders.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, borderBottom: '1.5px solid #cbd5e1', paddingBottom: '0.3rem', color: '#0f172a' }}>
                          {isRTL ? '١. بيان أوامر التشغيل والإنتاج بالمصنع' : '1. Factory Work Orders Records'}
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: isRTL ? 'right' : 'left' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={{ padding: '0.45rem 0.6rem' }}>#</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'رقم أمر التشغيل' : 'Work Order'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'أمر البيع / العميل' : 'Sales / Client'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'الحالة' : 'Status'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'تاريخ البدء' : 'Start'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'تاريخ الإنهاء' : 'End'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entity.workOrders.slice(0, 15).map((wo, i) => {
                              const sOrder = entity.salesMap?.get(wo.sales_order_id);
                              const custName = sOrder ? entity.custMap?.get(sOrder.customer_id) : null;
                              return (
                                <tr key={wo.id || i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '0.4rem 0.6rem', color: '#64748b' }}>{i + 1}</td>
                                  <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, fontFamily: 'monospace' }}>#{String(wo.id).slice(0, 8).toUpperCase()}</td>
                                  <td style={{ padding: '0.4rem 0.6rem' }}>
                                    {wo.sales_order_id ? `#${String(wo.sales_order_id).slice(0, 8).toUpperCase()}${custName ? ` (${custName})` : ''}` : '—'}
                                  </td>
                                  <td style={{ padding: '0.4rem 0.6rem' }}>{wo.status}</td>
                                  <td style={{ padding: '0.4rem 0.6rem' }}>{wo.start_date || '—'}</td>
                                  <td style={{ padding: '0.4rem 0.6rem' }}>{wo.end_date || '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Section 1.B: Employee Piece-Work Production in Report */}
                    {entityType === 'employee' && entity.production && entity.production.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, borderBottom: '1.5px solid #cbd5e1', paddingBottom: '0.3rem', color: '#0f172a' }}>
                          {isRTL ? '١.ب. بيان إنتاجية القطع وحوافز الإنتاج' : '1.B. Piece-work Production & Bonus Log'}
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: isRTL ? 'right' : 'left' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'التاريخ' : 'Date'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'أمر التشغيل' : 'Work Order'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'الكمية (قطع)' : 'Quantity'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'فئة القطعة' : 'Rate/Pc'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'إجمالي الحافز' : 'Total Bonus'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entity.production.slice(0, 15).map((p, i) => (
                              <tr key={p.id || i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '0.4rem 0.6rem' }}>{p.production_date || p.created_at?.slice(0, 10) || '—'}</td>
                                <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'monospace' }}>
                                  {p.work_order_id ? `#${String(p.work_order_id).slice(0, 8).toUpperCase()}` : '—'}
                                </td>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>{p.quantity || 0}</td>
                                <td style={{ padding: '0.4rem 0.6rem' }}>{formatAmount(p.rate_per_piece || 0)} {egp}</td>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: '#7c3aed' }}>
                                  {formatAmount(p.total_amount || 0)} {egp}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                            <tr>
                              <td colSpan={2} style={{ padding: '0.5rem 0.6rem' }}>
                                {isRTL ? 'إجمالي الإنتاج بالقطعة والحوافز:' : 'Total Piece Production & Bonus:'}
                              </td>
                              <td style={{ padding: '0.5rem 0.6rem', color: '#7c3aed', fontSize: '0.85rem' }}>
                                {formatAmount(entity.totalPieces)} {isRTL ? 'قطعة' : 'pcs'}
                              </td>
                              <td style={{ padding: '0.5rem 0.6rem' }}>—</td>
                              <td style={{ padding: '0.5rem 0.6rem', fontWeight: 900, color: '#059669', fontSize: '0.85rem' }}>
                                {formatAmount(entity.totalPieceBonus)} {egp}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* Section 2: Financials / Payroll in Report */}
                    {entityType === 'employee' && entity.payroll && entity.payroll.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, borderBottom: '1.5px solid #cbd5e1', paddingBottom: '0.3rem', color: '#0f172a' }}>
                          {isRTL ? '٢. بيان مسيرات الرواتب والمستحقات المالية' : '2. Payroll Slips & Financial Records'}
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: isRTL ? 'right' : 'left' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'الفترة' : 'Period'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'الأساسي' : 'Base'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'حافز الإنتاج' : 'Bonus'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'الخصومات' : 'Deductions'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'خصم السلف' : 'Loan Ded.'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'صافي الراتب' : 'Net Pay'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'الحالة' : 'Status'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entity.payroll.slice(0, 12).map((pay, i) => (
                              <tr key={pay.id || i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>{pay.period_start} → {pay.period_end}</td>
                                <td style={{ padding: '0.4rem 0.6rem' }}>{formatAmount(pay.base_salary)} {egp}</td>
                                <td style={{ padding: '0.4rem 0.6rem', color: '#7c3aed' }}>+{formatAmount(pay.production_bonus)} {egp}</td>
                                <td style={{ padding: '0.4rem 0.6rem', color: '#b91c1c' }}>-{formatAmount(pay.deductions)} {egp}</td>
                                <td style={{ padding: '0.4rem 0.6rem', color: '#b91c1c' }}>-{formatAmount(pay.loan_deductions)} {egp}</td>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 800, color: '#059669' }}>{formatAmount(pay.net_pay)} {egp}</td>
                                <td style={{ padding: '0.4rem 0.6rem' }}>{pay.status}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                            <tr>
                              <td style={{ padding: '0.5rem 0.6rem' }}>{isRTL ? 'الإجمالي الكلي:' : 'Grand Total:'}</td>
                              <td style={{ padding: '0.5rem 0.6rem' }}>{formatAmount(entity.totalBasePayroll)} {egp}</td>
                              <td style={{ padding: '0.5rem 0.6rem', color: '#7c3aed' }}>+{formatAmount(entity.totalPayrollBonuses)} {egp}</td>
                              <td style={{ padding: '0.5rem 0.6rem', color: '#b91c1c' }}>-{formatAmount(entity.totalPayrollDeductions)} {egp}</td>
                              <td style={{ padding: '0.5rem 0.6rem', color: '#b91c1c' }}>-{formatAmount(entity.totalPayrollLoanDeductions)} {egp}</td>
                              <td style={{ padding: '0.5rem 0.6rem', fontWeight: 900, color: '#059669' }}>{formatAmount(entity.totalNetPayroll)} {egp}</td>
                              <td style={{ padding: '0.5rem 0.6rem' }}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* Section 2 (A.2): Employee Loans Statement in Report */}
                    {entityType === 'employee' && entity.loans && entity.loans.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, borderBottom: '1.5px solid #cbd5e1', paddingBottom: '0.3rem', color: '#0f172a' }}>
                          {isRTL ? '٢.ب. كشف حساب السلف والقروض' : '2.B. Employee Loans Ledger'}
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: isRTL ? 'right' : 'left' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'تاريخ السلفة' : 'Date'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'أصل السلفة' : 'Loan Amount'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'الخصم الشهري' : 'Monthly Ded.'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'المتبقي للسداد' : 'Remaining'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'الحالة' : 'Status'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entity.loans.slice(0, 10).map((l, i) => (
                              <tr key={l.id || i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '0.4rem 0.6rem' }}>{l.loan_date || '—'}</td>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>{formatAmount(l.loan_amount)} {egp}</td>
                                <td style={{ padding: '0.4rem 0.6rem' }}>{formatAmount(l.installment_amount || 0)} {egp}</td>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 800, color: Number(l.remaining_amount) > 0 ? '#b91c1c' : '#059669' }}>
                                  {formatAmount(l.remaining_amount || 0)} {egp}
                                </td>
                                <td style={{ padding: '0.4rem 0.6rem' }}>{l.status || 'ACTIVE'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                            <tr>
                              <td style={{ padding: '0.5rem 0.6rem' }}>{isRTL ? 'إجمالي السلف:' : 'Total Loans:'}</td>
                              <td style={{ padding: '0.5rem 0.6rem' }}>{formatAmount(entity.totalLoansAmount)} {egp}</td>
                              <td style={{ padding: '0.5rem 0.6rem' }}>{formatAmount(entity.totalLoansMonthlyDed)} {egp}</td>
                              <td style={{ padding: '0.5rem 0.6rem', fontWeight: 900, color: entity.totalLoansRemaining > 0 ? '#b91c1c' : '#059669' }}>
                                {formatAmount(entity.totalLoansRemaining)} {egp}
                              </td>
                              <td style={{ padding: '0.5rem 0.6rem' }}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* Section 2 (B): Customer / Supplier Invoices in Report */}
                    {(entityType === 'customer' || entityType === 'supplier') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, borderBottom: '1.5px solid #cbd5e1', paddingBottom: '0.3rem', color: '#0f172a' }}>
                          {entityType === 'customer' ? (isRTL ? '٢. كشف حساب فواتير المبيعات والسدادات' : '2. Sales Invoices & Payment Ledger') : (isRTL ? '٢. كشف فواتير التوريدات والمستحقات' : '2. Purchasing & Payables Statement')}
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: isRTL ? 'right' : 'left' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'رقم الفاتورة / الأمر' : 'Order #'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'التاريخ' : 'Date'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'إجمالي القيمة' : 'Total'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'المسدد' : 'Paid'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'المتبقي' : 'Balance'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'حالة السداد' : 'Payment Status'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(entityType === 'customer' ? entity.sales : entity.purchases)?.slice(0, 15).map((o, i) => {
                              const rowRem = o.remaining_amount !== undefined && o.remaining_amount !== null ? Number(o.remaining_amount) : ((Number(o.total_amount) || 0) - (Number(o.amount_paid) || 0));
                              return (
                                <tr key={o.id || i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                    {o.order_number || `#${String(o.id).slice(0, 8).toUpperCase()}`}
                                  </td>
                                  <td style={{ padding: '0.4rem 0.6rem' }}>{o.order_date || o.created_at?.slice(0, 10)}</td>
                                  <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>{formatAmount(o.total_amount)} {egp}</td>
                                  <td style={{ padding: '0.4rem 0.6rem', color: '#059669' }}>{formatAmount(o.amount_paid)} {egp}</td>
                                  <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: rowRem < 0 ? '#2563eb' : (rowRem > 0 ? '#b91c1c' : '#059669') }}>
                                    {formatAmount(rowRem)} {egp}{rowRem < 0 ? ' (دفعة مقدمة)' : ''}
                                  </td>
                                  <td style={{ padding: '0.4rem 0.6rem' }}>{o.payment_status}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                            <tr>
                              <td colSpan={2} style={{ padding: '0.5rem 0.6rem' }}>
                                {isRTL ? `الإجمالي الكلي (${entity.ordersCount} أمر):` : `Grand Total (${entity.ordersCount} orders):`}
                              </td>
                              <td style={{ padding: '0.5rem 0.6rem', fontSize: '0.85rem' }}>{formatAmount(entity.totalAmount)} {egp}</td>
                              <td style={{ padding: '0.5rem 0.6rem', color: '#059669', fontSize: '0.85rem' }}>{formatAmount(entity.totalPaid)} {egp}</td>
                              <td style={{ padding: '0.5rem 0.6rem', fontWeight: 900, color: entity.balance < 0 ? '#2563eb' : (entity.balance > 0 ? '#b91c1c' : '#059669'), fontSize: '0.85rem' }}>
                                {formatAmount(entity.balance)} {egp}{entity.balance < 0 ? ' (دفعة مقدمة)' : ''}
                              </td>
                              <td style={{ padding: '0.5rem 0.6rem' }}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* Section 3: Line Items / Products in Report */}
                    {((entity.salesItems && entity.salesItems.length > 0) || (entity.purchaseItems && entity.purchaseItems.length > 0)) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, borderBottom: '1.5px solid #cbd5e1', paddingBottom: '0.3rem', color: '#0f172a' }}>
                          {entityType === 'customer' ? (isRTL ? '٣. تفاصيل أصناف وعبوات التعبئة المطلوبة' : '3. Ordered Packaging Products Breakdown') : (isRTL ? '٣. تفاصيل الخامات الموردة للمصنع' : '3. Raw Materials Delivered Breakdown')}
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: isRTL ? 'right' : 'left' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={{ padding: '0.45rem 0.6rem' }}>#</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'اسم الصنف / الخامة' : 'Item Name'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'الكمية' : 'Quantity'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
                              <th style={{ padding: '0.45rem 0.6rem' }}>{isRTL ? 'إجمالي القيمة' : 'Total'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(entityType === 'customer' ? entity.salesItems : entity.purchaseItems)?.slice(0, 15).map((it, i) => (
                              <tr key={it.id || i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '0.4rem 0.6rem', color: '#64748b' }}>{i + 1}</td>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>{it.product_name || it.material_name || it.item_name || '—'}</td>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>{formatAmount(it.quantity)}</td>
                                <td style={{ padding: '0.4rem 0.6rem' }}>{formatAmount(it.unit_price)} {egp}</td>
                                <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: '#059669' }}>
                                  {formatAmount(it.total_price || (Number(it.quantity) * Number(it.unit_price)))} {egp}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                            <tr>
                              <td colSpan={2} style={{ padding: '0.5rem 0.6rem' }}>
                                {isRTL ? `إجمالي البنود (${entity.itemsCount} بند):` : `Total Line Items (${entity.itemsCount} items):`}
                              </td>
                              <td style={{ padding: '0.5rem 0.6rem', color: '#2563eb', fontSize: '0.85rem' }}>{formatAmount(entity.totalItemsQuantity)}</td>
                              <td style={{ padding: '0.5rem 0.6rem' }}>—</td>
                              <td style={{ padding: '0.5rem 0.6rem', fontWeight: 900, color: '#059669', fontSize: '0.85rem' }}>
                                {formatAmount(entity.totalItemsValue)} {egp}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* Official Signatures and Stamp Block */}
                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1.5px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem' }}>
                      <div style={{ textAlign: 'center', minWidth: '160px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2.5rem' }}>{isRTL ? 'إعداد المسؤول المختص' : 'Prepared By'}</div>
                        <div style={{ borderTop: '1px dotted #94a3b8', paddingTop: '0.25rem', fontSize: '0.78rem', fontWeight: 600 }}>{isRTL ? 'توقيع الإدارة المختصة' : 'Signature'}</div>
                      </div>

                      <div style={{ textAlign: 'center', minWidth: '160px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2.5rem' }}>{isRTL ? 'اعتماد الإدارة المالية / المصنع' : 'Financial / Factory Approval'}</div>
                        <div style={{ borderTop: '1px dotted #94a3b8', paddingTop: '0.25rem', fontSize: '0.78rem', fontWeight: 600 }}>{isRTL ? 'المدير التنفيذي' : 'Executive Director'}</div>
                      </div>

                      <div style={{ textAlign: 'center', minWidth: '160px' }}>
                        <div style={{ width: '90px', height: '90px', border: '2px dashed #94a3b8', borderRadius: '50%', margin: '0 auto 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>
                          {isRTL ? 'ختم المصنع' : 'Official Stamp'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{companyName}</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Modal Actions Footer */}
            <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', flexWrap: 'wrap' }}>
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...record });
                      setIsEditing(false);
                    }}
                    className="btn"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.15rem' }}
                  >
                    <RotateCcw size={16} />
                    <span>{isRTL ? 'إلغاء' : 'Cancel'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.5rem', fontWeight: 700 }}
                  >
                    <Save size={16} />
                    <span>{isSaving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ التعديلات' : 'Save Changes')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handlePrintFullReport}
                    className="btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.45rem',
                      padding: '0.55rem 1.15rem', fontWeight: 700,
                      background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)',
                      border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    <Printer size={16} />
                    <span>{isRTL ? 'طباعة التقرير الشامل' : 'Print Full Report'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.45rem',
                      padding: '0.55rem 1.15rem', fontWeight: 600,
                      background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb',
                      border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <Edit3 size={16} />
                    <span>{isRTL ? 'تعديل البيانات' : 'Edit Profile'}</span>
                  </button>
                  {showOpenScreen && (
                    <button
                      type="button"
                      onClick={() => router.push(TYPE_ROUTE[entityType])}
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.25rem', fontWeight: 700 }}
                    >
                      <ExternalLink size={16} />
                      <span>{isRTL ? 'الانتقال للشاشة التخصصية' : 'Open Dedicated Screen'}</span>
                    </button>
                  )}
                  <button type="button" onClick={onClose} className="btn" style={{ padding: '0.55rem 1.15rem' }}>
                    {isRTL ? 'إغلاق' : 'Close'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Global CSS for clean executive printing of the dossier report */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body { background: #fff !important; color: #000 !important; }
          body * { visibility: hidden !important; }
          .entity-print-dossier, .entity-print-dossier * { 
            visibility: visible !important; 
          }
          .entity-print-dossier {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .hide-on-print { display: none !important; }
          .print-modal-container {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
