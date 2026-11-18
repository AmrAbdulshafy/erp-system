"use client";

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Printer, TrendingUp, TrendingDown, Banknote, LayoutList, Calendar, 
  Download, Filter, Search, ArrowUpRight, ArrowUpLeft, Shield, 
  Wallet, ShoppingBag, ShoppingCart, Box, Users, Clock, FileText, 
  CheckCircle2, Sparkles, Layers, RefreshCw, X, ChevronRight, ChevronLeft, Info
} from 'lucide-react';
import RecordDetailModal from '../../components/RecordDetailModal';
import { formatAmount } from '../../utils/format';
import { SYSTEM_MODULES } from '../../utils/systemModules';
import { useAllModuleData } from '../../utils/useAllModuleData';
import { computeTableMetrics } from '../../utils/tableMetrics';
import PageMetricCards from '../../components/PageMetricCards';
import { useCompanyProfile } from '../../utils/companyProfile';
import { useAuth } from '../../context/AuthContext';
import { canAccessScreen } from '../../utils/permissionMatrix';
import { calculateCOGS } from '../../utils/inventoryMovements';

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { user } = useAuth();
  const data = useAllModuleData();
  const { profile, getDisplayName, getTagline } = useCompanyProfile();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState('all');
  const [selected, setSelected] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewModalTarget, setViewModalTarget] = useState(null);

  const ArrowIcon = isRTL ? ArrowUpLeft : ArrowUpRight;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  // Filter modules based on user RBAC permission
  const permittedModules = useMemo(() => {
    return SYSTEM_MODULES.filter(m => canAccessScreen(user?.role, m.path));
  }, [user]);

  // Lookup maps for relation columns
  const maps = useMemo(() => {
    if (!data) return {};
    const toMap = (rows, label) => Object.fromEntries((rows || []).map(r => [r.id, r[label]]));
    return {
      customers: toMap(data.customers, 'customer_name'),
      suppliers: toMap(data.suppliers, 'supplier_name'),
      employees: toMap(data.employees, 'full_name'),
    };
  }, [data]);

  // Date Presets Handler
  const handleDatePreset = (preset) => {
    setActiveDatePreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;

    if (preset === 'today') {
      setFromDate(today);
      setToDate(today);
    } else if (preset === 'this_week') {
      const dNow = new Date();
      const firstDay = new Date(dNow.setDate(dNow.getDate() - dNow.getDay()));
      const fy = firstDay.getFullYear();
      const fm = String(firstDay.getMonth() + 1).padStart(2, '0');
      const fd = String(firstDay.getDate()).padStart(2, '0');
      setFromDate(`${fy}-${fm}-${fd}`);
      setToDate(today);
    } else if (preset === 'this_month') {
      setFromDate(`${y}-${m}-01`);
      setToDate(today);
    } else if (preset === 'this_year') {
      setFromDate(`${y}-01-01`);
      setToDate(today);
    } else {
      setFromDate('');
      setToDate('');
    }
  };

  // Apply date range to each permitted module
  const filtered = useMemo(() => {
    if (!data) return null;
    const out = {};
    for (const mod of permittedModules) {
      const rows = data[mod.table] || [];
      const dateCol = mod.columns.find(c => c.type === 'date');
      if (!dateCol || (!fromDate && !toDate)) {
        out[mod.table] = rows;
        continue;
      }
      out[mod.table] = rows.filter(r => {
        const d = String(r[dateCol.key] || '').slice(0, 10);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }
    return out;
  }, [data, permittedModules, fromDate, toDate]);

  if (!filtered) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '0.75rem', color: 'var(--text-muted)' }}>
        <div className="spin" style={{ width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
        <span>{t('loading') || 'Loading Reports...'}</span>
      </div>
    );
  }

  const sum = (rows, key) => (rows || []).reduce((s, r) => s + (Number(r[key]) || 0), 0);

  const sales = filtered.sales_orders || [];
  const purchases = filtered.purchase_orders || [];
  const expenses = filtered.expenses || [];
  const withdrawals = filtered.owner_withdrawals || [];
  const payrolls = filtered.payroll || [];
  const allPayrollsMap = new Map((data.payroll || []).map(p => [String(p.id), p]));

  // Date-filtered payment vouchers for standalone account receipts/payments
  const filteredVouchers = (data.payment_vouchers || []).filter(v => {
    if (v.deleted_at) return false;
    if (!fromDate && !toDate) return true;
    const d = String(v.voucher_date || v.created_at || '').slice(0, 10);
    if (!d) return false;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });

  const standaloneCustomerReceipts = sum(
    filteredVouchers.filter(v => v.voucher_type === 'RECEIPT' && (v.reference_type === 'account' || !v.reference_id)),
    'amount'
  );
  const standaloneSupplierPayments = sum(
    filteredVouchers.filter(v => v.voucher_type === 'PAYMENT' && (v.reference_type === 'account' || !v.reference_id)),
    'amount'
  );

  const totalSales = sum(sales, 'total_amount');
  const totalPaid = sum(sales, 'amount_paid');
  const totalCashCollected = totalPaid + standaloneCustomerReceipts;
  const collectionRate = totalSales > 0 ? Math.round((totalPaid / totalSales) * 100) : 0;

  const totalPurchases = sum(purchases, 'total_amount');
  const totalPurchasesPaid = sum(purchases, 'amount_paid');
  const totalPurchasesRemaining = Math.max(0, totalPurchases - totalPurchasesPaid);

  const isWithdrawalExpense = (e) =>
    String(e.id || '').startsWith('exp-withdrawal-') ||
    Boolean(e.withdrawal_id) ||
    Boolean(e.notes && e.notes.includes('[OWNER_WITHDRAWAL:'));

  const isPoExpense = (e) =>
    String(e.id || '').startsWith('exp-po-') ||
    Boolean(e.purchase_order_id) ||
    Boolean(e.notes && e.notes.includes('[PO:'));

  const getLinkedPayrollId = (e) => {
    if (String(e.id || '').startsWith('exp-payroll-')) {
      return String(e.id).replace('exp-payroll-', '');
    }
    const match = String(e.notes || '').match(/\[PAYROLL:([^\]]+)\]/);
    return match ? match[1] : null;
  };

  const isPayrollExpense = (e) =>
    Boolean(getLinkedPayrollId(e)) || String(e.category || '').toUpperCase() === 'PAYROLL';

  const isUnpaidPayrollExpense = (e) => {
    const pid = getLinkedPayrollId(e);
    if (!pid) return false;
    const p = allPayrollsMap.get(String(pid));
    if (!p) return false;
    return String(p.status || p.payment_status || '').toUpperCase() !== 'PAID';
  };

  // Operating expenses exclude PO-synced expenses, Owner Withdrawals, and any unpaid (DRAFT/APPROVED) payroll expenses
  const pureOperatingExpenses = expenses.filter(e => !isPoExpense(e) && !isWithdrawalExpense(e) && !isUnpaidPayrollExpense(e));
  const operatingExpenses = sum(pureOperatingExpenses, 'amount');
  const totalExpensesLogged = operatingExpenses;

  const unsyncedPurchases = purchases.filter(
    po => !expenses.some(e => e.id === `exp-po-${po.id}` || e.purchase_order_id === po.id || (e.notes && e.notes.includes(`[PO:${po.id}]`)))
  );
  const poExpensesLogged = sum(expenses.filter(isPoExpense), 'amount');
  const purchasesCashPaid = poExpensesLogged + sum(unsyncedPurchases, 'amount_paid') + standaloneSupplierPayments;

  // Non-payroll operating expenses + actual net cash paid in PAID payrolls + cash disbursed in employee loans
  const nonPayrollOperatingExpenses = sum(pureOperatingExpenses.filter(e => !isPayrollExpense(e)), 'amount');
  const countedPayrollIds = new Set();
  let paidPayrollCash = 0;
  for (const e of pureOperatingExpenses) {
    if (!isPayrollExpense(e)) continue;
    const pid = getLinkedPayrollId(e);
    if (pid && allPayrollsMap.has(String(pid))) {
      countedPayrollIds.add(String(pid));
      paidPayrollCash += Number(allPayrollsMap.get(String(pid)).net_pay) || 0;
    } else {
      paidPayrollCash += Number(e.amount) || 0;
    }
  }
  for (const p of payrolls) {
    if (String(p.status || p.payment_status || '').toUpperCase() === 'PAID' && !countedPayrollIds.has(String(p.id))) {
      paidPayrollCash += Number(p.net_pay) || 0;
    }
  }
  const loansCashDisbursed = (filtered.employee_loans || []).reduce(
    (s, l) => s + (Number(l.loan_amount) || Number(l.remaining_amount) || 0),
    0
  );

  // Card 4: Operating Expenses + Paid Purchases (clean operational & purchase spend)
  const totalExpenses = operatingExpenses + purchasesCashPaid;
  // Total Cash Outflow for Net Cash Profit (Actual cash paid for non-payroll ops + net payroll cash + loan advances disbursed + purchases & supplier vouchers)
  const totalCashOutflow = nonPayrollOperatingExpenses + paidPayrollCash + loansCashDisbursed + purchasesCashPaid;

  const unsyncedWithdrawals = withdrawals.filter(
    w => !expenses.some(e => e.id === `exp-withdrawal-${w.id}` || e.withdrawal_id === w.id || (e.notes && e.notes.includes(`[OWNER_WITHDRAWAL:${w.id}]`)))
  );
  const withdrawalExpensesLogged = sum(expenses.filter(isWithdrawalExpense), 'amount');
  const totalWithdrawals = Math.max(sum(withdrawals, 'amount'), withdrawalExpensesLogged + sum(unsyncedWithdrawals, 'amount'));

  // True Cost of Goods Sold (COGS - تكلفة البضاعة المباعة) from sold items + BOM consumption
  const { totalCOGS, salesItemsCOGS, extraBomCOGS } = calculateCOGS({
    salesOrders: sales,
    salesItems: data.sales_items || [],
    rawMaterials: data.raw_materials || [],
    purchaseItems: data.purchase_items || [],
    workOrders: filtered.work_orders || []
  });
  const hasCOGSData = totalCOGS > 0 || (data.sales_items || []).some(it => !it.deleted_at && sales.some(so => String(so.id) === String(it.sales_order_id)));
  const effectiveCOGS = hasCOGSData ? totalCOGS : totalPurchases;
  const grossProfit = totalSales - effectiveCOGS;
  const grossMargin = totalSales > 0 ? Math.round((grossProfit / totalSales) * 100) : 0;

  // 1. Accrual Operating Net Profit (COGS-based) = Gross Sales - (COGS + Operating Expenses) [before owner drawings]
  const netProfit = totalSales - (effectiveCOGS + operatingExpenses);
  const netProfitAfterAllPurchases = totalSales - (totalPurchases + operatingExpenses);
  const retainedProfit = netProfit - totalWithdrawals;
  // 2. Cash Operating Net Profit = Total Cash Collected (Invoices + Receipt Vouchers) - Total Cash Outflow (Paid Purchases + Payment Vouchers + Non-Payroll Ops + Net Paid Payroll + Disbursed Loans) [before owner drawings]
  const netCashProfit = totalCashCollected - totalCashOutflow;
  const retainedCashProfit = netCashProfit - totalWithdrawals;
  const profitMargin = totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0;
  const cashProfitMargin = totalCashCollected > 0 ? Math.round((netCashProfit / totalCashCollected) * 100) : 0;
  const profitTooltipText = isRTL
    ? 'صافي الربح التشغيلي يحسب على أساس تكلفة البضاعة المباعة الفعلية (COGS = الأصناف المباعة × تكلفة الوحدة + استهلاك BOM) مطروحاً منها مصاريف التشغيل، دون خصم إجمالي المشتريات المخزنة أو مسحوبات المالك.'
    : 'Operating Net Profit is calculated using true Cost of Goods Sold (COGS = sold items cost + BOM consumption) minus operating expenses, rather than total raw material purchases.';
  const cashProfitTooltipText = isRTL
    ? 'صافي الربح النقدي الفعلي = إجمالي النقدية المحصلة (مدفوعات فواتير المبيعات + سندات القبض المستقلة) مطروحاً منها إجمالي النقدية المنصرفة فعلياً (المدفوع للمشتريات وسندات الصرف + مصاريف التشغيل النقدية + صافي الرواتب المنصرفة + السلف النقدية)، قبل مسحوبات المالك.'
    : 'Net Cash Profit = Total Cash Collected (Sales Paid + Standalone Receipt Vouchers) minus Total Cash Outflow (Purchases Paid + Supplier Payment Vouchers + Cash Operating Expenses + Net Paid Payroll + Disbursed Employee Loans), before owner withdrawals.';

  const receivable = sum(data.customers || [], 'account_balance');
  const payable = sum(data.suppliers || [], 'account_balance');

  const getCellValue = (row, col) => {
    if (col.key === '__remaining') return Math.max(0, (Number(row.total_amount) || 0) - (Number(row.amount_paid) || 0));
    const v = row[col.key];
    if (col.rel) return maps[col.rel]?.[v] || (v ? String(v).slice(0, 8) : '—');
    return v;
  };

  const renderCell = (row, col) => {
    const v = getCellValue(row, col);
    if (col.type === 'currency') return `${formatAmount(v)} ${t('egp') || (isRTL ? 'ج.م' : 'EGP')}`;
    if (col.type === 'date') return v ? String(v).slice(0, 10) : '—';
    if (col.type === 'status') {
      if (!v) return '—';
      const key = String(v).toLowerCase();
      if (i18n.exists(key)) return t(key);
      const statusMapAr = {
        paid: 'مدفوع', unpaid: 'غير مدفوع', partial: 'مدفوع جزئياً',
        pending: 'قيد الانتظار', in_progress: 'قيد التنفيذ', completed: 'مكتمل',
        draft: 'مسودة', sent: 'تم الإرسال', accepted: 'مقبول', rejected: 'مرفوض',
        approved: 'معتمد', delivered: 'تم التسليم', in_transit: 'في الطريق',
        returned: 'مرتجع', present: 'حاضر', absent: 'غائب', late: 'متأخر',
        leave: 'إجازة', active: 'نشط', inactive: 'غير نشط',
        monthly: 'شهري', weekly: 'أسبوعي', daily: 'يومي', per_piece: 'بالقطعة',
        personal: 'مصاريف شخصية', profit_share: 'توزيعات أرباح', salary: 'راتب',
        loan_return: 'رد سلفة / قرض', other: 'أخرى',
        electricity: 'كهرباء', maintenance: 'صيانة', rent: 'إيجار',
        transport: 'نقل وشحن', shipping: 'شحن وتوصيل', materials: 'خامات ومواد أولية',
        payroll: 'رواتب وأجور'
      };
      if (isRTL && statusMapAr[key]) return statusMapAr[key];
      return v;
    }
    if (col.key === 'product_type' && v) {
      const key = String(v).toLowerCase();
      const prodMapAr = {
        box: 'صندوق كرتون', cup: 'كوب', tray: 'صينية / طبق',
        lid: 'غطاء', bag: 'كيس', plate: 'طبق',
        paper_roll: 'رول ورق', plastic_roll: 'رول بلاستيك', ink: 'أحبار', carton: 'كرتون'
      };
      if (isRTL && prodMapAr[key]) return prodMapAr[key];
      if (i18n.exists(key)) return t(key);
    }
    return v === null || v === undefined || v === '' ? '—' : String(v);
  };

  // Module Category Mapping
  const getModuleCategory = (table) => {
    if (['quotations', 'sales_orders', 'customers'].includes(table)) return 'sales';
    if (['work_orders', 'employee_production'].includes(table)) return 'manufacturing';
    if (['purchase_orders', 'raw_materials', 'suppliers', 'shipping_orders'].includes(table)) return 'purchasing';
    return 'finance';
  };

  const modulesCategoryFiltered = permittedModules.filter(m => {
    if (activeCategory === 'all') return true;
    return getModuleCategory(m.table) === activeCategory;
  });

  const modulesToShow = selected === 'ALL' 
    ? modulesCategoryFiltered 
    : permittedModules.filter(m => m.table === selected);

  const align = isRTL ? 'right' : 'left';
  const endAlign = isRTL ? 'left' : 'right';
  const periodLabel = fromDate || toDate
    ? `${fromDate || '…'} → ${toDate || '…'}`
    : (isRTL ? 'كافة الفترات السابقة' : 'All Time History');

  // Export CSV for currently viewed module or summary
  const exportCurrentToCSV = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      if (selected === 'ALL') {
        csvContent += `Module,Records Count,Metric,Value\n`;
        modulesToShow.forEach(mod => {
          const rows = filtered[mod.table] || [];
          const main = computeTableMetrics(mod.table, rows, data, t, isRTL)[0];
          csvContent += `"${t(mod.labelKey)}",${rows.length},"${main?.title || ''}","${main?.value || ''}"\n`;
        });
      } else {
        const mod = permittedModules.find(m => m.table === selected);
        if (!mod) return;
        const rows = filtered[mod.table] || [];
        csvContent += mod.columns.map(c => `"${t(c.labelKey)}"`).join(',') + '\n';
        rows.forEach(r => {
          const rowVals = mod.columns.map(c => `"${String(getCellValue(r, c) || '').replace(/"/g, '""')}"`);
          csvContent += rowVals.join(',') + '\n';
        });
      }
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `UltraPack_Report_${selected}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('CSV Export Error:', e);
    }
  };

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2rem', 
        direction: isRTL ? 'rtl' : 'ltr', 
        textAlign: isRTL ? 'right' : 'left',
        paddingBottom: '3rem'
      }}
    >
      {/* 1. Modern Interactive Command Header (Hide on Print) */}
      <div 
        className="glass-card hide-on-print" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem',
          padding: '1.5rem 1.75rem',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(245, 158, 11, 0.04) 100%)',
          border: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary)', color: 'var(--primary-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                {t('executive_reports') || (isRTL ? 'التقارير التنفيذية والمالية الشاملة' : 'Executive Business Reports')}
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {isRTL 
                ? 'تحليلات تفصيلية لحركة المبيعات، التدفقات النقدية، تكاليف التشغيل، وأوامر التصنيع' 
                : 'Real-time performance intelligence, financial cashflow, operating margins, and factory audits'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn" 
              onClick={exportCurrentToCSV}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                padding: '0.6rem 1.15rem', 
                fontWeight: 700, 
                backgroundColor: 'var(--surface)', 
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '0.85rem'
              }}
            >
              <Download size={16} />
              <span>{isRTL ? 'تصدير Excel (CSV)' : 'Export CSV'}</span>
            </button>

            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => window.print()}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.6rem 1.35rem', 
                fontWeight: 800, 
                borderRadius: '10px',
                fontSize: '0.88rem'
              }}
            >
              <Printer size={17} />
              <span>{t('print_enterprise_report') || (isRTL ? 'طباعة التقرير الشامل' : 'Print Report')}</span>
            </button>
          </div>
        </div>

        {/* Date Filter & Fast Presets Bar */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)'
          }}
        >
          {/* Quick Date Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginInlineEnd: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={14} color="var(--primary)" />
              {isRTL ? 'الفترة:' : 'Period:'}
            </span>
            {[
              { id: 'all', label: isRTL ? 'الكل' : 'All' },
              { id: 'today', label: isRTL ? 'اليوم' : 'Today' },
              { id: 'this_week', label: isRTL ? 'هذا الأسبوع' : 'This Week' },
              { id: 'this_month', label: isRTL ? 'هذا الشهر' : 'This Month' },
              { id: 'this_year', label: isRTL ? 'هذا العام' : 'This Year' },
            ].map(preset => {
              const isActive = activeDatePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleDatePreset(preset.id)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 800 : 600,
                    cursor: 'pointer',
                    border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: isActive ? 'var(--primary)' : 'var(--surface)',
                    color: isActive ? 'var(--primary-foreground)' : 'var(--text-main)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--surface)', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{isRTL ? 'من' : 'From'}</span>
              <input 
                type="date" 
                value={fromDate} 
                onChange={e => { setFromDate(e.target.value); setActiveDatePreset('custom'); }}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', color: 'var(--text-main)', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--surface)', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{isRTL ? 'إلى' : 'To'}</span>
              <input 
                type="date" 
                value={toDate} 
                onChange={e => { setToDate(e.target.value); setActiveDatePreset('custom'); }}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', color: 'var(--text-main)', fontFamily: 'inherit' }}
              />
            </div>

            {(fromDate || toDate) && (
              <button 
                type="button" 
                onClick={() => { setFromDate(''); setToDate(''); setActiveDatePreset('all'); }}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', padding: '0.3rem 0.5rem' }}
              >
                <X size={14} /> {isRTL ? 'إلغاء' : 'Clear'}
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs & Module Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            {/* Category Groups */}
            <div style={{ display: 'inline-flex', background: 'var(--surface)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '2px' }}>
              {[
                { id: 'all', label: isRTL ? 'التقرير المجمع الشامل' : 'Master Overview' },
                { id: 'sales', label: isRTL ? 'المبيعات والعملاء' : 'Commercial & Sales' },
                { id: 'manufacturing', label: isRTL ? 'التصنيع والإنتاج' : 'Manufacturing' },
                { id: 'purchasing', label: isRTL ? 'المشتريات والمخزن' : 'Purchasing & Stock' },
                { id: 'finance', label: isRTL ? 'المالية والموظفين' : 'Finance & HR' },
              ].map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setActiveCategory(cat.id); setSelected('ALL'); }}
                    style={{
                      background: isActive ? 'var(--primary)' : 'transparent',
                      color: isActive ? 'var(--primary-foreground)' : 'var(--text-main)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.4rem 0.9rem',
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Section Jump Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{isRTL ? 'عرض جدول معين:' : 'Focus on:'}</span>
              <select
                value={selected}
                onChange={e => setSelected(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">{isRTL ? 'كافة جداول القسم المختار' : 'All Section Tables'}</option>
                {modulesCategoryFiltered.map(m => (
                  <option key={m.table} value={m.table}>{t(m.labelKey)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Executive Financial & Operational Pulse Cards */}
      <div 
        className="print-area" 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', 
          gap: '1.25rem' 
        }}
      >
        {/* Metric 1: Total Sales & Collection */}
        <div 
          className="glass-card modern-card-hover" 
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('total_gross_sales') || (isRTL ? 'إجمالي المبيعات' : 'Gross Sales')}
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {formatAmount(totalSales)} <span style={{ fontSize: '0.78rem' }}>{t('egp')}</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <TrendingUp size={18} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <span>{isRTL ? 'المحصل نقداً:' : 'Collected:'} {formatAmount(totalPaid)}</span>
              <span style={{ fontWeight: 800, color: '#10B981' }}>{collectionRate}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', borderRadius: '999px', background: 'var(--surface-hover)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%`, height: '100%', background: '#10B981', borderRadius: '999px' }} />
            </div>
          </div>
        </div>

        {/* Metric 2: Cost of Goods Sold (COGS) & Gross Profit */}
        <div 
          className="glass-card modern-card-hover" 
          title={profitTooltipText}
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>{isRTL ? 'تكلفة البضاعة المباعة (COGS)' : 'Cost of Goods Sold (COGS)'}</span>
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.2rem' }}>
                {formatAmount(effectiveCOGS)} <span style={{ fontSize: '0.78rem' }}>{t('egp')}</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
              <Box size={18} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            <span>{isRTL ? 'مجمل الربح:' : 'Gross Profit:'} <strong style={{ color: grossProfit >= 0 ? '#10B981' : '#EF4444' }}>{formatAmount(grossProfit)}</strong></span>
            <span style={{ padding: '2px 8px', borderRadius: '6px', background: grossProfit >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: grossProfit >= 0 ? '#10B981' : '#EF4444', fontWeight: 800, fontSize: '0.74rem' }}>
              {grossMargin}% {isRTL ? 'مجمل' : 'gross'}
            </span>
          </div>
        </div>

        {/* Metric 3: Accrual Net Profit (صافي الربح التشغيلي على أساس COGS) */}
        <div 
          className="glass-card modern-card-hover" 
          title={profitTooltipText}
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>{isRTL ? 'صافي الربح التشغيلي (COGS)' : 'Operating Net Profit (COGS)'}</span>
                <span
                  title={profitTooltipText}
                  style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help', color: 'var(--primary)' }}
                >
                  <Info size={14} />
                </span>
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: netProfit >= 0 ? '#10B981' : '#EF4444', marginTop: '0.2rem' }}>
                {formatAmount(netProfit)} <span style={{ fontSize: '0.78rem' }}>{t('egp')}</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: netProfit >= 0 ? '#10B981' : '#EF4444' }}>
              <Wallet size={18} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            <span>{isRTL ? 'بعد المسحوبات:' : 'After Drawings:'} {formatAmount(retainedProfit)}</span>
            <span style={{ padding: '2px 8px', borderRadius: '6px', background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: netProfit >= 0 ? '#10B981' : '#EF4444', fontWeight: 800, fontSize: '0.74rem' }}>
              {profitMargin}% {isRTL ? 'هامش' : 'margin'}
            </span>
          </div>
        </div>

        {/* Metric 3: Cash Net Profit (صافي الربح النقدي) */}
        <div 
          className="glass-card modern-card-hover" 
          title={cashProfitTooltipText}
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>{isRTL ? 'صافي الربح النقدي' : 'Net Cash Profit'}</span>
                <span
                  title={cashProfitTooltipText}
                  style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help', color: 'var(--primary)' }}
                >
                  <Info size={14} />
                </span>
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: netCashProfit >= 0 ? '#10B981' : '#EF4444', marginTop: '0.2rem' }}>
                {formatAmount(netCashProfit)} <span style={{ fontSize: '0.78rem' }}>{t('egp')}</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: netCashProfit >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: netCashProfit >= 0 ? '#10B981' : '#EF4444' }}>
              <Banknote size={18} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            <span>{isRTL ? 'بعد المسحوبات:' : 'After Drawings:'} {formatAmount(retainedCashProfit)}</span>
            <span style={{ padding: '2px 8px', borderRadius: '6px', background: netCashProfit >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: netCashProfit >= 0 ? '#10B981' : '#EF4444', fontWeight: 800, fontSize: '0.74rem' }}>
              {cashProfitMargin}% {isRTL ? 'نقدي' : 'cash'}
            </span>
          </div>
        </div>

        {/* Metric 4: Operating Expenses & Owner Drawings */}
        <div 
          className="glass-card modern-card-hover" 
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('total_expenses') || (isRTL ? 'مصاريف التشغيل والمشتريات' : 'Operating & Purchase Costs')}
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#EF4444', marginTop: '0.2rem' }}>
                {formatAmount(totalExpenses)} <span style={{ fontSize: '0.78rem' }}>{t('egp')}</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
              <TrendingDown size={18} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            <span>{isRTL ? 'مصاريف تشغيل:' : 'Ops:'} {formatAmount(totalExpensesLogged)}</span>
            <span>{isRTL ? 'مسحوبات المالك (مستقلة):' : 'Owner Drawings:'} {formatAmount(totalWithdrawals)}</span>
          </div>
        </div>

        {/* Metric 4: Receivables vs Payables */}
        <div 
          className="glass-card modern-card-hover" 
          style={{ 
            padding: '1.35rem', 
            borderRadius: '14px', 
            border: '1px solid var(--border)', 
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {t('net_outstanding_position') || (isRTL ? 'صافي المركز المالي' : 'Net Outstanding')}
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: (receivable - payable) >= 0 ? '#10B981' : '#F59E0B', marginTop: '0.2rem' }}>
                {formatAmount(receivable - payable)} <span style={{ fontSize: '0.78rem' }}>{t('egp')}</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <Banknote size={18} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
            <span style={{ color: '#10B981', fontWeight: 700 }}>
              {isRTL ? 'عملاء (لنا): ' : 'Receivable: '}{formatAmount(receivable)}
            </span>
            <span style={{ color: '#F59E0B', fontWeight: 700 }}>
              {isRTL ? 'موردين (علينا): ' : 'Payable: '}{formatAmount(payable)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Report Canvas (Printable & Interactive) */}
      <div 
        className="glass-card print-area" 
        dir={isRTL ? 'rtl' : 'ltr'} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '2rem', 
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          background: 'var(--surface)'
        }}
      >
        {/* Printable Official Letterhead */}
        <div 
          className="print-header" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            borderBottom: '2px solid var(--border)',
            paddingBottom: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {profile.logo ? (
              <img 
                src={profile.logo} 
                alt="Company Logo" 
                style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: '10px', border: '1px solid var(--border)' }} 
              />
            ) : null}
            <div>
              <h2 className="company-name" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>{getDisplayName(isRTL)}</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>{getTagline(isRTL)}</div>
              <p className="report-title" style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--primary)', fontSize: '0.92rem' }}>
                {t('executive_master_report') || (isRTL ? 'التقرير المالي والتنفيذي الشامل' : 'Executive Master Report')} — <span style={{ color: 'var(--text-main)' }}>{periodLabel}</span>
              </p>
            </div>
          </div>

          <div className="print-meta" style={{ textAlign: isRTL ? 'left' : 'right', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <div><strong>{t('printed_at') || (isRTL ? 'تاريخ الطباعة:' : 'Printed:')}</strong> {new Date().toLocaleString(isRTL ? 'ar-EG' : 'en-GB')}</div>
            {profile.tax_number ? <div><strong>{isRTL ? 'الرقم الضريبي:' : 'Tax No:'}</strong> {profile.tax_number}</div> : null}
            {profile.phone ? <div><strong>{isRTL ? 'هاتف:' : 'Tel:'}</strong> {profile.phone}</div> : null}
          </div>
        </div>

        {/* Master Section Overview Table when 'ALL' is chosen */}
        {selected === 'ALL' && (
          <div className="table-card" style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-hover)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <LayoutList size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  {t('all_pages_overview') || (isRTL ? 'ملخص إحصائيات أقسام النظام المسجلة' : 'System Sections Summary')}
                </h3>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, background: 'var(--surface)', padding: '2px 10px', borderRadius: '999px', border: '1px solid var(--border)' }}>
                {modulesToShow.length} {isRTL ? 'أقسام نشطة' : 'Modules'}
              </span>
            </div>

            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: align, fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)' }}>
                    <th style={{ textAlign: align, width: '35%', padding: '0.75rem 1rem' }}>{t('page') || (isRTL ? 'القسم / الشاشة' : 'Section / Module')}</th>
                    <th style={{ textAlign: 'center', width: '15%', padding: '0.75rem 1rem' }}>{t('records') || (isRTL ? 'عدد السجلات' : 'Records')}</th>
                    <th style={{ textAlign: align, width: '25%', padding: '0.75rem 1rem' }}>{isRTL ? 'المؤشر التشغيلي الأهم' : 'Primary KPI'}</th>
                    <th style={{ textAlign: endAlign, width: '25%', padding: '0.75rem 1rem' }}>{isRTL ? 'القيمة / الكمية' : 'Total / Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {modulesToShow.map(mod => {
                    const rows = filtered[mod.table] || [];
                    const main = computeTableMetrics(mod.table, rows, data, t, isRTL)[0];
                    const Icon = mod.icon;

                    return (
                      <tr 
                        key={mod.table}
                        className="clickable-row"
                        onClick={() => setSelected(mod.table)}
                        style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                      >
                        <td style={{ textAlign: align, padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--primary)',
                              flexShrink: 0
                            }}>
                              <Icon size={16} />
                            </div>
                            <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                              {t(mod.labelKey)}
                            </span>
                          </div>
                        </td>

                        <td style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '9999px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor: rows.length > 0 ? 'var(--surface-hover)' : 'transparent',
                            border: '1px solid var(--border)',
                            color: rows.length > 0 ? 'var(--text-main)' : 'var(--text-muted)'
                          }}>
                            {rows.length} {isRTL ? 'سجل' : 'items'}
                          </span>
                        </td>

                        <td style={{ textAlign: align, padding: '0.75rem 1rem' }}>
                          {main ? (
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: 'var(--text-muted)',
                              backgroundColor: 'var(--surface-hover)',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              {main.title}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>

                        <td style={{ textAlign: endAlign, padding: '0.75rem 1rem' }}>
                          {main ? (
                            <span style={{
                              fontSize: '0.94rem',
                              fontWeight: 800,
                              color: main.valueColor || 'var(--text-main)',
                              fontVariantNumeric: 'tabular-nums',
                              whiteSpace: 'nowrap'
                            }}>
                              {main.isCurrency 
                                ? `${formatAmount(main.value)} ${t('egp') || (isRTL ? 'ج.م' : 'EGP')}` 
                                : (typeof main.value === 'number' ? formatAmount(main.value) : main.value)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Sections Per Module */}
        {modulesToShow.map(mod => {
          const rows = filtered[mod.table] || [];
          const cards = computeTableMetrics(mod.table, rows, data, t, isRTL);
          const Icon = mod.icon;
          const currencyCols = mod.columns.filter(c => c.type === 'currency');

          return (
            <section 
              key={mod.table} 
              id={`report-${mod.table}`} 
              className="report-section" 
              dir={isRTL ? 'rtl' : 'ltr'}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                paddingTop: selected === 'ALL' ? '1.5rem' : '0',
                borderTop: selected === 'ALL' ? '1px dashed var(--border)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <Icon size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {t(mod.labelKey)}
                  </h3>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-hover)', padding: '2px 8px', borderRadius: '999px' }}>
                    {rows.length} {isRTL ? 'سجل' : 'records'}
                  </span>
                </div>

                {selected !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelected('ALL')}
                    className="hide-on-print"
                    style={{
                      background: 'var(--surface-hover)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      color: 'var(--text-main)'
                    }}
                  >
                    {isRTL ? '← العودة للتقرير الشامل' : 'Back to Master Overview'}
                  </button>
                )}
              </div>

              {/* Metric Cards for this section */}
              <PageMetricCards cards={cards} printable />

              {/* Data Table */}
              {rows.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'var(--surface-hover)', borderRadius: '10px' }}>
                  {t('no_records') || (isRTL ? 'لا توجد سجلات مسجلة في هذه الفترة المحددة.' : 'No records found for the selected period.')}
                </div>
              ) : (
                <div className="table-card" style={{ width: '100%', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: align, fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-hover)' }}>
                        <th style={{ textAlign: align, width: '42px', padding: '0.65rem 0.85rem' }}>#</th>
                        {mod.columns.map(c => (
                          <th key={c.key} style={{ textAlign: c.type === 'currency' ? endAlign : align, fontWeight: 700, padding: '0.65rem 0.85rem' }}>
                            {t(c.labelKey)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr 
                          key={row.id || idx}
                          className="clickable-row"
                          onClick={() => setViewModalTarget({
                            table: mod.table,
                            title: t(mod.labelKey),
                            schema: mod.columns.map(c => ({ 
                              key: c.key, 
                              label: c.labelKey, 
                              type: c.type || (c.rel ? 'relation' : 'text'), 
                              relationTable: c.rel,
                              isCurrency: c.type === 'currency' 
                            })),
                            record: row
                          })}
                          style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                        >
                          <td style={{ color: 'var(--text-muted)', padding: '0.65rem 0.85rem' }}>{idx + 1}</td>
                          {mod.columns.map(c => (
                            <td 
                              key={c.key} 
                              style={{ 
                                textAlign: c.type === 'currency' ? endAlign : align, 
                                fontWeight: c.type === 'currency' ? 700 : 500,
                                padding: '0.65rem 0.85rem',
                                maxWidth: c.key === 'notes' ? '300px' : undefined
                              }}
                            >
                              {renderCell(row, c)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {currencyCols.length > 0 && (
                      <tfoot>
                        <tr style={{ background: 'var(--surface-hover)', borderTop: '2px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem 0.85rem' }}></td>
                          {mod.columns.map((c, i) => (
                            <td 
                              key={c.key} 
                              style={{ 
                                textAlign: c.type === 'currency' ? endAlign : align, 
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                padding: '0.75rem 0.85rem',
                                color: 'var(--text-main)'
                              }}
                            >
                              {c.type === 'currency'
                                ? `${formatAmount(rows.reduce((s, r) => s + (Number(getCellValue(r, c)) || 0), 0))} ${t('egp') || (isRTL ? 'ج.م' : 'EGP')}`
                                : (i === 0 ? (t('grand_total') || (isRTL ? 'الإجمالي الكلي' : 'Total')) : '')}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </section>
          );
        })}

        {/* Certified Footer */}
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {t('report_footer_note') || (isRTL ? 'تم استخراج هذا التقرير آلياً عبر نظام ألترا باك لإدارة وتصنيع التعبئة والتغليف.' : 'This report is generated automatically by Ultra Pack ERP System.')}
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem' }}>
            {t('certified_internal_report') || (isRTL ? 'مستند رقابي وتشغيلي معتمد' : 'Certified Enterprise Operations Document')} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Global Row Detail Modal */}
      {viewModalTarget && (
        <RecordDetailModal
          tableName={viewModalTarget.table}
          title={viewModalTarget.title}
          schema={viewModalTarget.schema}
          record={viewModalTarget.record}
          relationsData={data}
          onClose={() => setViewModalTarget(null)}
        />
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .report-section { break-before: page; }
          .report-section h3 { break-after: avoid; }
          .report-box, .metric-cards-grid > div { break-inside: avoid; border-color: #e4e4e7 !important; }
          .print-area tfoot td { border-top: 2px solid #09090b !important; color: #09090b !important; }
        }
      `}} />
    </div>
  );
}
