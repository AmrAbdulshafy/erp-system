"use client";

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useRouter } from 'next/navigation';
import { db, useLiveQuery } from '../../db';
import { 
  Users, Briefcase, Truck, Shield, Search, Phone, Mail, 
  MapPin, DollarSign, Calendar, Clock, CheckCircle2, XCircle, 
  FileText, ShoppingCart, ShoppingBag, ArrowUpRight, 
  Building2, Layers, Filter, ExternalLink, Printer
} from 'lucide-react';
import { formatAmount } from '../../utils/format';
import { useCompanyProfile } from '../../utils/companyProfile';
import EntityProfileModal from '../../components/EntityProfileModal';

export default function ProfilesDirectoryPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  const router = useRouter();
  const { profile, getDisplayName, getTagline } = useCompanyProfile();

  // Active Category Tab: 'all' | 'employees' | 'customers' | 'suppliers' | 'users'
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'balance'
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Live query for all 4 entity collections + transactions for timeline insights
  const rawEmployees = useLiveQuery(() => db.employees?.filter(e => !e.deleted_at).toArray() || [], []) || [];
  const rawCustomers = useLiveQuery(() => db.customers?.filter(c => !c.deleted_at).toArray() || [], []) || [];
  const rawSuppliers = useLiveQuery(() => db.suppliers?.filter(s => !s.deleted_at).toArray() || [], []) || [];
  const rawUsers = useLiveQuery(() => db.users?.filter(u => !u.deleted_at).toArray() || [], []) || [];

  // Related transactional activity
  const rawSales = useLiveQuery(() => db.sales_orders?.filter(o => !o.deleted_at).toArray() || [], []) || [];
  const rawPurchases = useLiveQuery(() => db.purchase_orders?.filter(p => !p.deleted_at).toArray() || [], []) || [];
  const rawQuotations = useLiveQuery(() => db.quotations?.filter(q => !q.deleted_at).toArray() || [], []) || [];
  const rawProduction = useLiveQuery(() => db.employee_production?.filter(ep => !ep.deleted_at).toArray() || [], []) || [];
  const rawAttendance = useLiveQuery(() => db.attendance?.filter(a => !a.deleted_at).toArray() || [], []) || [];

  // Normalized entities list
  const allEntities = useMemo(() => {
    const list = [];

    // 1. Employees
    rawEmployees.forEach(emp => {
      const empUser = rawUsers.find(u => u.employee_id === emp.id);
      const empProd = rawProduction.filter(ep => ep.employee_id === emp.id);
      const totalPieces = empProd.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
      const totalPieceBonus = empProd.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
      const empAtt = rawAttendance.filter(a => a.employee_id === emp.id);
      const presentDays = empAtt.filter(a => a.status === 'PRESENT').length;
      const absentDays = empAtt.filter(a => a.status === 'ABSENT').length;

      list.push({
        id: emp.id,
        entityType: 'employee',
        name: emp.full_name || 'Unnamed Employee',
        secondaryName: emp.job_title || (isRTL ? 'موظف' : 'Employee'),
        department: emp.department || 'GENERAL',
        phone: emp.mobile_number || emp.phone || '—',
        email: emp.email || '—',
        address: emp.address || '—',
        salaryType: emp.salary_type || 'MONTHLY',
        salaryAmount: Number(emp.salary_amount) || 0,
        shift: `${emp.shift_start_time || '08:00'} - ${emp.shift_end_time || '17:00'}`,
        isActive: emp.is_active !== 0 && emp.is_active !== false,
        linkedUser: empUser ? empUser.username : null,
        linkedRole: empUser ? empUser.role : null,
        stats: {
          totalPieces,
          totalPieceBonus,
          presentDays,
          absentDays
        },
        raw: emp
      });
    });

    // 2. Customers
    rawCustomers.forEach(cust => {
      const custSales = rawSales.filter(s => s.customer_id === cust.id);
      const totalSalesAmount = custSales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
      const totalSalesPaid = custSales.reduce((sum, s) => sum + (Number(s.amount_paid) || 0), 0);
      const custQuotes = rawQuotations.filter(q => q.customer_id === cust.id);

      list.push({
        id: cust.id,
        entityType: 'customer',
        name: cust.customer_name || 'Unnamed Customer',
        secondaryName: cust.company_name || (isRTL ? 'شركة / عميل' : 'Client Account'),
        department: isRTL ? 'المبيعات والعملاء' : 'Sales & Clients',
        phone: cust.mobile_number || cust.phone || '—',
        email: cust.email || '—',
        address: cust.address || '—',
        balance: Number(cust.account_balance) || 0,
        ordersCount: custSales.length,
        quotesCount: custQuotes.length,
        totalSalesAmount,
        totalSalesPaid,
        isActive: true,
        raw: cust
      });
    });

    // 3. Suppliers
    rawSuppliers.forEach(sup => {
      const supPurchases = rawPurchases.filter(p => p.supplier_id === sup.id);
      const totalPurchasesAmount = supPurchases.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
      const totalPurchasesPaid = supPurchases.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);

      list.push({
        id: sup.id,
        entityType: 'supplier',
        name: sup.supplier_name || 'Unnamed Supplier',
        secondaryName: sup.contact_person ? `${isRTL ? 'مسؤول الاتصال:' : 'Contact:'} ${sup.contact_person}` : (isRTL ? 'مورد خامات' : 'Raw Materials Supplier'),
        department: isRTL ? 'المشتريات والموردين' : 'Purchasing & Suppliers',
        phone: sup.mobile_number || sup.phone || '—',
        email: sup.email || '—',
        address: sup.address || '—',
        balance: Number(sup.account_balance) || 0,
        ordersCount: supPurchases.length,
        totalPurchasesAmount,
        totalPurchasesPaid,
        isActive: true,
        raw: sup
      });
    });

    // 4. System Users
    rawUsers.forEach(usr => {
      const linkedEmp = rawEmployees.find(e => e.id === usr.employee_id);

      list.push({
        id: usr.id,
        entityType: 'user',
        name: usr.username || 'User',
        secondaryName: linkedEmp ? linkedEmp.full_name : (isRTL ? 'حساب نظام غير مرتبط بموظف' : 'Standalone Account'),
        department: usr.role || 'ADMIN',
        phone: linkedEmp ? (linkedEmp.mobile_number || linkedEmp.phone) : '—',
        email: '—',
        address: '—',
        role: usr.role || 'ADMIN',
        pinCode: usr.pin_code || '—',
        isActive: usr.is_active !== 0 && usr.is_active !== false,
        employeeName: linkedEmp ? linkedEmp.full_name : null,
        raw: usr
      });
    });

    return list;
  }, [rawEmployees, rawCustomers, rawSuppliers, rawUsers, rawSales, rawPurchases, rawQuotations, rawProduction, rawAttendance, isRTL]);

  // Filtered List
  const filteredEntities = useMemo(() => {
    return allEntities.filter(ent => {
      // Category filter
      if (activeCategory !== 'all') {
        if (activeCategory === 'employees' && ent.entityType !== 'employee') return false;
        if (activeCategory === 'customers' && ent.entityType !== 'customer') return false;
        if (activeCategory === 'suppliers' && ent.entityType !== 'supplier') return false;
        if (activeCategory === 'users' && ent.entityType !== 'user') return false;
      }

      // Status filter
      if (statusFilter === 'active' && !ent.isActive) return false;
      if (statusFilter === 'balance' && (ent.balance === undefined || ent.balance === 0)) return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = ent.name?.toLowerCase().includes(q);
        const matchSec = ent.secondaryName?.toLowerCase().includes(q);
        const matchDept = ent.department?.toLowerCase().includes(q);
        const matchPhone = ent.phone?.toLowerCase().includes(q);
        const matchRole = ent.role?.toLowerCase().includes(q);
        return matchName || matchSec || matchDept || matchPhone || matchRole;
      }

      return true;
    });
  }, [allEntities, activeCategory, statusFilter, searchQuery]);

  // Category counts
  const counts = useMemo(() => {
    return {
      all: allEntities.length,
      employees: allEntities.filter(e => e.entityType === 'employee').length,
      customers: allEntities.filter(e => e.entityType === 'customer').length,
      suppliers: allEntities.filter(e => e.entityType === 'supplier').length,
      users: allEntities.filter(e => e.entityType === 'user').length,
    };
  }, [allEntities]);

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'employee':
        return { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', border: 'rgba(59, 130, 246, 0.25)', label: isRTL ? 'موظف / عامل' : 'Employee' };
      case 'customer':
        return { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.25)', label: isRTL ? 'عميل' : 'Customer' };
      case 'supplier':
        return { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.25)', label: isRTL ? 'مورد' : 'Supplier' };
      case 'user':
        return { bg: 'rgba(139, 92, 246, 0.12)', text: '#7c3aed', border: 'rgba(139, 92, 246, 0.25)', label: isRTL ? 'مستخدم نظام' : 'System User' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.12)', text: '#4b5563', border: 'rgba(107, 114, 128, 0.25)', label: type };
    }
  };

  const getEntityIcon = (type) => {
    switch (type) {
      case 'employee': return <Users size={18} />;
      case 'customer': return <Briefcase size={18} />;
      case 'supplier': return <Truck size={18} />;
      case 'user': return <Shield size={18} />;
      default: return <Users size={18} />;
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem', direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}>
      
      {/* Top Header Card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'var(--primary)', color: '#fff', fontSize: '0.75rem', fontWeight: 800 }}>
              ENTERPRISE DIRECTORY 2026
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{getDisplayName(isRTL)}</span>
          </div>
          <h1 className="page-title" style={{ margin: '0 0 0.35rem 0', fontSize: '1.75rem', fontWeight: 900 }}>
            {isRTL ? 'سجل الملفات الشاملة (بروفايل الموظفين، العملاء، الموردين، والمستخدمين)' : 'Enterprise Profile Directory (Employees, Customers, Suppliers & Users)'}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            {isRTL 
              ? 'شاشة مركزية موحدة تضم كافة بيانات الأشخاص والجهات المتعاملة مع المصنع، سجلات المعاملات، الأرصدة، الرواتب، والصلاحيات مع البحث الفوري.'
              : 'Unified directory providing 360° profile views of all plant stakeholders, transactional history, ledger balances, and role credentials.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} className="hide-on-print">
          <button 
            type="button" 
            onClick={() => router.push('/settings')} 
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1rem', background: 'var(--surface-hover)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
          >
            <Building2 size={16} />
            <span>{isRTL ? 'إعدادات الشركة والشعار' : 'Company Branding'}</span>
          </button>
          <button 
            type="button" 
            onClick={() => window.print()} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.85rem' }}
          >
            <Printer size={16} />
            <span>{isRTL ? 'طباعة الدليل' : 'Print Directory'}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div 
          onClick={() => setActiveCategory('employees')}
          style={{ 
            padding: '1.15rem', 
            borderRadius: '12px', 
            background: activeCategory === 'employees' ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-hover)', 
            border: activeCategory === 'employees' ? '2px solid #3b82f6' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3b82f6' }}>{isRTL ? 'الموظفين والعمال' : 'Employees & Operators'}</span>
            <Users size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{counts.employees}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isRTL ? 'كشوف الرواتب والإنتاجية' : 'Payroll & machine staff'}</span>
        </div>

        <div 
          onClick={() => setActiveCategory('customers')}
          style={{ 
            padding: '1.15rem', 
            borderRadius: '12px', 
            background: activeCategory === 'customers' ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface-hover)', 
            border: activeCategory === 'customers' ? '2px solid #10b981' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>{isRTL ? 'العملاء والشركات' : 'Customers & Accounts'}</span>
            <Briefcase size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{counts.customers}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isRTL ? 'عروض الأسعار والطلبيات' : 'Quotes & sales ledger'}</span>
        </div>

        <div 
          onClick={() => setActiveCategory('suppliers')}
          style={{ 
            padding: '1.15rem', 
            borderRadius: '12px', 
            background: activeCategory === 'suppliers' ? 'rgba(245, 158, 11, 0.12)' : 'var(--surface-hover)', 
            border: activeCategory === 'suppliers' ? '2px solid #f59e0b' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>{isRTL ? 'موردي الخامات' : 'Suppliers & Vendors'}</span>
            <Truck size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{counts.suppliers}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isRTL ? 'رولات الورق والغراء' : 'Kraft paper & adhesives'}</span>
        </div>

        <div 
          onClick={() => setActiveCategory('users')}
          style={{ 
            padding: '1.15rem', 
            borderRadius: '12px', 
            background: activeCategory === 'users' ? 'rgba(139, 92, 246, 0.12)' : 'var(--surface-hover)', 
            border: activeCategory === 'users' ? '2px solid #8b5cf6' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8b5cf6' }}>{isRTL ? 'مستخدمي النظام' : 'System Users & Logins'}</span>
            <Shield size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{counts.users}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isRTL ? 'الصلاحيات والـ PIN' : 'Access control & roles'}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ border: '1px solid var(--border)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Category Tabs */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-hover)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: isRTL ? `الكل (${counts.all})` : `All (${counts.all})` },
              { id: 'employees', label: isRTL ? `الموظفين (${counts.employees})` : `Employees (${counts.employees})` },
              { id: 'customers', label: isRTL ? `العملاء (${counts.customers})` : `Customers (${counts.customers})` },
              { id: 'suppliers', label: isRTL ? `الموردين (${counts.suppliers})` : `Suppliers (${counts.suppliers})` },
              { id: 'users', label: isRTL ? `المستخدمين (${counts.users})` : `Users (${counts.users})` }
            ].map(tab => {
              const isSelected = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  style={{
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    color: isSelected ? '#fff' : 'var(--text-main)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 800 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '450px' }}>
            <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRTL ? 'right' : 'left']: '0.85rem', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'بحث بالاسم، الهاتف، القسم، أو الدور...' : 'Search by name, phone, department, role...'}
              style={{
                width: '100%',
                padding: '0.55rem 1rem',
                [isRTL ? 'paddingRight' : 'paddingLeft']: '2.3rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-main)',
                fontSize: '0.88rem'
              }}
            />
          </div>
        </div>

        {/* Status Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', paddingTop: '0.25rem', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {isRTL ? 'تصفية الحالة:' : 'Filter Status:'}
          </span>
          {[
            { id: 'all', label: isRTL ? 'الكل' : 'All' },
            { id: 'active', label: isRTL ? 'النشطون فقط' : 'Active Only' },
            { id: 'balance', label: isRTL ? 'ذوو أرصدة مالية' : 'With Ledger Balance' }
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              style={{
                padding: '0.25rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: statusFilter === s.id ? 'var(--surface-hover)' : 'transparent',
                fontWeight: statusFilter === s.id ? 700 : 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                color: statusFilter === s.id ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              {s.label}
            </button>
          ))}
          <span style={{ marginInlineStart: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {isRTL ? `إجمالي النتائج: ${filteredEntities.length}` : `Found ${filteredEntities.length} entities`}
          </span>
        </div>
      </div>

      {/* Directory Grid of Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filteredEntities.map((ent) => {
          const badge = getBadgeStyle(ent.entityType);
          return (
            <div
              key={`${ent.entityType}-${ent.id}`}
              className="glass-card clickable-row"
              onClick={() => setSelectedEntity(ent)}
              style={{
                border: '1px solid var(--border)',
                padding: '1.25rem',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                cursor: 'pointer',
                background: 'var(--surface)'
              }}
            >
              {/* Card Header: Type Badge + Status + Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: badge.bg,
                  color: badge.text,
                  border: `1px solid ${badge.border}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  {getEntityIcon(ent.entityType)}
                  {badge.label}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {ent.isActive ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#10b981', fontSize: '0.72rem', fontWeight: 700 }}>
                      <CheckCircle2 size={13} /> {isRTL ? 'نشط' : 'Active'}
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700 }}>
                      <XCircle size={13} /> {isRTL ? 'معطل' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>

              {/* Entity Main Name & Role/Title */}
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3 }}>
                  {ent.name}
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {ent.secondaryName}
                </p>
              </div>

              {/* Quick Details Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Layers size={13} /> {isRTL ? 'القسم / التصنيف:' : 'Department / Role:'}
                  </span>
                  <span style={{ fontWeight: 700 }}>{ent.department}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Phone size={13} /> {isRTL ? 'الهاتف:' : 'Phone:'}
                  </span>
                  <span style={{ direction: 'ltr', fontWeight: 600 }}>{ent.phone}</span>
                </div>

                {ent.address && ent.address !== '—' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={13} /> {isRTL ? 'العنوان:' : 'Address:'}
                    </span>
                    <span style={{ fontWeight: 600, maxWidth: '180px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {ent.address}
                    </span>
                  </div>
                )}

                {/* Specifics for Employees */}
                {ent.entityType === 'employee' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الراتب الأساسي:' : 'Base Salary:'}</span>
                      <span style={{ fontWeight: 800, color: '#10b981' }}>
                        {formatAmount(ent.salaryAmount)} {isRTL ? 'ج.م' : 'EGP'} ({ent.salaryType})
                      </span>
                    </div>
                    {ent.linkedUser && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'حساب الدخول:' : 'Login User:'}</span>
                        <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{ent.linkedUser} ({ent.linkedRole})</span>
                      </div>
                    )}
                  </>
                )}

                {/* Specifics for Customers */}
                {ent.entityType === 'customer' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'الرصيد / المديونية:' : 'Balance Dues:'}</span>
                    <span style={{ fontWeight: 800, color: ent.balance < 0 ? '#2563eb' : (ent.balance > 0 ? '#ef4444' : '#10b981') }}>
                      {formatAmount(ent.balance)} {isRTL ? 'ج.م' : 'EGP'}{ent.balance < 0 ? ' (دفعة مقدمة)' : ''}
                    </span>
                  </div>
                )}

                {/* Specifics for Suppliers */}
                {ent.entityType === 'supplier' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'مستحقات المورد:' : 'Payable Dues:'}</span>
                    <span style={{ fontWeight: 800, color: ent.balance < 0 ? '#2563eb' : (ent.balance > 0 ? '#f59e0b' : '#10b981') }}>
                      {formatAmount(ent.balance)} {isRTL ? 'ج.م' : 'EGP'}{ent.balance < 0 ? ' (دفعة مقدمة)' : ''}
                    </span>
                  </div>
                )}

                {/* Specifics for Users */}
                {ent.entityType === 'user' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{isRTL ? 'رمز PIN السريع:' : 'Quick PIN:'}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{ent.pinCode ? '••••' : '—'}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredEntities.length === 0 && (
        <div style={{ padding: '3.5rem', textAlign: 'center', background: 'var(--surface-hover)', borderRadius: '14px', border: '1px dashed var(--border)' }}>
          <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
          <h3 style={{ margin: '0 0 0.35rem 0', fontWeight: 700 }}>
            {isRTL ? 'لا توجد ملفات تطابق شروط البحث' : 'No Profiles Found'}
          </h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {isRTL ? 'جرب البحث بكلمة أخرى أو قم بإلغاء التصفية لإظهار كافة النتائج.' : 'Try adjusting your search criteria or resetting filters.'}
          </p>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* DETAILED PROFILE MODAL DIALOG */}
      {/* ========================================================================================= */}
      {selectedEntity && (
        <EntityProfileModal
          entityType={selectedEntity.entityType}
          entityId={selectedEntity.id}
          onClose={() => setSelectedEntity(null)}
        />
      )}

    </div>
  );
}
