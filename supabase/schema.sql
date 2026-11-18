-- ============================================================================
-- Jin Engine ERP — Supabase PostgreSQL Schema (Converted from MySQL init_db.php)
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- Helper trigger function for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  department TEXT,
  job_title TEXT,
  mobile_number TEXT,
  salary_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  salary_type TEXT NOT NULL DEFAULT 'MONTHLY',
  shift_start_time TEXT DEFAULT '08:00:00',
  shift_end_time TEXT DEFAULT '17:00:00',
  is_active BOOLEAN DEFAULT TRUE,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 2. Employee Production
CREATE TABLE IF NOT EXISTS public.employee_production (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  work_order_id TEXT,
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_type TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  rate_per_piece NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 3. Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TEXT,
  check_out_time TEXT,
  status TEXT NOT NULL DEFAULT 'PRESENT',
  notes TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 4. Raw Materials (Inventory)
CREATE TABLE IF NOT EXISTS public.raw_materials (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '',
  material_name TEXT NOT NULL,
  supplier_id TEXT,
  size TEXT,
  thickness_gsm TEXT,
  color_print TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  sales_unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  consumption_per_unit NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  min_stock_alert NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  stock_movements TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 5. Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  company_name TEXT,
  mobile_number TEXT,
  address TEXT,
  account_balance NUMERIC(12, 2) DEFAULT 0.00,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 6. Sales Orders
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  employee_id TEXT,
  quotation_id TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  notes TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 7. Sales Items
CREATE TABLE IF NOT EXISTS public.sales_items (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT NOT NULL,
  raw_material_id TEXT,
  product_name TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  image_data TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 8. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by TEXT,
  linked_type TEXT,
  linked_id TEXT,
  payroll_id TEXT,
  shipping_order_id TEXT,
  withdrawal_id TEXT,
  purchase_order_id TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 9. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  contact_person TEXT,
  mobile_number TEXT,
  address TEXT,
  account_balance NUMERIC(12, 2) DEFAULT 0.00,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 10. Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL,
  employee_id TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  notes TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 11. Purchase Items
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL,
  raw_material_id TEXT,
  product_name TEXT,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  image_data TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 12. Users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT,
  password_hash TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'ACCOUNTANT',
  pin_code TEXT,
  permissions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 13. Quotations
CREATE TABLE IF NOT EXISTS public.quotations (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  employee_id TEXT,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 14. Quotation Items
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  raw_material_id TEXT,
  product_name TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  image_data TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 15. Work Orders
CREATE TABLE IF NOT EXISTS public.work_orders (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT,
  product_name TEXT,
  item_name TEXT,
  quantity NUMERIC(12, 2) DEFAULT 1.00,
  employee_1 TEXT,
  employee_2 TEXT,
  employee_3 TEXT,
  employee_4 TEXT,
  employee_5 TEXT,
  employee_6 TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  bom_deducted BOOLEAN DEFAULT FALSE,
  bom_units_produced NUMERIC(12, 2) DEFAULT 0.00,
  bom_movements TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 16. Payroll
CREATE TABLE IF NOT EXISTS public.payroll (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  production_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  loan_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  payment_status TEXT DEFAULT 'UNPAID',
  payment_date DATE,
  notes TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 17. Employee Loans
CREATE TABLE IF NOT EXISTS public.employee_loans (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  loan_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  deduction_frequency TEXT NOT NULL DEFAULT 'MONTHLY',
  installment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  remaining_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 18. Shipping Orders
CREATE TABLE IF NOT EXISTS public.shipping_orders (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT,
  driver_name TEXT NOT NULL DEFAULT '',
  vehicle_number TEXT,
  bill_of_lading_number TEXT,
  shipping_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shipping_status TEXT NOT NULL DEFAULT 'PENDING',
  delivery_address TEXT,
  shipping_cost NUMERIC(12, 2) DEFAULT 0.00,
  notes TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 19. Owner Withdrawals
CREATE TABLE IF NOT EXISTS public.owner_withdrawals (
  id TEXT PRIMARY KEY,
  owner_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  withdrawal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'PERSONAL',
  notes TEXT,
  sync_status TEXT DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 20. Stock Movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  material_id TEXT NOT NULL DEFAULT '',
  raw_material_id TEXT,
  material_name TEXT,
  unit TEXT,
  movement_type TEXT NOT NULL DEFAULT 'IN',
  source TEXT,
  direction INTEGER NOT NULL DEFAULT 1,
  quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  stock_before NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  stock_after NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  reference_type TEXT,
  reference_id TEXT,
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 21. Payment Vouchers
CREATE TABLE IF NOT EXISTS public.payment_vouchers (
  id TEXT PRIMARY KEY,
  voucher_number TEXT NOT NULL,
  voucher_type TEXT NOT NULL,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entity_type TEXT NOT NULL DEFAULT 'customer',
  entity_id TEXT,
  entity_name TEXT,
  reference_type TEXT,
  reference_id TEXT,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'CASH',
  notes TEXT,
  recorded_by TEXT,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable Row Level Security (RLS) and allow app access via anon/authenticated roles
-- (Tighten these policies in production if using strict per-user Supabase Auth)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'employees', 'employee_production', 'attendance', 'raw_materials',
    'customers', 'sales_orders', 'sales_items', 'expenses',
    'suppliers', 'purchase_orders', 'purchase_items', 'users',
    'quotations', 'quotation_items', 'work_orders', 'payroll',
    'employee_loans', 'shipping_orders', 'owner_withdrawals',
    'stock_movements', 'payment_vouchers'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all ERP access" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Allow all ERP access" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', tbl, tbl);
  END LOOP;
END $$;

-- Seed default Admin user (username: admin, role: ADMIN)
INSERT INTO public.users (id, username, full_name, password_hash, role, is_active, sync_status)
VALUES (
  'usr-001-admin',
  'admin',
  'مدير النظام (Admin)',
  '',
  'ADMIN',
  TRUE,
  'SYNCED'
)
ON CONFLICT (id) DO NOTHING;
