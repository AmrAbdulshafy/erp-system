-- ============================================================================
-- Jin Engine ERP — Seed Data for Supabase PostgreSQL
-- Run AFTER supabase/schema.sql in Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- 1. Users (admin / Demo Admin)
INSERT INTO public.users (id, username, full_name, password_hash, role, pin_code, is_active, sync_status)
VALUES
  ('usr-001-admin', 'admin', 'مدير النظام (Admin)', '', 'ADMIN', '1234', TRUE, 'SYNCED'),
  ('usr-002-acc', 'accountant', 'أحمد محمود (المحاسب)', '', 'ACCOUNTANT', '2222', TRUE, 'SYNCED'),
  ('usr-003-sup', 'supervisor', 'كريم حسن (مشرف الإنتاج)', '', 'SUPERVISOR', '3333', TRUE, 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 2. Employees
INSERT INTO public.employees (id, full_name, department, job_title, mobile_number, salary_amount, salary_type, is_active, sync_status)
VALUES
  ('emp-001', 'أحمد محمود علي', 'Accounting', 'محاسب عام', '01012345678', 8500.00, 'MONTHLY', TRUE, 'SYNCED'),
  ('emp-002', 'كريم حسن إبراهيم', 'Production', 'مشرف خط الإنتاج', '01098765432', 7200.00, 'MONTHLY', TRUE, 'SYNCED'),
  ('emp-003', 'محمود سعيد فتحي', 'Production', 'فني تشغيل ماكينات', '01122334455', 5500.00, 'MONTHLY', TRUE, 'SYNCED'),
  ('emp-004', 'مصطفى عادل نبيل', 'Shipping', 'سائق نقل وتوصيل', '01234567890', 5000.00, 'MONTHLY', TRUE, 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 3. Suppliers
INSERT INTO public.suppliers (id, supplier_name, contact_person, mobile_number, address, account_balance, sync_status)
VALUES
  ('sup-001', 'شركة النيل للورق والكرتون', 'م. طارق الشريف', '01055667788', 'العاشر من رمضان - المنطقة الصناعية B1', 0.00, 'SYNCED'),
  ('sup-002', 'مصنع الدلتا للأحبار والكيماويات', 'أ. سامح رشدي', '01144556677', 'مدينة السادات - المنطقة الرابعة', 0.00, 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 4. Customers
INSERT INTO public.customers (id, customer_name, company_name, mobile_number, address, account_balance, sync_status)
VALUES
  ('cust-001', 'شركة الصفوة للصناعات الغذائية', 'الصفوة فودز', '01011223344', 'مدينة العبور - المنطقة الصناعية الأولى', 0.00, 'SYNCED'),
  ('cust-002', 'مجموعة الأمل للتجارة والتوزيع', 'الأمل جروب', '01277889900', 'القاهرة الجديدة - التجمع الخامس', 0.00, 'SYNCED'),
  ('cust-003', 'مصنع رويال للمنتجات الورقية', 'رويال باك', '01555443322', '6 أكتوبر - المنطقة الصناعية الثالثة', 0.00, 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 5. Raw Materials & Products (Inventory)
INSERT INTO public.raw_materials (id, category, material_name, supplier_id, size, thickness_gsm, color_print, unit, unit_price, sales_unit_price, consumption_per_unit, stock_quantity, min_stock_alert, sync_status)
VALUES
  ('mat-001', 'RAW_MATERIAL', 'رول ورق كرافت بني 150 جم', 'sup-001', '120 cm', '150 gsm', 'Brown Kraft', 'kg', 28.50, 35.00, 0.4500, 2500.00, 500.00, 'SYNCED'),
  ('mat-002', 'RAW_MATERIAL', 'رول ورق تست لاينر أبيض 175 جم', 'sup-001', '120 cm', '175 gsm', 'White', 'kg', 32.00, 40.00, 0.5000, 1800.00, 400.00, 'SYNCED'),
  ('mat-003', 'RAW_MATERIAL', 'غراء نشا صناعي للتعريج', 'sup-002', '25 kg', '-', 'Clear', 'kg', 45.00, 55.00, 0.0500, 400.00, 100.00, 'SYNCED'),
  ('mat-004', 'FINISHED_GOOD', 'كرتونة شحن 5 طبقات 40×30×25 سم', 'sup-001', '40×30×25 cm', '5-Ply', '2 Colors Print', 'pcs', 14.00, 22.00, 1.0000, 3200.00, 500.00, 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 6. Quotations & Items
INSERT INTO public.quotations (id, customer_id, employee_id, quote_date, subtotal, discount_amount, discount_percent, total_amount, status, notes, sync_status)
VALUES
  ('qt-001', 'cust-001', 'emp-001', CURRENT_DATE - INTERVAL '5 days', 22000.00, 0.00, 0.00, 22000.00, 'APPROVED', 'عرض سعر مبدئي لتوريد كراتين تعبئة', 'SYNCED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quotation_items (id, quotation_id, raw_material_id, product_name, quantity, unit_price, total_price, sync_status)
VALUES
  ('qti-001', 'qt-001', 'mat-004', 'كرتونة شحن 5 طبقات 40×30×25 سم', 1000.00, 22.00, 22000.00, 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 7. Sales Orders & Items
INSERT INTO public.sales_orders (id, customer_id, employee_id, quotation_id, order_date, subtotal, discount_amount, discount_percent, total_amount, amount_paid, remaining_amount, payment_status, notes, sync_status)
VALUES
  ('so-001', 'cust-001', 'emp-001', 'qt-001', CURRENT_DATE - INTERVAL '3 days', 22000.00, 0.00, 0.00, 22000.00, 15000.00, 7000.00, 'PARTIAL', 'طلب توريد دفعة أولى - الصفوة فودز', 'SYNCED'),
  ('so-002', 'cust-002', 'emp-001', NULL, CURRENT_DATE - INTERVAL '1 day', 11000.00, 0.00, 0.00, 11000.00, 11000.00, 0.00, 'PAID', 'تسليم فوري من المخزن', 'SYNCED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sales_items (id, sales_order_id, raw_material_id, product_name, quantity, unit_price, total_price, sync_status)
VALUES
  ('soi-001', 'so-001', 'mat-004', 'كرتونة شحن 5 طبقات 40×30×25 سم', 1000.00, 22.00, 22000.00, 'SYNCED'),
  ('soi-002', 'so-002', 'mat-004', 'كرتونة شحن 5 طبقات 40×30×25 سم', 500.00, 22.00, 11000.00, 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 8. Purchase Orders & Items
INSERT INTO public.purchase_orders (id, supplier_id, employee_id, order_date, subtotal, discount_amount, discount_percent, total_amount, amount_paid, remaining_amount, payment_status, notes, sync_status)
VALUES
  ('po-001', 'sup-001', 'emp-001', CURRENT_DATE - INTERVAL '7 days', 28500.00, 0.00, 0.00, 28500.00, 28500.00, 0.00, 'PAID', 'توريد 1 طن ورق كرافت بني', 'SYNCED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.purchase_items (id, purchase_order_id, raw_material_id, product_name, quantity, unit_price, total_price, sync_status)
VALUES
  ('poi-001', 'po-001', 'mat-001', 'رول ورق كرافت بني 150 جم', 1000.00, 28.50, 28500.00, 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 9. Work Orders
INSERT INTO public.work_orders (id, sales_order_id, product_name, item_name, quantity, employee_1, employee_2, status, start_date, notes, bom_deducted, sync_status)
VALUES
  ('wo-001', 'so-001', 'كرتونة شحن 5 طبقات 40×30×25 سم', 'كرتونة شحن 5 طبقات', 1000.00, 'emp-002', 'emp-003', 'IN_PROGRESS', CURRENT_DATE - INTERVAL '2 days', 'أمر تشغيل خط الكرتون الرئيسي', FALSE, 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 10. Shipping Orders
INSERT INTO public.shipping_orders (id, sales_order_id, driver_name, vehicle_number, bill_of_lading_number, shipping_date, shipping_status, delivery_address, shipping_cost, notes, sync_status)
VALUES
  ('shp-001', 'so-002', 'مصطفى عادل نبيل', 'ق ص ر 4821', 'BOL-2026-001', CURRENT_DATE - INTERVAL '1 day', 'DELIVERED', 'القاهرة الجديدة - التجمع الخامس', 450.00, 'تم التسليم والتوقيع', 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 11. Expenses
INSERT INTO public.expenses (id, category, amount, expense_date, notes, recorded_by, sync_status)
VALUES
  ('exp-001', 'UTILITIES', 2400.00, CURRENT_DATE - INTERVAL '4 days', 'فاتورة كهرباء المصنع الشهرية', 'emp-001', 'SYNCED'),
  ('exp-002', 'SHIPPING', 450.00, CURRENT_DATE - INTERVAL '1 day', 'مصاريف شحن فاتورة #SO-002', 'emp-001', 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 12. Payment Vouchers
INSERT INTO public.payment_vouchers (id, voucher_number, voucher_type, voucher_date, entity_type, entity_id, entity_name, reference_type, reference_id, amount, payment_method, notes, recorded_by, sync_status)
VALUES
  ('vch-001', 'RV-0001', 'RECEIPT', CURRENT_DATE - INTERVAL '3 days', 'customer', 'cust-001', 'شركة الصفوة للصناعات الغذائية', 'sales_order', 'so-001', 15000.00, 'BANK_TRANSFER', 'دفعة مقدمة على طلب #SO-001', 'admin', 'SYNCED'),
  ('vch-002', 'PV-0001', 'PAYMENT', CURRENT_DATE - INTERVAL '7 days', 'supplier', 'sup-001', 'شركة النيل للورق والكرتون', 'purchase_order', 'po-001', 28500.00, 'CASH', 'سداد فاتورة شراء ورق كرافت #PO-001', 'admin', 'SYNCED')
ON CONFLICT (id) DO NOTHING;

-- 13. Stock Movements
INSERT INTO public.stock_movements (id, material_id, raw_material_id, material_name, unit, movement_type, source, direction, quantity, stock_before, stock_after, unit_cost, total_cost, reference_type, reference_id, movement_date, notes, sync_status)
VALUES
  ('mov-001', 'mat-001', 'mat-001', 'رول ورق كرافت بني 150 جم', 'kg', 'IN', 'purchase_order', 1, 1000.00, 1500.00, 2500.00, 28.50, 28500.00, 'purchase_order', 'po-001', CURRENT_DATE - INTERVAL '7 days', 'توريد فاتورة شراء #PO-001', 'SYNCED')
ON CONFLICT (id) DO NOTHING;
