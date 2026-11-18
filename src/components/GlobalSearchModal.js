"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { db } from '../db';
import { 
  Search, X, ArrowRight, CornerDownLeft, 
  LayoutDashboard, Users, Package, Clock, Box, Briefcase, 
  ShoppingCart, Receipt, Truck, ShoppingBag, Shield, 
  ClipboardCheck, Banknote, FileText, Settings, MapPin, HandCoins,
  Eye, Info, ExternalLink, Edit3
} from 'lucide-react';
import { canAccessScreen } from '../utils/permissionMatrix';
import { useAuth } from '../context/AuthContext';
import RecordDetailModal from './RecordDetailModal';
import EntityProfileModal from './EntityProfileModal';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cardModalData, setCardModalData] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const rawNavigationPages = [
    { name: t('dashboard') || 'Dashboard', path: '/', category: 'Page', icon: LayoutDashboard },
    { name: t('reports') || 'Reports', path: '/reports', category: 'Page', icon: FileText },
    { name: t('quotations') || 'Quotations', path: '/quotations', category: 'Page', icon: FileText },
    { name: t('sales_orders') || 'Sales Orders', path: '/sales', category: 'Page', icon: ShoppingCart },
    { name: t('work_orders') || 'Work Orders', path: '/work-orders', category: 'Page', icon: ClipboardCheck },
    { name: t('purchase_orders') || 'Purchase Orders', path: '/purchases', category: 'Page', icon: ShoppingBag },
    { name: t('shipping') || 'Shipping', path: '/shipping', category: 'Page', icon: MapPin },
    { name: t('expenses') || 'Expenses', path: '/expenses', category: 'Page', icon: Receipt },
    { name: t('owner_withdrawals') || 'Owner Withdrawals', path: '/owner-withdrawals', category: 'Page', icon: Receipt },
    { name: t('customers') || 'Customers', path: '/customers', category: 'Page', icon: Briefcase },
    { name: t('suppliers') || 'Suppliers', path: '/suppliers', category: 'Page', icon: Truck },
    { name: t('employees') || 'Employees', path: '/employees', category: 'Page', icon: Users },
    { name: t('payroll') || 'Payroll', path: '/payroll', category: 'Page', icon: Banknote },
    { name: t('employee_loans') || 'Employee Loans', path: '/loans', category: 'Page', icon: HandCoins },
    { name: t('users') || 'Users', path: '/users', category: 'Page', icon: Shield },
    { name: t('production') || 'Production', path: '/production', category: 'Page', icon: Package },
    { name: t('attendance') || 'Attendance', path: '/attendance', category: 'Page', icon: Clock },
    { name: t('inventory') || 'Inventory', path: '/inventory', category: 'Page', icon: Box },
  ];

  // Filter navigation pages by current user role permission
  const navigationPages = rawNavigationPages.filter(p => canAccessScreen(user?.role, p.path));

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setQuery('');
        setSelectedIndex(0);
        setCardModalData(null);
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Search logic across pages and DB with strict RBAC permission checks
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    const performSearch = async () => {
      const q = query.trim().toLowerCase();

      if (!q) {
        // Show default navigation shortcuts authorized for this role
        if (isSubscribed) {
          setResults(navigationPages.slice(0, 8).map(p => ({
            id: p.path,
            title: p.name,
            subtitle: p.path,
            category: p.category,
            icon: p.icon,
            link: p.path
          })));
          setSelectedIndex(0);
        }
        return;
      }

      setIsLoading(true);

      try {
        const matches = [];

        // 1. Filter Navigation Pages (Already permitted)
        navigationPages.forEach(p => {
          if (p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)) {
            matches.push({
              id: p.path,
              title: p.name,
              subtitle: p.path,
              category: t('page') || 'Page',
              icon: p.icon,
              link: p.path
            });
          }
        });

        // RBAC Permissions for each database entity
        const canViewCustomers = canAccessScreen(user?.role, '/customers');
        const canViewInventory = canAccessScreen(user?.role, '/inventory');
        const canViewEmployees = canAccessScreen(user?.role, '/employees');
        const canViewSuppliers = canAccessScreen(user?.role, '/suppliers');
        const canViewQuotations = canAccessScreen(user?.role, '/quotations');
        const canViewSales = canAccessScreen(user?.role, '/sales');
        const canViewPurchases = canAccessScreen(user?.role, '/purchases');
        const canViewWorkOrders = canAccessScreen(user?.role, '/work-orders');
        const canViewLoans = canAccessScreen(user?.role, '/loans');
        const canViewExpenses = canAccessScreen(user?.role, '/expenses');
        const canViewShipping = canAccessScreen(user?.role, '/shipping');

        // 2. Query Customers (Only if permitted)
        if (canViewCustomers && db.customers) {
          const customers = await db.customers
            .filter(c => !c.deleted_at && (
              (c.customer_name || '').toLowerCase().includes(q) ||
              (c.company_name || '').toLowerCase().includes(q) ||
              (c.mobile_number || '').toLowerCase().includes(q) ||
              (c.phone || '').toLowerCase().includes(q) ||
              (c.email || '').toLowerCase().includes(q)
            ))
            .limit(5)
            .toArray();

          customers.forEach(c => {
            matches.push({
              id: `customer-${c.id}`,
              title: c.customer_name,
              subtitle: [c.company_name, c.mobile_number || c.phone, c.email].filter(Boolean).join(' • ') || (t('customer') || 'Customer'),
              category: t('customer') || 'Customer',
              icon: Briefcase,
              link: '/customers',
              modalType: 'profile',
              entityType: 'customer',
              entityId: c.id,
              rawRecord: c
            });
          });
        }

        // 3. Query Raw Materials / Inventory (Only if permitted)
        if (canViewInventory && db.raw_materials) {
          const materials = await db.raw_materials
            .filter(m => !m.deleted_at && (
              (m.material_name || '').toLowerCase().includes(q) ||
              (m.category || '').toLowerCase().includes(q) ||
              (m.size || '').toLowerCase().includes(q) ||
              (m.color_print || '').toLowerCase().includes(q)
            ))
            .limit(5)
            .toArray();

          materials.forEach(m => {
            const unitCost = m.unit_price ?? m.price_per_unit ?? 0;
            matches.push({
              id: `material-${m.id}`,
              title: m.material_name,
              subtitle: `${t('stock') || 'Stock'}: ${m.stock_quantity ?? 0} ${m.unit || ''} | ${t('unit_price') || 'Price'}: ${unitCost} ${t('egp') || 'EGP'}`,
              category: t('material') || 'Material',
              icon: Box,
              link: '/inventory',
              modalType: 'detail',
              tableName: 'raw_materials',
              recordTitle: t('inventory') || 'Raw Material',
              schema: [
                { key: 'material_name', label: 'material_name', type: 'text' },
                { key: 'size', label: 'size', type: 'text' },
                { key: 'thickness_gsm', label: 'thickness_gsm', type: 'text' },
                { key: 'color_print', label: 'color_print', type: 'text' },
                { key: 'unit', label: 'unit', type: 'text' },
                { key: 'stock_quantity', label: 'stock_quantity', type: 'number' },
                { key: 'min_stock_alert', label: 'min_stock_alert', type: 'number' },
                { key: 'unit_price', label: 'unit_price', type: 'number', isCurrency: true },
                { key: 'sales_unit_price', label: 'sales_unit_price', type: 'number', isCurrency: true },
                { key: 'supplier_id', label: 'supplier', type: 'relation', relationTable: 'suppliers', relationLabel: 'supplier_name' }
              ],
              rawRecord: m
            });
          });
        }

        // 4. Query Quotations (Only if permitted)
        if (canViewQuotations && db.quotations) {
          const quotes = await db.quotations
            .filter(r => !r.deleted_at && (
              (r.quotation_number || '').toLowerCase().includes(q) ||
              (r.quote_code || '').toLowerCase().includes(q) ||
              (r.notes || '').toLowerCase().includes(q) ||
              String(r.id || '').toLowerCase().includes(q)
            ))
            .limit(4)
            .toArray();

          quotes.forEach(r => {
            const code = r.quotation_number || r.quote_code || String(r.id || '').slice(0, 8);
            matches.push({
              id: `quote-${r.id}`,
              title: `${t('quotation') || 'Quotation'} #${code}`,
              subtitle: `${t('status') || 'Status'}: ${r.status || 'DRAFT'} • ${r.total_amount ? r.total_amount + ' EGP' : ''}`,
              category: t('quotation') || 'Quotation',
              icon: FileText,
              link: '/quotations',
              modalType: 'detail',
              tableName: 'quotations',
              recordTitle: t('quotation') || 'Quotation',
              schema: [
                { key: 'quotation_number', label: 'quotation_number', type: 'text' },
                { key: 'customer_id', label: 'customer', type: 'relation', relationTable: 'customers', relationLabel: 'customer_name' },
                { key: 'status', label: 'status', type: 'status' },
                { key: 'total_amount', label: 'total_amount', type: 'number', isCurrency: true },
                { key: 'discount_amount', label: 'discount_amount', type: 'number', isCurrency: true },
                { key: 'quote_date', label: 'quote_date', type: 'date' },
                { key: 'valid_until', label: 'valid_until', type: 'date' },
                { key: 'notes', label: 'notes', type: 'textarea' }
              ],
              rawRecord: r
            });
          });
        }

        // 5. Query Sales Orders (Only if permitted)
        if (canViewSales && db.sales_orders) {
          const orders = await db.sales_orders
            .filter(r => !r.deleted_at && (
              (r.order_number || '').toLowerCase().includes(q) ||
              (r.notes || '').toLowerCase().includes(q) ||
              String(r.id || '').toLowerCase().includes(q)
            ))
            .limit(4)
            .toArray();

          orders.forEach(r => {
            const code = r.order_number || String(r.id || '').slice(0, 8);
            matches.push({
              id: `sale-${r.id}`,
              title: `${t('sales_order') || 'Sales Order'} #${code}`,
              subtitle: `${t('payment') || 'Payment'}: ${r.payment_status || 'PENDING'} • ${r.total_amount ? r.total_amount + ' EGP' : ''}`,
              category: t('sales_order') || 'Sales Order',
              icon: ShoppingCart,
              link: '/sales',
              modalType: 'detail',
              tableName: 'sales_orders',
              recordTitle: t('sales_order') || 'Sales Order',
              schema: [
                { key: 'order_number', label: 'order_number', type: 'text' },
                { key: 'customer_id', label: 'customer', type: 'relation', relationTable: 'customers', relationLabel: 'customer_name' },
                { key: 'employee_id', label: 'sales_representative', type: 'relation', relationTable: 'employees', relationLabel: 'full_name' },
                { key: 'payment_status', label: 'payment_status', type: 'status' },
                { key: 'total_amount', label: 'total_amount', type: 'number', isCurrency: true },
                { key: 'amount_paid', label: 'amount_paid', type: 'number', isCurrency: true },
                { key: 'discount_amount', label: 'discount_amount', type: 'number', isCurrency: true },
                { key: 'order_date', label: 'order_date', type: 'date' },
                { key: 'delivery_date', label: 'delivery_date', type: 'date' },
                { key: 'notes', label: 'notes', type: 'textarea' }
              ],
              rawRecord: r
            });
          });
        }

        // 6. Query Work Orders (Only if permitted)
        if (canViewWorkOrders && db.work_orders) {
          const wos = await db.work_orders
            .filter(r => !r.deleted_at && (
              (r.order_number || '').toLowerCase().includes(q) ||
              (r.product_name || '').toLowerCase().includes(q) ||
              (r.item_name || '').toLowerCase().includes(q) ||
              (r.status || '').toLowerCase().includes(q) ||
              String(r.id || '').toLowerCase().includes(q)
            ))
            .limit(4)
            .toArray();

          wos.forEach(r => {
            const prod = r.product_name || r.item_name || '';
            const code = r.order_number || String(r.id || '').slice(0, 8);
            matches.push({
              id: `wo-${r.id}`,
              title: `${t('work_order') || 'Work Order'} #${code}${prod ? ` - ${prod}` : ''}`,
              subtitle: `${t('status') || 'Status'}: ${r.status || 'PENDING'} • ${t('quantity') || 'Qty'}: ${r.quantity || 0}`,
              category: t('work_order') || 'Work Order',
              icon: ClipboardCheck,
              link: '/work-orders',
              modalType: 'detail',
              tableName: 'work_orders',
              recordTitle: t('work_order') || 'Work Order',
              schema: [
                { key: 'order_number', label: 'order_number', type: 'text' },
                { key: 'product_name', label: 'product_name', type: 'text' },
                { key: 'status', label: 'status', type: 'status' },
                { key: 'quantity', label: 'quantity', type: 'number' },
                { key: 'sales_order_id', label: 'sales_order', type: 'relation', relationTable: 'sales_orders', relationLabel: 'order_number' },
                { key: 'employee_1', label: 'employee_1', type: 'relation', relationTable: 'employees', relationLabel: 'full_name' },
                { key: 'employee_2', label: 'employee_2', type: 'relation', relationTable: 'employees', relationLabel: 'full_name' },
                { key: 'employee_3', label: 'employee_3', type: 'relation', relationTable: 'employees', relationLabel: 'full_name' },
                { key: 'start_date', label: 'start_date', type: 'date' },
                { key: 'end_date', label: 'end_date', type: 'date' },
                { key: 'notes', label: 'notes', type: 'textarea' }
              ],
              rawRecord: r
            });
          });
        }

        // 7. Query Purchase Orders (Only if permitted)
        if (canViewPurchases && db.purchase_orders) {
          const pos = await db.purchase_orders
            .filter(r => !r.deleted_at && (
              (r.order_number || '').toLowerCase().includes(q) ||
              (r.notes || '').toLowerCase().includes(q) ||
              String(r.id || '').toLowerCase().includes(q)
            ))
            .limit(4)
            .toArray();

          pos.forEach(r => {
            const code = r.order_number || String(r.id || '').slice(0, 8);
            matches.push({
              id: `po-${r.id}`,
              title: `${t('purchase_order') || 'Purchase Order'} #${code}`,
              subtitle: `${t('status') || 'Status'}: ${r.payment_status || 'PENDING'} • ${r.total_amount ? r.total_amount + ' EGP' : ''}`,
              category: t('purchase_order') || 'Purchase Order',
              icon: ShoppingBag,
              link: '/purchases',
              modalType: 'detail',
              tableName: 'purchase_orders',
              recordTitle: t('purchase_order') || 'Purchase Order',
              schema: [
                { key: 'order_number', label: 'order_number', type: 'text' },
                { key: 'supplier_id', label: 'supplier', type: 'relation', relationTable: 'suppliers', relationLabel: 'supplier_name' },
                { key: 'payment_status', label: 'payment_status', type: 'status' },
                { key: 'total_amount', label: 'total_amount', type: 'number', isCurrency: true },
                { key: 'amount_paid', label: 'amount_paid', type: 'number', isCurrency: true },
                { key: 'order_date', label: 'order_date', type: 'date' },
                { key: 'notes', label: 'notes', type: 'textarea' }
              ],
              rawRecord: r
            });
          });
        }

        // 8. Query Employees (Only if permitted)
        if (canViewEmployees && db.employees) {
          const employees = await db.employees
            .filter(e => !e.deleted_at && (
              (e.full_name || '').toLowerCase().includes(q) ||
              (e.job_title || '').toLowerCase().includes(q) ||
              (e.department || '').toLowerCase().includes(q) ||
              (e.mobile_number || '').toLowerCase().includes(q) ||
              (e.role || '').toLowerCase().includes(q)
            ))
            .limit(4)
            .toArray();

          employees.forEach(e => {
            matches.push({
              id: `employee-${e.id}`,
              title: e.full_name,
              subtitle: [e.job_title || e.role, e.department, e.mobile_number].filter(Boolean).join(' • ') || (t('employee') || 'Employee'),
              category: t('employee') || 'Employee',
              icon: Users,
              link: '/employees',
              modalType: 'profile',
              entityType: 'employee',
              entityId: e.id,
              rawRecord: e
            });
          });
        }

        // 9. Query Suppliers (Only if permitted)
        if (canViewSuppliers && db.suppliers) {
          const suppliers = await db.suppliers
            .filter(s => !s.deleted_at && (
              (s.supplier_name || '').toLowerCase().includes(q) ||
              (s.contact_person || '').toLowerCase().includes(q) ||
              (s.mobile_number || '').toLowerCase().includes(q) ||
              (s.phone || '').toLowerCase().includes(q)
            ))
            .limit(4)
            .toArray();

          suppliers.forEach(s => {
            matches.push({
              id: `supplier-${s.id}`,
              title: s.supplier_name,
              subtitle: [s.contact_person, s.mobile_number || s.phone].filter(Boolean).join(' • ') || (t('supplier') || 'Supplier'),
              category: t('supplier') || 'Supplier',
              icon: Truck,
              link: '/suppliers',
              modalType: 'profile',
              entityType: 'supplier',
              entityId: s.id,
              rawRecord: s
            });
          });
        }

        // 10. Query Employee Loans (Only if permitted)
        if (canViewLoans && db.employee_loans) {
          const loans = await db.employee_loans
            .filter(r => !r.deleted_at && (
              (r.notes || '').toLowerCase().includes(q) ||
              (r.reason || '').toLowerCase().includes(q) ||
              (r.status || '').toLowerCase().includes(q) ||
              String(r.id || '').toLowerCase().includes(q)
            ))
            .limit(4)
            .toArray();

          loans.forEach(r => {
            const rem = r.remaining_amount ?? r.remaining_balance ?? 0;
            matches.push({
              id: `loan-${r.id}`,
              title: `${t('employee_loan') || 'Employee Loan'} #${String(r.id || '').slice(0, 8)}`,
              subtitle: `${t('amount') || 'Amount'}: ${r.loan_amount || 0} EGP • ${t('remaining') || 'Remaining'}: ${rem} EGP`,
              category: t('employee_loan') || 'Employee Loan',
              icon: HandCoins,
              link: '/loans',
              modalType: 'detail',
              tableName: 'employee_loans',
              recordTitle: t('employee_loan') || 'Employee Loan',
              schema: [
                { key: 'employee_id', label: 'employee', type: 'relation', relationTable: 'employees', relationLabel: 'full_name' },
                { key: 'loan_amount', label: 'loan_amount', type: 'number', isCurrency: true },
                { key: 'installment_amount', label: 'installment_amount', type: 'number', isCurrency: true },
                { key: 'remaining_amount', label: 'remaining_amount', type: 'number', isCurrency: true },
                { key: 'deduction_frequency', label: 'deduction_frequency', type: 'text' },
                { key: 'status', label: 'status', type: 'status' },
                { key: 'loan_date', label: 'loan_date', type: 'date' },
                { key: 'notes', label: 'notes', type: 'textarea' }
              ],
              rawRecord: r
            });
          });
        }

        // 11. Query Expenses (Only if permitted)
        if (canViewExpenses && db.expenses) {
          const expenses = await db.expenses
            .filter(r => !r.deleted_at && (
              (r.category || r.expense_type || '').toLowerCase().includes(q) ||
              (r.description || '').toLowerCase().includes(q) ||
              (r.notes || '').toLowerCase().includes(q) ||
              String(r.id || '').toLowerCase().includes(q)
            ))
            .limit(4)
            .toArray();

          expenses.forEach(r => {
            const catLabel = r.category || r.expense_type || '';
            matches.push({
              id: `expense-${r.id}`,
              title: r.notes || r.description || catLabel || `${t('expenses') || 'Expense'} #${String(r.id || '').slice(0, 8)}`,
              subtitle: `${catLabel} • ${r.amount || 0} EGP`,
              category: t('expenses') || 'Expense',
              icon: Receipt,
              link: '/expenses',
              modalType: 'detail',
              tableName: 'expenses',
              recordTitle: t('expenses') || 'Expense',
              schema: [
                { key: 'category', label: 'category', type: 'select', options: ['ELECTRICITY', 'WATER', 'FOOD_BUFFET', 'MAINTENANCE', 'SPARE_PARTS', 'RENT', 'SALARIES', 'PAYROLL', 'RAW_MATERIALS', 'SHIPPING', 'PERSONAL', 'OTHER'] },
                { key: 'amount', label: 'amount', type: 'number', isCurrency: true },
                { key: 'expense_date', label: 'expense_date', type: 'date' },
                { key: 'notes', label: 'notes', type: 'textarea' }
              ],
              rawRecord: r
            });
          });
        }

        // 12. Query Shipping Orders (Only if permitted)
        if (canViewShipping && db.shipping_orders) {
          const shipments = await db.shipping_orders
            .filter(r => !r.deleted_at && (
              (r.shipping_company || '').toLowerCase().includes(q) ||
              (r.driver_name || '').toLowerCase().includes(q) ||
              (r.bill_of_lading_number || r.vehicle_number || '').toLowerCase().includes(q) ||
              (r.delivery_address || r.destination_address || '').toLowerCase().includes(q) ||
              String(r.id || '').toLowerCase().includes(q)
            ))
            .limit(4)
            .toArray();

          shipments.forEach(r => {
            const bol = r.bill_of_lading_number || r.vehicle_number || '';
            const statusVal = r.shipping_status || r.delivery_status || 'PENDING';
            matches.push({
              id: `shipping-${r.id}`,
              title: `${r.driver_name || r.shipping_company || (t('shipping') || 'Shipment')} ${bol ? `#${bol}` : ''}`,
              subtitle: `${t('status') || 'Status'}: ${statusVal} • ${r.shipping_cost || 0} EGP`,
              category: t('shipping') || 'Shipping',
              icon: MapPin,
              link: '/shipping',
              modalType: 'detail',
              tableName: 'shipping_orders',
              recordTitle: t('shipping') || 'Shipping Order',
              schema: [
                { key: 'sales_order_id', label: 'sales_orders', type: 'relation', relationTable: 'sales_orders', relationLabel: 'id' },
                { key: 'driver_name', label: 'driver_name', type: 'text' },
                { key: 'bill_of_lading_number', label: 'bill_of_lading_number', type: 'text' },
                { key: 'shipping_date', label: 'shipping_date', type: 'date' },
                { key: 'shipping_status', label: 'shipping_status', type: 'select', options: ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'] },
                { key: 'shipping_cost', label: 'shipping_cost', type: 'number', isCurrency: true },
                { key: 'delivery_address', label: 'delivery_address', type: 'textarea' }
              ],
              rawRecord: r
            });
          });
        }

        if (isSubscribed) {
          setResults(matches);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    performSearch();

    return () => {
      isSubscribed = false;
    };
  }, [query, isOpen]);

  // Open Info Card Modal for record
  const openCardModal = async (item, startInEditMode = false) => {
    if (!item || !item.modalType) return;
    if (item.modalType === 'profile') {
      setCardModalData({
        type: 'profile',
        entityType: item.entityType,
        entityId: item.entityId,
        initialEditMode: startInEditMode
      });
      return;
    }
    if (item.modalType === 'detail') {
      let items = [];
      let relationsData = {};
      try {
        if (item.tableName === 'sales_orders') {
          const [lineItems, customers, employees] = await Promise.all([
            db.sales_items ? db.sales_items.where('sales_order_id').equals(item.rawRecord.id).filter(x => !x.deleted_at).toArray() : [],
            db.customers ? db.customers.toArray() : [],
            db.employees ? db.employees.toArray() : []
          ]);
          items = lineItems;
          relationsData = { customers, customer_id: customers, employees, employee_id: employees };
        } else if (item.tableName === 'purchase_orders') {
          const [lineItems, suppliers, rawMaterials] = await Promise.all([
            db.purchase_items ? db.purchase_items.where('purchase_order_id').equals(item.rawRecord.id).filter(x => !x.deleted_at).toArray() : [],
            db.suppliers ? db.suppliers.toArray() : [],
            db.raw_materials ? db.raw_materials.toArray() : []
          ]);
          const matMap = new Map(rawMaterials.map(m => [m.id, m.material_name]));
          items = lineItems.map(li => ({
            ...li,
            material_name: li.material_name || matMap.get(li.raw_material_id) || li.item_name
          }));
          relationsData = { suppliers, supplier_id: suppliers };
        } else if (item.tableName === 'quotations') {
          const [lineItems, customers] = await Promise.all([
            db.quotation_items ? db.quotation_items.where('quotation_id').equals(item.rawRecord.id).filter(x => !x.deleted_at).toArray() : [],
            db.customers ? db.customers.toArray() : []
          ]);
          items = lineItems;
          relationsData = { customers, customer_id: customers };
        } else if (item.tableName === 'raw_materials') {
          const suppliers = db.suppliers ? await db.suppliers.toArray() : [];
          relationsData = { suppliers, supplier_id: suppliers };
        } else if (item.tableName === 'employee_loans') {
          const employees = db.employees ? await db.employees.toArray() : [];
          relationsData = { employees, employee_id: employees };
        } else if (item.tableName === 'work_orders') {
          const [salesOrders, employees] = await Promise.all([
            db.sales_orders ? db.sales_orders.toArray() : [],
            db.employees ? db.employees.toArray() : []
          ]);
          relationsData = {
            sales_orders: salesOrders,
            sales_order_id: salesOrders,
            employees,
            employee_1: employees,
            employee_2: employees,
            employee_3: employees
          };
        } else if (item.tableName === 'shipping_orders') {
          const salesOrders = db.sales_orders ? await db.sales_orders.toArray() : [];
          relationsData = { sales_orders: salesOrders, sales_order_id: salesOrders };
        }
      } catch (err) {
        console.warn('Error loading detail records for modal:', err);
      }
      setCardModalData({
        type: 'detail',
        tableName: item.tableName,
        title: item.recordTitle,
        schema: item.schema,
        record: item.rawRecord,
        relationsData,
        items,
        link: item.link,
        initialEditMode: startInEditMode
      });
    }
  };

  // Keyboard navigation inside modal (Up, Down, Left, Right, Enter, Esc)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (cardModalData) {
        setCardModalData(null);
      } else {
        onClose();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const isInput = e.target === inputRef.current;
      const atBoundary = !isInput || query === '' || 
        (isRTL ? inputRef.current.selectionStart === 0 : inputRef.current.selectionStart === inputRef.current.value.length);
      
      const shouldTrigger = (isRTL && e.key === 'ArrowLeft') || (!isRTL && e.key === 'ArrowRight') || !isInput;
      
      if (shouldTrigger && atBoundary) {
        const current = results[selectedIndex];
        if (current && current.modalType) {
          e.preventDefault();
          openCardModal(current);
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = results[selectedIndex];
      if (current) {
        if (current.modalType) {
          openCardModal(current);
        } else {
          handleSelect(current);
        }
      }
    }
  };

  const handleSelect = (item) => {
    if (item.modalType) {
      openCardModal(item, false);
    } else {
      onClose();
      router.push(item.link);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current && listRef.current.children[selectedIndex]) {
      listRef.current.children[selectedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9990,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: cardModalData ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onKeyDown={handleKeyDown}
      >
        <div 
          style={{
            width: 'min(92vw, 640px)',
            maxWidth: 'min(92vw, 640px)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(78vh, 580px)',
            animation: 'dialog-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both'
          }}
        >
          {/* Search Input Bar */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              gap: '0.75rem',
              background: 'var(--surface)'
            }}
          >
            <Search size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input 
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('search_global_placeholder') || 'Type to search customers, inventory, employees, pages...'}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '1rem',
                color: 'var(--text-main)',
                fontFamily: 'inherit'
              }}
            />
            {query && (
              <button 
                type="button" 
                onClick={() => setQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} />
              </button>
            )}
            <span 
              style={{
                padding: '0.2rem 0.55rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--primary)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap'
              }}
            >
              <Shield size={12} /> {user?.role || 'User'}
            </span>
            <kbd 
              style={{
                padding: '0.2rem 0.45rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                color: 'var(--text-muted)',
                fontFamily: 'monospace'
              }}
            >
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div 
            ref={listRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.5rem',
              maxHeight: '420px'
            }}
          >
            {query === '' && (
              <div style={{ padding: '0.5rem 0.75rem 0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: i18n.language === 'ar' ? 'none' : 'uppercase', letterSpacing: i18n.language === 'ar' ? 'normal' : '0.5px' }}>
                {t('quick_pages') || 'Quick Navigation'}
              </div>
            )}

            {results.length > 0 ? (
              results.map((item, index) => {
                const isSelected = index === selectedIndex;
                const IconComponent = item.icon || ArrowRight;
                const hasCard = !!item.modalType;

                return (
                  <div 
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--surface-hover)' : 'transparent',
                      border: isSelected ? '1px solid var(--border)' : '1px solid transparent',
                      transition: 'background 0.1s ease',
                      marginBottom: '2px',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0, flex: 1 }}>
                      <div 
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: isSelected ? 'var(--primary)' : 'var(--surface-hover)',
                          color: isSelected ? 'var(--primary-foreground)' : 'var(--text-main)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <IconComponent size={18} />
                      </div>
                      <div style={{ overflow: 'hidden', minWidth: 0 }}>
                        <div style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                      {hasCard && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCardModal(item, true);
                            }}
                            title={isRTL ? 'تعديل السجل مباشرة في النافذة' : 'Edit record directly in modal'}
                            style={{
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              background: 'rgba(16, 185, 129, 0.08)',
                              color: '#059669',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Edit3 size={12} />
                            <span>{isRTL ? 'تعديل' : 'Edit'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCardModal(item, false);
                            }}
                            title={isRTL ? 'عرض بطاقة المعلومات (سهم يسار)' : 'View Info Card (Right Arrow)'}
                            style={{
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                              background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--surface)',
                              color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Eye size={12} />
                            <span>{isRTL ? 'بطاقة' : 'Card'}</span>
                            <kbd style={{
                              fontSize: '0.65rem',
                              padding: '0.05rem 0.3rem',
                              borderRadius: '3px',
                              background: 'var(--surface-hover)',
                              border: '1px solid var(--border)',
                              opacity: 0.85
                            }}>
                              {isRTL ? '←' : '→'}
                            </kbd>
                          </button>
                        </>
                      )}
                      <span 
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: 'var(--surface-hover)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        {item.category}
                      </span>
                      {isSelected && (
                        <CornerDownLeft size={16} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {isLoading ? (
                  <div>{t('searching') || 'Searching...'}</div>
                ) : (
                  <>
                    <Search size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                    <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{t('no_results_for') || 'No results found for'} &ldquo;{query}&rdquo;</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{t('try_different_search') || 'Try searching with a customer name, material, or keyword'}</div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer shortcuts */}
          <div 
            style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span><kbd style={{ padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'var(--surface)', border: '1px solid var(--border)' }}>↑</kbd> <kbd style={{ padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'var(--surface)', border: '1px solid var(--border)' }}>↓</kbd> {t('navigate') || 'Navigate'}</span>
              <span><kbd style={{ padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'var(--surface)', border: '1px solid var(--border)' }}>{isRTL ? '←' : '→'}</kbd> {isRTL ? 'بطاقة المعلومات' : 'Info Card'}</span>
              <span><kbd style={{ padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'var(--surface)', border: '1px solid var(--border)' }}>↵</kbd> {t('select_item') || 'Open'}</span>
              <span><kbd style={{ padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'var(--surface)', border: '1px solid var(--border)' }}>esc</kbd> {t('close') || 'Close'}</span>
            </div>
            <div>{t('system_name') || 'Jin Engine'}</div>
          </div>
        </div>
      </div>

      {/* Info Card Modals */}
      {cardModalData?.type === 'profile' && (
        <EntityProfileModal
          entityType={cardModalData.entityType}
          entityId={cardModalData.entityId}
          initialEditMode={cardModalData.initialEditMode || false}
          onClose={() => {
            setCardModalData(null);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        />
      )}
      {cardModalData?.type === 'detail' && (
        <RecordDetailModal
          tableName={cardModalData.tableName}
          title={cardModalData.title}
          schema={cardModalData.schema}
          record={cardModalData.record}
          relationsData={cardModalData.relationsData}
          items={cardModalData.items}
          itemsTitle={isRTL ? 'بنود المعاملة' : 'Transaction Line Items'}
          initialEditMode={cardModalData.initialEditMode || false}
          onClose={() => {
            setCardModalData(null);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          onEdit={(rec) => {
            setCardModalData(null);
            onClose();
            if (cardModalData.link) router.push(cardModalData.link);
          }}
          onOpenProfile={(target) => {
            setCardModalData({
              type: 'profile',
              entityType: target.type,
              entityId: target.id
            });
          }}
        />
      )}
    </>
  );
}
