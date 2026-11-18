import {
  FileText, ShoppingCart, ClipboardCheck, ShoppingBag, MapPin, Receipt,
  Briefcase, Truck, Users, Banknote, Package, Clock, Box, Wallet, HandCoins
} from 'lucide-react';

/**
 * Single source of truth for every data page in the system.
 * Used by the Dashboard (per-page metric cards) and the Reports page (full report per page).
 *
 * columns: { key, labelKey, type?: 'currency' | 'date' | 'status', rel?: 'customers' | 'suppliers' | 'employees' }
 */
export const SYSTEM_MODULES = [
  {
    table: 'quotations', path: '/quotations', labelKey: 'quotations', icon: FileText,
    columns: [
      { key: 'quote_date', labelKey: 'quote_date', type: 'date' },
      { key: 'customer_id', labelKey: 'customer', rel: 'customers' },
      { key: 'employee_id', labelKey: 'employee', rel: 'employees' },
      { key: 'status', labelKey: 'status', type: 'status' },
      { key: 'total_amount', labelKey: 'total_amount', type: 'currency' },
    ],
  },
  {
    table: 'sales_orders', path: '/sales', labelKey: 'sales_orders', icon: ShoppingCart,
    columns: [
      { key: 'order_date', labelKey: 'order_date', type: 'date' },
      { key: 'customer_id', labelKey: 'customer', rel: 'customers' },
      { key: 'payment_status', labelKey: 'payment_status', type: 'status' },
      { key: 'total_amount', labelKey: 'total_amount', type: 'currency' },
      { key: 'amount_paid', labelKey: 'amount_paid', type: 'currency' },
      { key: '__remaining', labelKey: 'remaining_amount', type: 'currency' },
    ],
  },
  {
    table: 'work_orders', path: '/work-orders', labelKey: 'work_orders', icon: ClipboardCheck,
    columns: [
      { key: 'start_date', labelKey: 'start_date', type: 'date' },
      { key: 'end_date', labelKey: 'end_date', type: 'date' },
      { key: 'employee_1', labelKey: 'employee_1', rel: 'employees' },
      { key: 'status', labelKey: 'status', type: 'status' },
    ],
  },
  {
    table: 'purchase_orders', path: '/purchases', labelKey: 'purchase_orders', icon: ShoppingBag,
    columns: [
      { key: 'order_date', labelKey: 'order_date', type: 'date' },
      { key: 'supplier_id', labelKey: 'supplier', rel: 'suppliers' },
      { key: 'payment_status', labelKey: 'payment_status', type: 'status' },
      { key: 'total_amount', labelKey: 'total_amount', type: 'currency' },
      { key: 'amount_paid', labelKey: 'amount_paid', type: 'currency' },
      { key: '__remaining', labelKey: 'remaining_amount', type: 'currency' },
    ],
  },
  {
    table: 'shipping_orders', path: '/shipping', labelKey: 'shipping', icon: MapPin,
    columns: [
      { key: 'shipping_date', labelKey: 'shipping_date', type: 'date' },
      { key: 'driver_name', labelKey: 'driver_name' },
      { key: 'bill_of_lading_number', labelKey: 'bill_of_lading_number' },
      { key: 'shipping_status', labelKey: 'shipping_status', type: 'status' },
      { key: 'shipping_cost', labelKey: 'shipping_cost', type: 'currency' },
    ],
  },
  {
    table: 'expenses', path: '/expenses', labelKey: 'expenses', icon: Receipt,
    columns: [
      { key: 'expense_date', labelKey: 'expense_date', type: 'date' },
      { key: 'category', labelKey: 'category', type: 'status' },
      { key: 'notes', labelKey: 'notes' },
      { key: 'amount', labelKey: 'amount', type: 'currency' },
    ],
  },
  {
    table: 'owner_withdrawals', path: '/owner-withdrawals', labelKey: 'owner_withdrawals', icon: Wallet,
    columns: [
      { key: 'withdrawal_date', labelKey: 'withdrawal_date', type: 'date' },
      { key: 'owner_name', labelKey: 'owner_name' },
      { key: 'category', labelKey: 'category', type: 'status' },
      { key: 'notes', labelKey: 'notes' },
      { key: 'amount', labelKey: 'amount', type: 'currency' },
    ],
  },
  {
    table: 'customers', path: '/customers', labelKey: 'customers', icon: Briefcase,
    columns: [
      { key: 'customer_name', labelKey: 'customer_name' },
      { key: 'company_name', labelKey: 'company_name' },
      { key: 'phone', labelKey: 'mobile' },
      { key: 'account_balance', labelKey: 'account_balance', type: 'currency' },
    ],
  },
  {
    table: 'suppliers', path: '/suppliers', labelKey: 'suppliers', icon: Truck,
    columns: [
      { key: 'supplier_name', labelKey: 'supplier_name' },
      { key: 'contact_person', labelKey: 'contact_person' },
      { key: 'phone', labelKey: 'mobile' },
      { key: 'account_balance', labelKey: 'account_balance', type: 'currency' },
    ],
  },
  {
    table: 'employees', path: '/employees', labelKey: 'employees', icon: Users,
    columns: [
      { key: 'full_name', labelKey: 'full_name' },
      { key: 'mobile_number', labelKey: 'mobile' },
      { key: 'salary_type', labelKey: 'salary_type', type: 'status' },
      { key: 'salary_amount', labelKey: 'salary', type: 'currency' },
    ],
  },
  {
    table: 'payroll', path: '/payroll', labelKey: 'payroll', icon: Banknote,
    columns: [
      { key: 'employee_id', labelKey: 'employee', rel: 'employees' },
      { key: 'period_start', labelKey: 'period_start', type: 'date' },
      { key: 'period_end', labelKey: 'period_end', type: 'date' },
      { key: 'loan_deductions', labelKey: 'loan_deductions', type: 'currency' },
      { key: 'status', labelKey: 'status', type: 'status' },
      { key: 'net_pay', labelKey: 'net_pay', type: 'currency' },
    ],
  },
  {
    table: 'employee_loans', path: '/loans', labelKey: 'employee_loans', icon: HandCoins,
    columns: [
      { key: 'employee_id', labelKey: 'employee', rel: 'employees' },
      { key: 'loan_date', labelKey: 'loan_date', type: 'date' },
      { key: 'loan_amount', labelKey: 'loan_amount', type: 'currency' },
      { key: 'deduction_frequency', labelKey: 'deduction_frequency', type: 'status' },
      { key: 'installment_amount', labelKey: 'installment_amount', type: 'currency' },
      { key: 'total_paid', labelKey: 'total_paid', type: 'currency' },
      { key: 'remaining_amount', labelKey: 'remaining_amount', type: 'currency' },
      { key: 'status', labelKey: 'status', type: 'status' },
    ],
  },
  {
    table: 'employee_production', path: '/production', labelKey: 'production', icon: Package,
    columns: [
      { key: 'production_date', labelKey: 'production_date', type: 'date' },
      { key: 'employee_id', labelKey: 'employee', rel: 'employees' },
      { key: 'product_type', labelKey: 'product_type' },
      { key: 'quantity', labelKey: 'quantity' },
      { key: 'total_amount', labelKey: 'total_amount', type: 'currency' },
    ],
  },
  {
    table: 'attendance', path: '/attendance', labelKey: 'attendance', icon: Clock,
    columns: [
      { key: 'work_date', labelKey: 'work_date', type: 'date' },
      { key: 'employee_id', labelKey: 'employee', rel: 'employees' },
      { key: 'check_in_time', labelKey: 'check_in' },
      { key: 'check_out_time', labelKey: 'check_out' },
      { key: 'status', labelKey: 'status', type: 'status' },
    ],
  },
  {
    table: 'raw_materials', path: '/inventory', labelKey: 'inventory', icon: Box,
    columns: [
      { key: 'material_name', labelKey: 'material_name' },
      { key: 'category', labelKey: 'category' },
      { key: 'supplier_id', labelKey: 'supplier', rel: 'suppliers' },
      { key: 'unit', labelKey: 'unit' },
      { key: 'stock_quantity', labelKey: 'stock_quantity' },
      { key: 'min_stock_alert', labelKey: 'min_stock_alert' },
    ],
  },
];
