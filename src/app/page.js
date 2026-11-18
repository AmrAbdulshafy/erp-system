"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, TrendingDown, Package, AlertTriangle, Printer, ShoppingBag, 
  ArrowUpRight, ArrowUpLeft, ClipboardCheck, ShoppingCart, FileText, Box, 
  Users, Wallet, CheckCircle2, Clock, Sparkles, Plus, Calendar, 
  Shield, Truck, HandCoins, Receipt, ArrowRight, Eye, Layers
} from 'lucide-react';
import RecordDetailModal from '../components/RecordDetailModal';
import { formatAmount } from '../utils/format';
import { SYSTEM_MODULES } from '../utils/systemModules';
import { useAllModuleData } from '../utils/useAllModuleData';
import { computeTableMetrics } from '../utils/tableMetrics';
import { useAuth } from '../context/AuthContext';
import { canAccessScreen } from '../utils/permissionMatrix';
import { useCompanyProfile, DEFAULT_COMPANY_PROFILE } from '../utils/companyProfile';
import { calculateCOGS } from '../utils/inventoryMovements';

export default function Home() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { user } = useAuth();
  const { profile } = useCompanyProfile();
  const data = useAllModuleData();

  // Active view modal
  const [selectedRecord, setSelectedRecord] = useState(null); // { table, title, schema, record, relationsData }
  // Module category filter: 'all' | 'sales' | 'manufacturing' | 'purchasing' | 'finance'
  const [activeCategory, setActiveCategory] = useState('all');

  const OpenIcon = isRTL ? ArrowUpLeft : ArrowUpRight;
  const ArrowIcon = isRTL ? ArrowUpLeft : ArrowUpRight;

  // Real-time formatted today's date
  const todayDateString = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(isRTL ? 'ar-EG' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  }, [isRTL]);

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div className="spin" style={{ width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        <span>{t('loading') || 'Loading Dashboard...'}</span>
      </div>
    );
  }

  const sales = data.sales_orders || [];
  const quotations = data.quotations || [];
  const purchaseOrders = data.purchase_orders || [];
  const expenses = data.expenses || [];
  const workOrders = data.work_orders || [];
  const materials = data.raw_materials || [];
  const customers = data.customers || [];
  const suppliers = data.suppliers || [];
  const employees = data.employees || [];
  const ownerWithdrawals = data.owner_withdrawals || [];

  // Financial Computations (consistent with Reports page accrual accounting; owner withdrawals excluded from operating profit)
  const totalSales = sales.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
  const totalSalesPaid = sales.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);
  const salesCollectionRate = totalSales > 0 ? Math.round((totalSalesPaid / totalSales) * 100) : 0;

  const totalPurchases = purchaseOrders.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
  const totalPurchasesPaid = purchaseOrders.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);
  const totalPurchasesRemaining = Math.max(0, totalPurchases - totalPurchasesPaid);

  const allPayrollsMap = new Map((data.payroll || []).map(p => [String(p.id), p]));
  const isUnpaidPayrollExpense = (e) => {
    let pid = null;
    if (String(e.id || '').startsWith('exp-payroll-')) {
      pid = String(e.id).replace('exp-payroll-', '');
    } else {
      const m = String(e.notes || '').match(/\[PAYROLL:([^\]]+)\]/);
      if (m) pid = m[1];
    }
    if (!pid) return false;
    const p = allPayrollsMap.get(String(pid));
    if (!p) return false;
    return String(p.status || p.payment_status || '').toUpperCase() !== 'PAID';
  };

  const operatingExpensesLogged = expenses
    .filter(e =>
      e.linked_type !== 'purchase_order' &&
      !e.purchase_order_id &&
      !String(e.id || '').startsWith('exp-po-') &&
      !(e.notes && e.notes.includes('[PO:')) &&
      !e.withdrawal_id &&
      !String(e.id || '').startsWith('exp-withdrawal-') &&
      !(e.notes && e.notes.includes('[OWNER_WITHDRAWAL:')) &&
      !isUnpaidPayrollExpense(e)
    )
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const { totalCOGS } = calculateCOGS({
    salesOrders: sales,
    salesItems: data.sales_items || [],
    rawMaterials: materials,
    purchaseItems: data.purchase_items || [],
    workOrders
  });
  const hasCOGSData = totalCOGS > 0 || (data.sales_items || []).some(it => !it.deleted_at);
  const effectiveCOGS = hasCOGSData ? totalCOGS : totalPurchases;
  const grossProfit = totalSales - effectiveCOGS;
  const totalExpenses = operatingExpensesLogged + effectiveCOGS;
  const totalNet = totalSales - totalExpenses;
  const profitMargin = totalSales > 0 ? Math.round((totalNet / totalSales) * 100) : 0;

  // Operational Computations
  const pendingWO = workOrders.filter(w => w.status === 'PENDING').length;
  const inProgressWO = workOrders.filter(w => w.status === 'IN_PROGRESS').length;
  const completedWO = workOrders.filter(w => w.status === 'COMPLETED').length;
  const woCompletionRate = workOrders.length > 0 ? Math.round((completedWO / workOrders.length) * 100) : 0;

  const lowStock = materials.filter(m => {
    const qty = Number(m.stock_quantity) || 0;
    const minAlert = (m.min_stock_alert !== undefined && m.min_stock_alert !== null && m.min_stock_alert !== '')
      ? Number(m.min_stock_alert)
      : 10;
    return qty <= minAlert;
  });

  // Quick Action Buttons filtered by user permission
  const quickActions = [
    { label: isRTL ? 'عرض سعر' : 'New Quote', path: '/quotations', icon: FileText, color: '#6366F1' },
    { label: isRTL ? 'طلب بيع' : 'New Sale', path: '/sales', icon: ShoppingCart, color: '#10B981' },
    { label: isRTL ? 'أمر تصنيع' : 'Work Order', path: '/work-orders', icon: ClipboardCheck, color: '#F59E0B' },
    { label: isRTL ? 'تسجيل إنتاج' : 'Log Production', path: '/production', icon: Package, color: '#8B5CF6' },
    { label: isRTL ? 'خامة جديدة' : 'Add Material', path: '/inventory', icon: Box, color: '#EC4899' },
    { label: isRTL ? 'تسجيل مصروف' : 'New Expense', path: '/expenses', icon: Receipt, color: '#EF4444' },
    { label: isRTL ? 'سلفة موظف' : 'Employee Loan', path: '/loans', icon: HandCoins, color: '#06B6D4' },
    { label: isRTL ? 'أمر شراء' : 'New Purchase', path: '/purchases', icon: ShoppingBag, color: '#F97316' },
  ].filter(action => canAccessScreen(user?.role, action.path));

  // Module Category Mapping
  const getModuleCategory = (table) => {
    if (['quotations', 'sales_orders', 'customers'].includes(table)) return 'sales';
    if (['work_orders', 'employee_production'].includes(table)) return 'manufacturing';
    if (['purchase_orders', 'raw_materials', 'suppliers', 'shipping_orders'].includes(table)) return 'purchasing';
    return 'finance';
  };

  const filteredModules = SYSTEM_MODULES.filter(mod => {
    const isAllowed = canAccessScreen(user?.role, mod.path);
    if (!isAllowed) return false;
    if (activeCategory === 'all') return true;
    return getModuleCategory(mod.table) === activeCategory;
  });

  // Recent lists (sorted newest first by date/timestamp)
  const recentWorkOrders = [...workOrders]
    .sort((a, b) => String(b.created_at || b.start_date || '').localeCompare(String(a.created_at || a.start_date || '')))
    .slice(0, 5);
  const recentSales = [...sales]
    .sort((a, b) => String(b.created_at || b.order_date || '').localeCompare(String(a.created_at || a.order_date || '')))
    .slice(0, 5);

  const getCustomerName = (id) => {
    const c = customers.find(item => String(item.id) === String(id));
    return c ? (c.customer_name || c.company_name) : `#${id}`;
  };

  const isCompanyProfileIncomplete =
    !profile?.company_name_ar ||
    !String(profile.company_name_ar).trim() ||
    String(profile.company_name_ar).trim() === DEFAULT_COMPANY_PROFILE.company_name_ar;

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2rem', 
        direction: isRTL ? 'rtl' : 'ltr', 
        textAlign: isRTL ? 'right' : 'left',
        paddingBottom: '2.5rem'
      }}
    >
      {isCompanyProfileIncomplete && (
        <div
          className="hide-on-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: 'var(--text-main)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', fontWeight: 700 }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <span>{isRTL ? 'أكمل بيانات شركتك' : 'Complete your company profile'}</span>
          </div>
          <Link
            href="/settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              background: '#f59e0b',
              color: '#09090b',
              fontWeight: 700,
              fontSize: '0.82rem',
              textDecoration: 'none'
            }}
          >
            <span>{isRTL ? 'الانتقال إلى الإعدادات' : 'Go to Settings'}</span>
            <OpenIcon size={14} />
          </Link>
        </div>
      )}

      {/* 1. Ultra-Modern Executive Header */}
      <div 
        className="glass-card" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1.25rem',
          padding: '1.5rem 1.75rem',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(245, 158, 11, 0.04) 100%)',
          border: '1px solid var(--border)',
          borderRadius: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
              {isRTL ? 'لوحة القيادة والتشغيل' : 'Executive Command Center'}
            </h1>
            <span 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.35rem', 
                padding: '0.25rem 0.65rem', 
                borderRadius: '999px', 
                background: 'rgba(16, 185, 129, 0.12)', 
                color: '#10B981', 
                fontSize: '0.78rem', 
                fontWeight: 700 
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} />
              {isRTL ? 'المصنع نشط' : 'Factory Online'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={15} color="var(--primary)" />
              {todayDateString}
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Shield size={14} color="var(--primary)" />
              {isRTL ? `الصلاحية: ${user?.role || 'مستخدم'}` : `Role: ${user?.role || 'User'}`}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }} className="hide-on-print">
          <button 
            type="button" 
            className="btn" 
            onClick={() => window.print()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.65rem 1.25rem', 
              fontWeight: 700, 
              backgroundColor: 'var(--surface)', 
              border: '1px solid var(--border)',
              borderRadius: '10px'
            }}
          >
            <Printer size={16} />
            <span>{t('print_report') || (isRTL ? 'طباعة التقرير' : 'Print Report')}</span>
          </button>
        </div>
      </div>

      {/* 2. Quick Action Launchpad */}
      {quickActions.length > 0 && (
        <div 
          className="hide-on-print"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            overflowX: 'auto', 
            padding: '0.25rem 0',
            scrollbarWidth: 'none'
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={14} color="var(--primary)" />
            {isRTL ? 'إجراء سريع:' : 'Quick Action:'}
          </span>
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link
                key={idx}
                href={action.path}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = action.color;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', backgroundColor: `${action.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color }}>
                  <Icon size={13} />
                </div>
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* 3. Primary Executive KPI Command Strip */}
      <div 
        className="print-area"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem' 
        }}
      >
        {/* Card 1: Revenue & Cash Collection */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            gap: '0.75rem',
            background: 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('total_sales') || (isRTL ? 'إجمالي المبيعات' : 'Total Revenue')}
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {formatAmount(totalSales)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('egp')}</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <TrendingUp size={20} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <span>{isRTL ? 'المحصل نقداً:' : 'Cash Collected:'} {formatAmount(totalSalesPaid)}</span>
              <span style={{ fontWeight: 700, color: '#10B981' }}>{salesCollectionRate}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', borderRadius: '999px', background: 'var(--surface-hover)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.max(0, salesCollectionRate))}%`, height: '100%', background: '#10B981', borderRadius: '999px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* Card 2: Net Profit & Margin */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            gap: '0.75rem',
            background: 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {isRTL ? 'صافي الربح (COGS)' : 'Net Profit (COGS)'}
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: totalNet >= 0 ? '#10B981' : '#EF4444', marginTop: '0.25rem' }}>
                {formatAmount(totalNet)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('egp')}</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: totalNet >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: totalNet >= 0 ? '#10B981' : '#EF4444' }}>
              <Wallet size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>{isRTL ? 'تكلفة المبيعات (COGS): ' : 'COGS: '}{formatAmount(effectiveCOGS)}</span>
            <span style={{ padding: '2px 8px', borderRadius: '6px', background: totalNet >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: totalNet >= 0 ? '#10B981' : '#EF4444', fontWeight: 700, fontSize: '0.75rem' }}>
              {profitMargin}% {isRTL ? 'هامش' : 'margin'}
            </span>
          </div>
        </div>

        {/* Card 3: Live Work Orders & Factory Queue */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            gap: '0.75rem',
            background: 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {isRTL ? 'أوامر الشغل والتصنيع' : 'Manufacturing Jobs'}
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {workOrders.length} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{isRTL ? 'طلب' : 'orders'}</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <ClipboardCheck size={20} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <span>{isRTL ? `${pendingWO} انتظار • ${inProgressWO} تشغيل` : `${pendingWO} pend • ${inProgressWO} prog`}</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{woCompletionRate}% {isRTL ? 'مكتمل' : 'done'}</span>
            </div>
            <div style={{ width: '100%', height: '6px', borderRadius: '999px', background: 'var(--surface-hover)', overflow: 'hidden' }}>
              <div style={{ width: `${woCompletionRate}%`, height: '100%', background: 'var(--primary)', borderRadius: '999px', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* Card 4: Purchases & Supplier Payables */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            gap: '0.75rem',
            background: 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('purchase_orders') || (isRTL ? 'المشتريات والتوريد' : 'Purchasing')}
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {formatAmount(totalPurchases)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('egp')}</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
              <ShoppingBag size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>{isRTL ? 'متبقي للموردين:' : 'Due to Suppliers:'}</span>
            <span style={{ fontWeight: 700, color: totalPurchasesRemaining > 0 ? '#F59E0B' : '#10B981' }}>
              {formatAmount(totalPurchasesRemaining)} {t('egp')}
            </span>
          </div>
        </div>

        {/* Card 5: Inventory & Warehouse Health */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            gap: '0.75rem',
            background: 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('inventory') || (isRTL ? 'الخامات والمخزون' : 'Inventory')}
              </span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {materials.length} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{isRTL ? 'صنف خامة' : 'items'}</span>
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: lowStock.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: lowStock.length > 0 ? '#EF4444' : '#10B981' }}>
              <Box size={20} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
            {lowStock.length > 0 ? (
              <span style={{ color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={13} /> {isRTL ? `${lowStock.length} خامات منخفضة الرصيد` : `${lowStock.length} Low Stock Warnings`}
              </span>
            ) : (
              <span style={{ color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> {isRTL ? 'أرصدة المخزن مثالية' : 'Stock Levels Optimal'}
              </span>
            )}
            <Link href="/inventory" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', fontSize: '0.78rem' }}>
              {isRTL ? 'فحص المخزن' : 'Check'}
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Live Operational Command Split: Left (Production) vs Right (Sales) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        
        {/* Left Column: Live Manufacturing Jobs */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <ClipboardCheck size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  {isRTL ? 'أحدث أوامر الشغل والتصنيع' : 'Active Manufacturing Orders'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isRTL ? 'متابعة خط الإنتاج والتشغيل بالمصنع' : 'Real-time production floor queue'}
                </span>
              </div>
            </div>
            <Link 
              href="/work-orders" 
              style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {isRTL ? 'عرض الكل' : 'View All'} <ArrowIcon size={14} />
            </Link>
          </div>

          {recentWorkOrders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentWorkOrders.map(wo => {
                const statusColor = wo.status === 'COMPLETED' ? '#10B981' : wo.status === 'IN_PROGRESS' ? '#3B82F6' : '#F59E0B';
                const statusLabel = wo.status === 'COMPLETED' ? (isRTL ? 'مكتمل' : 'Completed') : wo.status === 'IN_PROGRESS' ? (isRTL ? 'قيد التشغيل' : 'In Progress') : (isRTL ? 'قيد الانتظار' : 'Pending');

                return (
                  <div 
                    key={wo.id}
                    className="clickable-row"
                    onClick={() => {
                      setSelectedRecord({
                        table: 'work_orders',
                        title: isRTL ? `أمر شغل #${wo.id}` : `Work Order #${wo.id}`,
                        schema: [
                          { key: 'item_name', label: 'item_name' },
                          { key: 'quantity', label: 'quantity', type: 'number' },
                          { key: 'status', label: 'status' },
                          { key: 'start_date', label: 'start_date', type: 'date' },
                          { key: 'end_date', label: 'end_date', type: 'date' },
                          { key: 'notes', label: 'notes', type: 'textarea' }
                        ],
                        record: wo,
                        relationsData: {}
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        {wo.item_name || (isRTL ? `أمر شغل #${wo.id}` : `Work Order #${wo.id}`)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {isRTL ? 'الكمية المطلوبة: ' : 'Target Qty: '} <span style={{ fontWeight: 600 }}>{wo.quantity || 0}</span> {wo.start_date ? `• ${wo.start_date}` : ''}
                      </div>
                    </div>

                    <span 
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        background: `${statusColor}18`,
                        color: statusColor,
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isRTL ? 'لا توجد أوامر شغل مسجلة حالياً.' : 'No active work orders found.'}
            </div>
          )}
        </div>

        {/* Right Column: Latest Sales Orders */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                <ShoppingCart size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  {isRTL ? 'أحدث طلبات وفواتير البيع' : 'Recent Sales Orders'}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isRTL ? 'حركة العملاء والتحصيل النقدي' : 'Client purchase & cashflow velocity'}
                </span>
              </div>
            </div>
            <Link 
              href="/sales" 
              style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {isRTL ? 'عرض الكل' : 'View All'} <ArrowIcon size={14} />
            </Link>
          </div>

          {recentSales.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentSales.map(order => {
                const isPaid = (Number(order.amount_paid) || 0) >= (Number(order.total_amount) || 0) && Number(order.total_amount) > 0;
                const isPartial = (Number(order.amount_paid) || 0) > 0 && !isPaid;
                const badgeBg = isPaid ? 'rgba(16, 185, 129, 0.15)' : isPartial ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                const badgeColor = isPaid ? '#10B981' : isPartial ? '#F59E0B' : '#EF4444';
                const badgeLabel = isPaid ? (isRTL ? 'مدفوع بالكامل' : 'Paid') : isPartial ? (isRTL ? 'مدفوع جزئياً' : 'Partial') : (isRTL ? 'غير مدفوع' : 'Unpaid');

                return (
                  <div 
                    key={order.id}
                    className="clickable-row"
                    onClick={() => {
                      setSelectedRecord({
                        table: 'sales_orders',
                        title: isRTL ? `أمر بيع #${order.order_number || order.id}` : `Sales Order #${order.order_number || order.id}`,
                        schema: [
                          { key: 'order_number', label: 'order_number' },
                          { key: 'customer_id', label: 'customer', type: 'relation', relationTable: 'customers' },
                          { key: 'order_date', label: 'order_date', type: 'date' },
                          { key: 'total_amount', label: 'total_amount', type: 'currency' },
                          { key: 'amount_paid', label: 'amount_paid', type: 'currency' },
                          { key: 'payment_status', label: 'payment_status' },
                          { key: 'notes', label: 'notes', type: 'textarea' }
                        ],
                        record: order,
                        relationsData: { customers }
                      });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        {getCustomerName(order.customer_id)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {order.order_number ? `#${order.order_number}` : `#${order.id}`} {order.order_date ? `• ${order.order_date}` : ''}
                      </div>
                    </div>

                    <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {formatAmount(order.total_amount)} <span style={{ fontSize: '0.75rem' }}>{t('egp')}</span>
                      </div>
                      <span 
                        style={{
                          display: 'inline-block',
                          marginTop: '3px',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: badgeBg,
                          color: badgeColor,
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isRTL ? 'لا توجد طلبات بيع مسجلة حالياً.' : 'No recent sales orders.'}
            </div>
          )}
        </div>

      </div>

      {/* 5. Low Stock Warehouse Warnings (Interactive Alert) */}
      {lowStock.length > 0 && (
        <div 
          className="glass-card" 
          style={{ 
            padding: '1.5rem', 
            borderRadius: '16px', 
            border: '1px solid rgba(245, 158, 11, 0.35)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(239, 68, 68, 0.04) 100%)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {t('low_stock_alerts') || (isRTL ? 'تنبيهات نقص المخزون' : 'Low Stock Alerts')}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {isRTL ? 'خامات ومواد وصلت للحد الأدنى للتنبيه وتحتاج إلى طلب شراء فوري' : 'Raw materials at or below minimum stock alert threshold'}
                </span>
              </div>
            </div>
            <Link 
              href="/inventory" 
              style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              {isRTL ? 'إدارة المخزن' : 'Warehouse'} <ArrowIcon size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {lowStock.map(m => (
              <div
                key={m.id}
                className="clickable-row"
                onClick={() => {
                  setSelectedRecord({
                    table: 'raw_materials',
                    title: isRTL ? 'تفاصيل الخامة' : 'Material Details',
                    schema: [
                      { key: 'material_name', label: 'material_name' },
                      { key: 'stock_quantity', label: 'stock_quantity', type: 'number' },
                      { key: 'unit_price', label: 'unit_price', type: 'number', isCurrency: true },
                      { key: 'supplier_id', label: 'supplier', type: 'relation', relationTable: 'suppliers' },
                      { key: 'notes', label: 'notes', type: 'textarea' }
                    ],
                    record: m,
                    relationsData: { suppliers }
                  });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    {m.material_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {isRTL ? 'سعر الوحدة: ' : 'Unit Price: '}{formatAmount(m.unit_price)} {t('egp')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span 
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#EF4444',
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}
                  >
                    {m.stock_quantity}
                  </span>
                  <Eye size={15} color="var(--text-muted)" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Categorized System Modules Command Hub */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              {isRTL ? 'شاشات ومنظومات المصنع' : 'Factory Modules & Operations'}
            </h2>
          </div>

          {/* Module Filter Tabs */}
          <div 
            className="hide-on-print"
            style={{ 
              display: 'inline-flex', 
              background: 'var(--surface)', 
              padding: '3px', 
              borderRadius: '10px', 
              border: '1px solid var(--border)',
              flexWrap: 'wrap',
              gap: '2px'
            }}
          >
            {[
              { id: 'all', label: isRTL ? 'الكل' : 'All' },
              { id: 'sales', label: isRTL ? 'المبيعات والعملاء' : 'Sales & Clients' },
              { id: 'manufacturing', label: isRTL ? 'الإنتاج والتشغيل' : 'Manufacturing' },
              { id: 'purchasing', label: isRTL ? 'المشتريات والمخزن' : 'Purchasing & Stock' },
              { id: 'finance', label: isRTL ? 'المالية والموظفين' : 'Finance & HR' },
            ].map(tab => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  style={{
                    background: isActive ? 'var(--primary)' : 'transparent',
                    color: isActive ? 'var(--primary-foreground)' : 'var(--text-main)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modules Grid */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '1rem' 
          }}
        >
          {filteredModules.map(mod => {
            const records = data[mod.table] || [];
            const metrics = computeTableMetrics(mod.table, records, data, t, isRTL);
            const Icon = mod.icon;

            return (
              <div
                key={mod.table}
                className="glass-card"
                style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  background: 'var(--surface)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <Icon size={18} />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                        {t(mod.labelKey)}
                      </span>
                    </div>

                    <span 
                      style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: 'var(--text-muted)', 
                        background: 'var(--surface-hover)', 
                        padding: '2px 8px', 
                        borderRadius: '999px' 
                      }}
                    >
                      {records.length} {isRTL ? 'سجل' : 'items'}
                    </span>
                  </div>

                  {/* Top 2 Computed Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--surface-hover)', padding: '0.65rem 0.75rem', borderRadius: '8px' }}>
                    {metrics.slice(0, 2).map((metric, mIdx) => (
                      <div key={mIdx}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {metric.title}
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: metric.valueColor || 'var(--text-main)', marginTop: '2px' }}>
                          {metric.isCurrency ? `${formatAmount(metric.value)}` : metric.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <Link
                    href={mod.path}
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <span>{isRTL ? 'فتح الشاشة' : 'Open Screen'}</span>
                    <OpenIcon size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Record Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal
          tableName={selectedRecord.table}
          title={selectedRecord.title}
          schema={selectedRecord.schema}
          record={selectedRecord.record}
          relationsData={selectedRecord.relationsData}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
